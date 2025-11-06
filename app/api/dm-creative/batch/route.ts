import { NextRequest, NextResponse } from "next/server";
import { generateQRCode } from "@/lib/qr-generator";
import { createCampaign, createCampaignRecipient } from "@/lib/database/campaign-supabase-queries";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import { RecipientData } from "@/types/dm-creative";
import { analyzeStoreDistribution } from "@/lib/csv-processor";
import { successResponse, errorResponse } from "@/lib/utils/api-response";

// Import retail queries only when needed (optional feature)
let retailQueries: any = null;
function getRetailQueries() {
  if (!retailQueries) {
    try {
      retailQueries = require("@/lib/database/retail-queries");
    } catch (e) {
      // Retail module not available
      return null;
    }
  }
  return retailQueries;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        errorResponse("Authentication required", "UNAUTHORIZED"),
        { status: 401 }
      );
    }

    // 2. Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        errorResponse("Organization not found", "NO_ORGANIZATION"),
        { status: 404 }
      );
    }

    const body = await request.json();
    const { recipients, message, companyContext, campaignName } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        errorResponse("No recipients provided", "MISSING_RECIPIENTS"),
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        errorResponse("Message is required", "MISSING_MESSAGE"),
        { status: 400 }
      );
    }

    // 3. Create campaign with organization context
    const companyName = companyContext?.companyName || "Unknown Company";
    const finalCampaignName = campaignName || `Batch DM Campaign - ${new Date().toLocaleDateString()}`;

    const campaign = await createCampaign({
      organizationId: userProfile.organization_id,
      userId: user.id,
      name: finalCampaignName,
      description: message,
      designSnapshot: {}, // TODO: Add actual design snapshot when template editor is ready
      variableMappingsSnapshot: {},
      totalRecipients: recipients.length,
      status: 'draft',
    });

    console.log(`Batch campaign created: ${campaign.id} - ${campaign.name}`);

    // 4. Create a recipient list for this batch campaign
    const serviceSupabase = createServiceClient();
    const { data: recipientList, error: listError } = await serviceSupabase
      .from('recipient_lists')
      .insert({
        organization_id: userProfile.organization_id,
        created_by: user.id,
        name: `${finalCampaignName} - Recipients`,
        description: `Auto-generated recipient list for batch campaign`,
        source: 'manual_upload',
        total_recipients: recipients.length,
      })
      .select()
      .single();

    if (listError || !recipientList) {
      console.error('Failed to create recipient list:', listError);
      return NextResponse.json(
        errorResponse("Failed to create recipient list", "LIST_CREATE_ERROR"),
        { status: 500 }
      );
    }

    console.log(`Recipient list created: ${recipientList.id}`);

    // PHASE 8C: Analyze for store deployment (optional feature)
    const storeDistribution = analyzeStoreDistribution(recipients);
    const hasStoreDeployment = storeDistribution.hasStoreNumbers;

    // If store deployment detected, create deployments for each store
    let deployments: any[] = [];
    const storeDeploymentMap = new Map<string, string>(); // storeNumber -> deploymentId

    if (hasStoreDeployment) {
      const retail = getRetailQueries();

      if (retail) {
        console.log(`Store deployment detected: ${storeDistribution.uniqueStores.length} stores`);

        // Create deployment for each unique store
        for (const storeData of storeDistribution.storeDistribution) {
          try {
            // Get store by store number
            const store = retail.getRetailStoreByNumber(storeData.storeNumber);

            if (store) {
              // Create deployment for this store
              const deployment = retail.createCampaignDeployment({
                campaignId: campaign.id,
                storeId: store.id,
              });

              storeDeploymentMap.set(storeData.storeNumber, deployment.id);

              deployments.push({
                deploymentId: deployment.id,
                storeNumber: storeData.storeNumber,
                storeName: store.name,
                recipientCount: storeData.count,
              });

              console.log(`Created deployment for Store #${storeData.storeNumber}: ${deployment.id}`);
            } else {
              console.warn(`Store #${storeData.storeNumber} not found in database - skipping deployment`);
            }
          } catch (error) {
            console.error(`Error creating deployment for store ${storeData.storeNumber}:`, error);
          }
        }
      } else {
        console.log("Store numbers detected but retail module not enabled - proceeding without deployments");
      }
    }

    // 5. Create recipients and campaign recipients with QR codes
    const dmDataList = [];

    for (const recipient of recipients) {
      // 5a. First create recipient in recipients table
      const { data: dbRecipient, error: recipientError } = await serviceSupabase
        .from('recipients')
        .insert({
          recipient_list_id: recipientList.id,
          organization_id: userProfile.organization_id,
          created_by: user.id,
          first_name: recipient.name || '',
          last_name: recipient.lastname || '',
          email: recipient.email || null,
          phone: recipient.phone || null,
          address_line1: recipient.address || '',
          city: recipient.city || '',
          state: '', // TODO: Add state to CSV if needed
          zip_code: recipient.zip || '',
          country: 'US',
        })
        .select()
        .single();

      if (recipientError || !dbRecipient) {
        console.error('Failed to create recipient:', recipientError);
        continue; // Skip this recipient but continue with others
      }

      // 5b. Generate unique tracking code
      const trackingCode = `${campaign.id}-${Math.random().toString(36).substr(2, 9)}`;

      // 5c. Create campaign recipient (links recipient to campaign)
      const finalMessage = (recipient as RecipientData & { customMessage?: string }).customMessage || message;
      const campaignRecipient = await createCampaignRecipient({
        campaignId: campaign.id,
        recipientId: dbRecipient.id,
        personalizedCanvasJson: {
          recipient: {
            name: recipient.name,
            lastname: recipient.lastname,
            address: recipient.address,
            city: recipient.city,
            zip: recipient.zip,
            email: recipient.email,
            phone: recipient.phone,
          },
          message: finalMessage,
        },
        trackingCode,
      });

      const trackingId = trackingCode;

      // 5d. PHASE 8C: Link recipient to store deployment if applicable
      if (hasStoreDeployment && recipient.storeNumber) {
        const deploymentId = storeDeploymentMap.get(recipient.storeNumber);

        if (deploymentId) {
          const retail = getRetailQueries();
          if (retail) {
            try {
              retail.linkRecipientToDeployment(deploymentId, dbRecipient.id);
              console.log(`Linked recipient ${dbRecipient.id} to deployment ${deploymentId}`);
            } catch (error) {
              console.error(`Error linking recipient to deployment:`, error);
            }
          }
        }
      }

      // 5e. Generate landing page URL and QR code
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const landingPageUrl = `${baseUrl}/lp/${trackingId}`;
      const qrCodeDataUrl = await generateQRCode(landingPageUrl);

      // 5f. Add to results list
      dmDataList.push({
        trackingId,
        recipient: {
          ...recipient,
          id: dbRecipient.id, // Include database ID for batch processing
        },
        message: finalMessage,
        qrCodeDataUrl,
        landingPageUrl,
        createdAt: new Date(),
      });
    }

    console.log(`Created ${dmDataList.length} recipients in batch`);

    // PHASE 8C: Update deployment recipient counts
    if (hasStoreDeployment && deployments.length > 0) {
      const retail = getRetailQueries();
      if (retail) {
        for (const deployment of deployments) {
          try {
            retail.updateDeploymentRecipientCount(deployment.deploymentId, deployment.recipientCount);
            console.log(`Updated count for deployment ${deployment.deploymentId}: ${deployment.recipientCount} recipients`);
          } catch (error) {
            console.error(`Error updating deployment count:`, error);
          }
        }
      }
    }

    // Return response with deployment info if applicable
    return NextResponse.json(
      successResponse(
        {
          dmData: dmDataList,
          campaignId: campaign.id,
          campaignName: campaign.name,
          count: dmDataList.length,
          // PHASE 8C: Include store deployment info
          storeDeployment: hasStoreDeployment ? {
            enabled: true,
            totalStores: storeDistribution.uniqueStores.length,
            deployments: deployments,
            recipientsWithStores: storeDistribution.recipientsWithStores,
            recipientsWithoutStores: storeDistribution.recipientsWithoutStores,
          } : {
            enabled: false,
          },
        },
        `Batch generated successfully: ${dmDataList.length} direct mails created`
      )
    );
  } catch (error: unknown) {
    console.error("Error generating batch direct mails:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      errorResponse(
        `Failed to generate batch: ${errorMessage}`,
        "BATCH_GENERATION_ERROR"
      ),
      { status: 500 }
    );
  }
}
