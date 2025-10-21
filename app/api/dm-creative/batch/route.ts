import { NextRequest, NextResponse } from "next/server";
import { generateQRCode } from "@/lib/qr-generator";
import { createCampaign, createRecipient } from "@/lib/database/tracking-queries";
import { RecipientData } from "@/types/dm-creative";
import { analyzeStoreDistribution } from "@/lib/csv-processor";

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
    const body = await request.json();
    const { recipients, message, companyContext, campaignName } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No recipients provided" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Create campaign
    const companyName = companyContext?.companyName || "Unknown Company";
    const finalCampaignName = campaignName || `Batch DM Campaign - ${new Date().toLocaleDateString()}`;

    const campaign = createCampaign({
      name: finalCampaignName,
      message: message,
      companyName: companyName,
    });

    console.log(`Batch campaign created: ${campaign.id} - ${campaign.name}`);

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

    // Create recipients and generate QR codes
    const dmDataList = [];

    for (const recipient of recipients) {
      // Create recipient in database
      const dbRecipient = createRecipient({
        campaignId: campaign.id,
        name: recipient.name,
        lastname: recipient.lastname,
        address: recipient.address || undefined,
        city: recipient.city || undefined,
        zip: recipient.zip || undefined,
        email: recipient.email || undefined,
        phone: recipient.phone || undefined,
      });

      const trackingId = dbRecipient.tracking_id;

      // PHASE 8C: Link recipient to store deployment if applicable
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

      // Generate landing page URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const landingPageUrl = `${baseUrl}/lp/${trackingId}`;

      // Generate QR code
      const qrCodeDataUrl = await generateQRCode(landingPageUrl);

      // Use custom message if provided, otherwise use default
      const finalMessage = (recipient as RecipientData & { customMessage?: string }).customMessage || message;

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
    return NextResponse.json({
      success: true,
      data: dmDataList,
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
    });
  } catch (error: unknown) {
    console.error("Error generating batch direct mails:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate batch: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
