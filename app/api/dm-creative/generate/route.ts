import { NextRequest, NextResponse } from "next/server";
import { generateQRCode } from "@/lib/qr-generator";
import { generateDMCreativeImage } from "@/lib/ai/openai";
import { createCampaign, createRecipient } from "@/lib/database/tracking-queries";
import { saveAsset } from "@/lib/database/asset-management";
// Note: Image composition moved to client-side to avoid native module issues
import {
  DMGenerateRequest,
  DMGenerateResponse,
  DirectMailData,
} from "@/types/dm-creative";

// Dynamic import of retail queries (optional feature)
function getRetailQueries() {
  try {
    return require("@/lib/database/retail-queries");
  } catch (e) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipient, message, companyContext, apiKey, campaignName } = body;

    if (!recipient || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key is required" },
        { status: 400 }
      );
    }

    // Create or get campaign
    const companyName = companyContext?.companyName || "Unknown Company";
    const finalCampaignName = campaignName || `DM Campaign - ${new Date().toLocaleDateString()}`;

    const campaign = createCampaign({
      name: finalCampaignName,
      message: message,
      companyName: companyName,
    });

    console.log(`Campaign created: ${campaign.id} - ${campaign.name}`);

    // Create recipient in database (this also generates the tracking ID)
    const dbRecipient = createRecipient({
      campaignId: campaign.id,
      name: recipient.name,
      lastname: recipient.lastname,
      address: recipient.address,
      city: recipient.city,
      zip: recipient.zip,
      email: recipient.email,
      phone: recipient.phone,
    });

    const trackingId = dbRecipient.tracking_id;
    console.log(`Recipient created with tracking ID: ${trackingId}`);

    // Handle retail store deployment if storeNumber is provided
    if (recipient.storeNumber) {
      const retail = getRetailQueries();

      if (retail) {
        try {
          // Look up store by store number
          const store = retail.getRetailStoreByNumber(recipient.storeNumber);

          if (store) {
            console.log(`Store found: ${store.store_number} - ${store.name}`);

            // Check if deployment already exists for this campaign+store combo
            const existingDeployments = retail.getCampaignDeployments(campaign.id);
            let deployment = existingDeployments.find((d: any) => d.store_id === store.id);

            if (!deployment) {
              // Create new deployment
              const deploymentResult = retail.createCampaignDeployment({
                campaignId: campaign.id,
                storeId: store.id,
              });
              console.log(`Created deployment: ${deploymentResult.id} for campaign ${campaign.id} at store ${store.store_number}`);
              deployment = { id: deploymentResult.id, recipients_count: 0 };
            } else {
              console.log(`Using existing deployment: ${deployment.id}`);
            }

            // Link recipient to deployment
            retail.linkRecipientToDeployment(deployment.id, dbRecipient.id);
            console.log(`Linked recipient ${dbRecipient.id} to deployment ${deployment.id}`);

            // Update recipient count
            const newCount = (deployment.recipients_count || 0) + 1;
            retail.updateDeploymentRecipientCount(deployment.id, newCount);
            console.log(`Updated deployment ${deployment.id} recipient count to ${newCount}`);
          } else {
            console.warn(`Store not found for storeNumber: ${recipient.storeNumber}`);
          }
        } catch (error) {
          console.error("Error creating retail deployment:", error);
          // Don't fail the whole request, just log the error
        }
      }
    }

    // Generate landing page URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const landingPageUrl = `${baseUrl}/lp/${trackingId}`;

    // Generate QR code
    const qrCodeDataUrl = await generateQRCode(landingPageUrl);

    console.log("Generating AI creative image with DALL-E...");

    // Generate AI background image with DALL-E
    const backgroundImage = await generateDMCreativeImage(
      message,
      companyContext,
      apiKey
    );

    console.log("AI background image generated successfully");
    console.log("Note: Final composition will be done client-side");

    // Save assets to database for template previews and campaign details
    try {
      // Save background image as asset
      const backgroundBuffer = Buffer.from(backgroundImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      saveAsset({
        assetType: 'background_image',
        assetName: `${finalCampaignName} - Background`,
        fileData: backgroundBuffer,
        campaignId: campaign.id,
        mimeType: 'image/png',
        metadata: {
          generatedBy: 'dall-e',
          prompt: message,
          recipientName: `${recipient.name} ${recipient.lastname}`,
        },
      });
      console.log("Background image saved as asset");

      // Save QR code as asset
      const qrBuffer = Buffer.from(qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      saveAsset({
        assetType: 'qr_code',
        assetName: `${finalCampaignName} - QR Code`,
        fileData: qrBuffer,
        campaignId: campaign.id,
        mimeType: 'image/png',
        metadata: {
          generatedBy: 'qr-generator',
          qrData: landingPageUrl,
          trackingId: trackingId,
        },
      });
      console.log("QR code saved as asset");
    } catch (error) {
      console.error("Error saving assets:", error);
      // Don't fail the request, just log the error
    }

    // Create direct mail data
    // Note: creativeImageUrl will be composed on client-side to avoid canvas native module issues
    const dmData: DirectMailData = {
      trackingId,
      recipient,
      message,
      qrCodeDataUrl,
      landingPageUrl,
      createdAt: new Date(),
      creativeImageUrl: backgroundImage, // Pass background, client will compose
    };

    const response: DMGenerateResponse = {
      success: true,
      data: dmData,
      campaignId: campaign.id, // Include campaign ID for reference
      campaignName: campaign.name,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("Error generating direct mail:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate direct mail: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
