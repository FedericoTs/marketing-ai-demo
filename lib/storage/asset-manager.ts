/**
 * Asset Manager Utilities
 * Client-side utilities for asset upload, optimization, and management
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface UploadAssetOptions {
  organizationId: string;
  assetType?: 'logo' | 'image' | 'icon' | 'background' | 'font';
  isBrandAsset?: boolean;
  onProgress?: (progress: number) => void;
}

export interface AssetValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp',
  'image/gif'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file before upload
 */
export function validateAssetFile(file: File): AssetValidationResult {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Allowed types: PNG, JPEG, SVG, WebP, GIF`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size ${sizeMB}MB exceeds maximum of 10MB`
    };
  }

  // Check if file exists
  if (!file.size || file.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    };
  }

  return { valid: true };
}

// ============================================================================
// IMAGE OPTIMIZATION
// ============================================================================

/**
 * Optimize image (resize and compress)
 * Returns optimized File object
 */
export async function optimizeImage(
  file: File,
  options: OptimizeImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.85,
    format = 'image/jpeg'
  } = options;

  // Skip optimization for SVG
  if (file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;

          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to optimize image'));
              return;
            }

            // Create new File from blob
            const optimizedFile = new File(
              [blob],
              file.name,
              { type: format }
            );

            resolve(optimizedFile);
          },
          format,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

// ============================================================================
// UPLOAD
// ============================================================================

/**
 * Upload asset to server
 */
export async function uploadAsset(
  file: File,
  options: UploadAssetOptions
): Promise<any> {
  const { organizationId, assetType = 'image', isBrandAsset = false, onProgress } = options;

  // Validate file
  const validation = validateAssetFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Optimize image (except SVG)
  let fileToUpload = file;
  if (file.type !== 'image/svg+xml') {
    try {
      onProgress?.(10); // 10% - starting optimization
      fileToUpload = await optimizeImage(file);
      onProgress?.(30); // 30% - optimization complete
    } catch (error) {
      console.warn('Image optimization failed, uploading original:', error);
      // Continue with original file if optimization fails
    }
  }

  // Create form data
  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('organizationId', organizationId);
  formData.append('assetType', assetType);
  formData.append('isBrandAsset', isBrandAsset.toString());

  // Upload to API
  onProgress?.(40); // 40% - starting upload

  const response = await fetch('/api/assets', {
    method: 'POST',
    body: formData
  });

  onProgress?.(90); // 90% - upload complete

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Upload failed');
  }

  const result = await response.json();
  onProgress?.(100); // 100% - complete

  return result;
}

// ============================================================================
// FETCH ASSETS
// ============================================================================

/**
 * Fetch assets for organization
 */
export async function fetchAssets(
  organizationId: string,
  assetType?: string
): Promise<any[]> {
  const params = new URLSearchParams({ organizationId });
  if (assetType) {
    params.append('assetType', assetType);
  }

  const response = await fetch(`/api/assets?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch assets');
  }

  const result = await response.json();
  return result.assets || [];
}

// ============================================================================
// DELETE ASSET
// ============================================================================

/**
 * Delete asset by ID
 */
export async function deleteAsset(assetId: string): Promise<void> {
  const response = await fetch(`/api/assets/${assetId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete asset');
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Create thumbnail data URL from file
 */
export async function createThumbnail(file: File, maxSize: number = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const aspectRatio = img.width / img.height;

        let width = maxSize;
        let height = maxSize;

        if (aspectRatio > 1) {
          height = maxSize / aspectRatio;
        } else {
          width = maxSize * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL());
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
