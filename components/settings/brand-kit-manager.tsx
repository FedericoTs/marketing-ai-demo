'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, Save, Eye, Loader2, Palette, Type, Layout, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BrandKitManagerProps {
  companyName: string;
}

// Google Fonts selection (curated list)
const FONTS = [
  'Inter',
  'Open Sans',
  'Roboto',
  'Poppins',
  'Montserrat',
  'Lato',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
];

// Landing page templates
const TEMPLATES = [
  { value: 'professional', label: 'Professional', description: 'Clean, business-focused layout' },
  { value: 'healthcare', label: 'Healthcare', description: 'Medical and care-focused design' },
  { value: 'retail', label: 'Retail', description: 'E-commerce and product-focused' },
  { value: 'modern', label: 'Modern', description: 'Contemporary tech aesthetic' },
  { value: 'classic', label: 'Classic', description: 'Traditional corporate style' },
];

export function BrandKitManager({ companyName }: BrandKitManagerProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    logoUrl: '',
    primaryColor: '#1E3A8A',
    secondaryColor: '#FF6B35',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    headingFont: 'Inter',
    bodyFont: 'Open Sans',
    landingPageTemplate: 'professional',
  });

  // Load existing brand config
  useEffect(() => {
    const loadBrandConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/brand/config?companyName=${encodeURIComponent(companyName)}`);
        const result = await response.json();

        if (result.success && result.data) {
          setFormData({
            logoUrl: result.data.logo_url || '',
            primaryColor: result.data.primary_color || '#1E3A8A',
            secondaryColor: result.data.secondary_color || '#FF6B35',
            accentColor: result.data.accent_color || '#10B981',
            backgroundColor: result.data.background_color || '#FFFFFF',
            textColor: result.data.text_color || '#1F2937',
            headingFont: result.data.heading_font || 'Inter',
            bodyFont: result.data.body_font || 'Open Sans',
            landingPageTemplate: result.data.landing_page_template || 'professional',
          });

          if (result.data.logo_url) {
            setLogoPreview(result.data.logo_url);
          }
        }
      } catch (error) {
        console.error('Error loading brand config:', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyName) {
      loadBrandConfig();
    }
  }, [companyName]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PNG, JPG, SVG, or WebP');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size too large. Maximum 5MB allowed');
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = formData.logoUrl;
      let logoAssetId = '';

      // Upload logo if new file selected
      if (logoFile) {
        const formDataObj = new FormData();
        formDataObj.append('logo', logoFile);
        formDataObj.append('companyName', companyName);

        const uploadResponse = await fetch('/api/brand/upload-logo', {
          method: 'POST',
          body: formDataObj,
        });

        const uploadResult = await uploadResponse.json();

        if (uploadResult.success) {
          logoUrl = uploadResult.data.logoUrl;
          logoAssetId = uploadResult.data.assetId;
          toast.success('Logo uploaded successfully');
        } else {
          toast.error(uploadResult.error || 'Failed to upload logo');
          setSaving(false);
          return;
        }
      }

      // Save brand config
      const response = await fetch('/api/brand/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          logoUrl,
          logoAssetId,
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          accentColor: formData.accentColor,
          backgroundColor: formData.backgroundColor,
          textColor: formData.textColor,
          headingFont: formData.headingFont,
          bodyFont: formData.bodyFont,
          landingPageTemplate: formData.landingPageTemplate,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Brand kit saved successfully!');
        setLogoFile(null); // Clear file after upload
      } else {
        toast.error(result.error || 'Failed to save brand kit');
      }
    } catch (error) {
      console.error('Error saving brand kit:', error);
      toast.error('Failed to save brand kit');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading brand configuration...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Company Logo
          </CardTitle>
          <CardDescription>
            Upload your company logo. Recommended size: 200x200px. Max 5MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            {/* Logo Preview */}
            <div className="flex-shrink-0">
              {logoPreview ? (
                <div className="w-32 h-32 border-2 border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center p-2">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-slate-400" />
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-slate-500 mt-2">
                Supports PNG, JPG, SVG, WebP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
          <CardDescription>
            Define your brand color palette. These colors will be used across all marketing materials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#1E3A8A"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#FF6B35"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="accentColor"
                  value={formData.accentColor}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  placeholder="#10B981"
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-700 mb-3">Preview:</p>
            <div className="flex gap-3">
              <div
                className="flex-1 h-20 rounded-lg border border-slate-200 shadow-sm"
                style={{ backgroundColor: formData.primaryColor }}
              >
                <div className="h-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">Primary</span>
                </div>
              </div>
              <div
                className="flex-1 h-20 rounded-lg border border-slate-200 shadow-sm"
                style={{ backgroundColor: formData.secondaryColor }}
              >
                <div className="h-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">Secondary</span>
                </div>
              </div>
              <div
                className="flex-1 h-20 rounded-lg border border-slate-200 shadow-sm"
                style={{ backgroundColor: formData.accentColor }}
              >
                <div className="h-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">Accent</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
          <CardDescription>
            Select fonts for headings and body text from Google Fonts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Heading Font */}
            <div className="space-y-2">
              <Label htmlFor="headingFont">Heading Font</Label>
              <Select
                value={formData.headingFont}
                onValueChange={(value) => setFormData({ ...formData, headingFont: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((font) => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-2xl font-bold mt-2" style={{ fontFamily: formData.headingFont }}>
                The Quick Brown Fox
              </p>
            </div>

            {/* Body Font */}
            <div className="space-y-2">
              <Label htmlFor="bodyFont">Body Font</Label>
              <Select
                value={formData.bodyFont}
                onValueChange={(value) => setFormData({ ...formData, bodyFont: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((font) => (
                    <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-base mt-2" style={{ fontFamily: formData.bodyFont }}>
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landing Page Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Landing Page Template
          </CardTitle>
          <CardDescription>
            Choose the default template style for your landing pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map((template) => (
              <button
                key={template.value}
                onClick={() => setFormData({ ...formData, landingPageTemplate: template.value })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  formData.landingPageTemplate === template.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-slate-900">{template.label}</h4>
                  {formData.landingPageTemplate === template.value && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-slate-600">{template.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Brand Kit
            </>
          )}
        </Button>

        <Button variant="outline" size="lg" className="gap-2" disabled>
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </div>
    </div>
  );
}
