import { nanoid } from "nanoid";
// TODO: Asset management tables need to be created in Supabase
// This file is stubbed to allow the build to pass
// import { createServiceClient } from "@/lib/supabase/server";

// ==================== TYPES ====================

export interface CampaignAsset {
  id: string;
  campaign_id: string | null;
  template_id: string | null;
  asset_type: 'background_image' | 'qr_code' | 'logo' | 'custom_image' | 'pdf';
  asset_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  metadata: string | null; // JSON string
  created_at: string;
}

export interface AssetMetadata {
  originalFilename?: string;
  width?: number;
  height?: number;
  generatedBy?: 'dall-e' | 'user-upload' | 'qr-generator';
  prompt?: string; // For AI-generated images
  qrData?: string; // For QR codes
  [key: string]: any;
}

// ==================== STUBBED FUNCTIONS ====================
// TODO: Implement Supabase Storage integration when campaign_assets table exists

/**
 * Save asset to database and filesystem
 * STUBBED: Returns mock asset object without actually saving
 */
export function saveAsset(params: {
  assetType: CampaignAsset['asset_type'];
  assetName: string;
  fileData: Buffer | string;
  campaignId?: string;
  templateId?: string;
  mimeType?: string;
  metadata?: AssetMetadata;
}): CampaignAsset {
  console.log('[asset-management] saveAsset stubbed - asset management tables not yet in Supabase');

  const id = nanoid(16);
  const created_at = new Date().toISOString();

  return {
    id,
    campaign_id: params.campaignId || null,
    template_id: params.templateId || null,
    asset_type: params.assetType,
    asset_name: params.assetName,
    file_path: `campaign-assets/stub/${id}`,
    file_size: typeof params.fileData === 'string' ? params.fileData.length : params.fileData.length,
    mime_type: params.mimeType || null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    created_at,
  };
}

/**
 * Get assets for a campaign
 * STUBBED: Returns empty array
 */
export function getCampaignAssets(campaignId: string): CampaignAsset[] {
  console.log(`[asset-management] getCampaignAssets(${campaignId}) stubbed - returns empty array`);
  return [];
}

/**
 * Get assets for a template
 * STUBBED: Returns empty array
 */
export function getTemplateAssets(templateId: string): CampaignAsset[] {
  console.log(`[asset-management] getTemplateAssets(${templateId}) stubbed - returns empty array`);
  return [];
}

/**
 * Get specific asset by ID
 * STUBBED: Returns null
 */
export function getAssetById(id: string): CampaignAsset | null {
  console.log(`[asset-management] getAssetById(${id}) stubbed - returns null`);
  return null;
}

/**
 * Get asset file content
 * STUBBED: Returns null
 */
export function getAssetFileContent(id: string): Buffer | null {
  console.log(`[asset-management] getAssetFileContent(${id}) stubbed - returns null`);
  return null;
}

/**
 * Get asset public URL
 * STUBBED: Returns null
 */
export function getAssetPublicUrl(id: string): string | null {
  console.log(`[asset-management] getAssetPublicUrl(${id}) stubbed - returns null`);
  return null;
}

/**
 * Delete asset from database and filesystem
 * STUBBED: Returns false
 */
export function deleteAsset(id: string): boolean {
  console.log(`[asset-management] deleteAsset(${id}) stubbed - no-op`);
  return false;
}

/**
 * Copy assets when duplicating campaign or template
 * STUBBED: Returns empty array
 */
export function copyAssets(params: {
  sourceCampaignId?: string;
  sourceTemplateId?: string;
  targetCampaignId?: string;
  targetTemplateId?: string;
}): CampaignAsset[] {
  console.log('[asset-management] copyAssets stubbed - returns empty array');
  return [];
}

/**
 * Get total storage used by campaign assets
 * STUBBED: Returns zero stats
 */
export function getStorageStats(): {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
} {
  console.log('[asset-management] getStorageStats stubbed - returns zeros');
  return {
    totalFiles: 0,
    totalSize: 0,
    byType: {},
  };
}

/**
 * Clean up orphaned assets (no campaign or template reference)
 * STUBBED: Returns 0
 */
export function cleanupOrphanedAssets(): number {
  console.log('[asset-management] cleanupOrphanedAssets stubbed - no-op');
  return 0;
}
