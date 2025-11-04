'use client';

/**
 * Asset Library Panel
 * Displays uploaded assets with drag-and-drop support
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Search, X, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  uploadAsset,
  fetchAssets,
  deleteAsset,
  formatFileSize,
  validateAssetFile
} from '@/lib/storage/asset-manager';

// ============================================================================
// TYPES
// ============================================================================

interface AssetLibraryPanelProps {
  organizationId: string;
  onAssetSelect?: (asset: any) => void;
  onAssetDragStart?: (asset: any, event: React.DragEvent) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AssetLibraryPanel({
  organizationId,
  onAssetSelect,
  onAssetDragStart
}: AssetLibraryPanelProps) {
  const [assets, setAssets] = useState<any[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // LOAD ASSETS
  // ============================================================================

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedAssets = await fetchAssets(
        organizationId,
        assetTypeFilter === 'all' ? undefined : assetTypeFilter
      );
      setAssets(fetchedAssets);
      setFilteredAssets(fetchedAssets);
    } catch (error) {
      console.error('Failed to load assets:', error);
      toast.error('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, [organizationId, assetTypeFilter]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // ============================================================================
  // SEARCH & FILTER
  // ============================================================================

  useEffect(() => {
    let filtered = assets;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset =>
        asset.file_name?.toLowerCase().includes(query) ||
        asset.asset_type?.toLowerCase().includes(query)
      );
    }

    setFilteredAssets(filtered);
  }, [searchQuery, assets]);

  // ============================================================================
  // UPLOAD HANDLERS
  // ============================================================================

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Handle one file at a time for simplicity

    // Validate file
    const validation = validateAssetFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      await uploadAsset(file, {
        organizationId,
        assetType: 'image',
        isBrandAsset: false,
        onProgress: setUploadProgress
      });

      toast.success(`${file.name} uploaded successfully`);
      await loadAssets(); // Reload assets
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // ============================================================================
  // DELETE HANDLER
  // ============================================================================

  const handleDelete = async (assetId: string, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      await deleteAsset(assetId);
      toast.success('Asset deleted');
      await loadAssets();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete asset');
    }
  };

  // ============================================================================
  // ASSET DRAG START
  // ============================================================================

  const handleAssetDragStart = (asset: any, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    onAssetDragStart?.(asset, e);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold mb-3">Asset Library</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter */}
        <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            <SelectItem value="logo">Logos</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="icon">Icons</SelectItem>
            <SelectItem value="background">Backgrounds</SelectItem>
          </SelectContent>
        </Select>

        {/* Upload Button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full mt-3"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload Asset
            </>
          )}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex-1 overflow-y-auto p-4 ${
          isDragging ? 'bg-blue-50 border-2 border-dashed border-blue-400' : ''
        }`}
      >
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <ImageIcon className="h-12 w-12 mb-3" />
            <p className="text-sm">
              {searchQuery ? 'No assets found' : 'No assets uploaded yet'}
            </p>
            <p className="text-xs mt-1">
              Drag and drop or click Upload
            </p>
          </div>
        )}

        {/* Assets Grid */}
        {!loading && filteredAssets.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => handleAssetDragStart(asset, e)}
                onClick={() => onAssetSelect?.(asset)}
                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 cursor-pointer transition-all"
              >
                {/* Image */}
                <img
                  src={asset.signedUrl || asset.storage_url}
                  alt={asset.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                  <p className="text-white text-xs text-center px-2 mb-2 truncate w-full">
                    {asset.file_name}
                  </p>
                  <p className="text-white/70 text-xs">
                    {formatFileSize(asset.file_size_bytes)}
                  </p>

                  {/* Delete Button */}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(asset.id, asset.file_name);
                    }}
                    className="mt-2"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Asset Type Badge */}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {asset.asset_type}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/90 pointer-events-none">
            <div className="text-center">
              <Upload className="h-12 w-12 text-blue-500 mx-auto mb-2" />
              <p className="text-blue-700 font-medium">Drop image here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
