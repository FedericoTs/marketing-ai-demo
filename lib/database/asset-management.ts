import { nanoid } from "nanoid";
import { getDatabase } from "./connection";
import fs from "fs";
import path from "path";

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

// ==================== CONFIGURATION ====================

const ASSETS_BASE_PATH = path.join(process.cwd(), 'public', 'campaign-assets');

// Ensure base directory exists
function ensureAssetsDirectory() {
  if (!fs.existsSync(ASSETS_BASE_PATH)) {
    fs.mkdirSync(ASSETS_BASE_PATH, { recursive: true });
  }

  // Create subdirectories for each asset type
  const subdirs = ['backgrounds', 'qr-codes', 'logos', 'images', 'pdfs'];
  subdirs.forEach((subdir) => {
    const dirPath = path.join(ASSETS_BASE_PATH, subdir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
}

// ==================== ASSET STORAGE ====================

/**
 * Save asset to database and filesystem
 */
export function saveAsset(params: {
  assetType: CampaignAsset['asset_type'];
  assetName: string;
  fileData: Buffer | string; // Buffer for binary, string for base64
  campaignId?: string;
  templateId?: string;
  mimeType?: string;
  metadata?: AssetMetadata;
}): CampaignAsset {
  ensureAssetsDirectory();

  const db = getDatabase();
  const id = nanoid(16);
  const created_at = new Date().toISOString();

  // Determine file extension
  let ext = '.png';
  if (params.mimeType) {
    if (params.mimeType.includes('jpeg') || params.mimeType.includes('jpg')) ext = '.jpg';
    if (params.mimeType.includes('pdf')) ext = '.pdf';
    if (params.mimeType.includes('svg')) ext = '.svg';
  }

  // Determine subdirectory based on asset type
  let subdir = 'images';
  switch (params.assetType) {
    case 'background_image':
      subdir = 'backgrounds';
      break;
    case 'qr_code':
      subdir = 'qr-codes';
      break;
    case 'logo':
      subdir = 'logos';
      break;
    case 'pdf':
      subdir = 'pdfs';
      break;
  }

  // Generate unique filename
  const filename = `${id}${ext}`;
  const relativePath = path.join('campaign-assets', subdir, filename);
  const absolutePath = path.join(ASSETS_BASE_PATH, subdir, filename);

  // Convert base64 to buffer if needed
  let fileBuffer: Buffer;
  if (typeof params.fileData === 'string') {
    // Remove data URL prefix if present
    const base64Data = params.fileData.replace(/^data:image\/\w+;base64,/, '');
    fileBuffer = Buffer.from(base64Data, 'base64');
  } else {
    fileBuffer = params.fileData;
  }

  // Write file to disk
  fs.writeFileSync(absolutePath, fileBuffer);

  // Get file size
  const stats = fs.statSync(absolutePath);
  const fileSize = stats.size;

  // Save to database
  const stmt = db.prepare(`
    INSERT INTO campaign_assets (
      id, campaign_id, template_id, asset_type, asset_name,
      file_path, file_size, mime_type, metadata, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.campaignId || null,
    params.templateId || null,
    params.assetType,
    params.assetName,
    relativePath,
    fileSize,
    params.mimeType || null,
    params.metadata ? JSON.stringify(params.metadata) : null,
    created_at
  );

  return {
    id,
    campaign_id: params.campaignId || null,
    template_id: params.templateId || null,
    asset_type: params.assetType,
    asset_name: params.assetName,
    file_path: relativePath,
    file_size: fileSize,
    mime_type: params.mimeType || null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    created_at,
  };
}

/**
 * Get assets for a campaign
 */
export function getCampaignAssets(campaignId: string): CampaignAsset[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM campaign_assets WHERE campaign_id = ? ORDER BY created_at DESC');
  return stmt.all(campaignId) as CampaignAsset[];
}

/**
 * Get assets for a template
 */
export function getTemplateAssets(templateId: string): CampaignAsset[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM campaign_assets WHERE template_id = ? ORDER BY created_at DESC');
  return stmt.all(templateId) as CampaignAsset[];
}

/**
 * Get specific asset by ID
 */
export function getAssetById(id: string): CampaignAsset | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM campaign_assets WHERE id = ?');
  return (stmt.get(id) as CampaignAsset) || null;
}

/**
 * Get asset file content
 */
export function getAssetFileContent(id: string): Buffer | null {
  const asset = getAssetById(id);
  if (!asset) return null;

  const absolutePath = path.join(process.cwd(), 'public', asset.file_path);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Asset file not found: ${absolutePath}`);
    return null;
  }

  return fs.readFileSync(absolutePath);
}

/**
 * Get asset public URL
 */
export function getAssetPublicUrl(id: string): string | null {
  const asset = getAssetById(id);
  if (!asset) return null;

  // Return path relative to public directory
  return `/${asset.file_path}`;
}

/**
 * Delete asset from database and filesystem
 */
export function deleteAsset(id: string): boolean {
  const asset = getAssetById(id);
  if (!asset) return false;

  const db = getDatabase();

  // Delete file from filesystem
  const absolutePath = path.join(process.cwd(), 'public', asset.file_path);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }

  // Delete from database
  const stmt = db.prepare('DELETE FROM campaign_assets WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * Copy assets when duplicating campaign or template
 */
export function copyAssets(params: {
  sourceCampaignId?: string;
  sourceTemplateId?: string;
  targetCampaignId?: string;
  targetTemplateId?: string;
}): CampaignAsset[] {
  ensureAssetsDirectory();

  // Get source assets
  let sourceAssets: CampaignAsset[] = [];
  if (params.sourceCampaignId) {
    sourceAssets = getCampaignAssets(params.sourceCampaignId);
  } else if (params.sourceTemplateId) {
    sourceAssets = getTemplateAssets(params.sourceTemplateId);
  }

  if (sourceAssets.length === 0) return [];

  const copiedAssets: CampaignAsset[] = [];

  for (const sourceAsset of sourceAssets) {
    try {
      // Read original file
      const absolutePath = path.join(process.cwd(), 'public', sourceAsset.file_path);
      if (!fs.existsSync(absolutePath)) {
        console.warn(`Source asset file not found: ${absolutePath}`);
        continue;
      }

      const fileData = fs.readFileSync(absolutePath);

      // Save as new asset
      const newAsset = saveAsset({
        assetType: sourceAsset.asset_type,
        assetName: sourceAsset.asset_name,
        fileData,
        campaignId: params.targetCampaignId,
        templateId: params.targetTemplateId,
        mimeType: sourceAsset.mime_type || undefined,
        metadata: sourceAsset.metadata ? JSON.parse(sourceAsset.metadata) : undefined,
      });

      copiedAssets.push(newAsset);
    } catch (error) {
      console.error(`Error copying asset ${sourceAsset.id}:`, error);
    }
  }

  return copiedAssets;
}

/**
 * Get total storage used by campaign assets
 */
export function getStorageStats(): {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
} {
  const db = getDatabase();

  const totalStmt = db.prepare(`
    SELECT
      COUNT(*) as total_files,
      SUM(file_size) as total_size
    FROM campaign_assets
  `);

  const total = totalStmt.get() as { total_files: number; total_size: number | null };

  const byTypeStmt = db.prepare(`
    SELECT
      asset_type,
      COUNT(*) as count,
      SUM(file_size) as size
    FROM campaign_assets
    GROUP BY asset_type
  `);

  const byType = byTypeStmt.all() as Array<{ asset_type: string; count: number; size: number | null }>;

  const byTypeMap: Record<string, { count: number; size: number }> = {};
  byType.forEach((item) => {
    byTypeMap[item.asset_type] = {
      count: item.count,
      size: item.size || 0,
    };
  });

  return {
    totalFiles: total.total_files,
    totalSize: total.total_size || 0,
    byType: byTypeMap,
  };
}

/**
 * Clean up orphaned assets (no campaign or template reference)
 */
export function cleanupOrphanedAssets(): number {
  const db = getDatabase();

  // Find orphaned assets
  const stmt = db.prepare(`
    SELECT id FROM campaign_assets
    WHERE campaign_id IS NULL AND template_id IS NULL
  `);

  const orphanedAssets = stmt.all() as Array<{ id: string }>;

  let deletedCount = 0;
  for (const asset of orphanedAssets) {
    if (deleteAsset(asset.id)) {
      deletedCount++;
    }
  }

  return deletedCount;
}
