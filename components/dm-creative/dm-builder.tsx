"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Loader2, Mail, Sparkles, Settings2, Library, X, Check, Square, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { RecipientData, DirectMailData } from "@/types/dm-creative";
import { toast } from "sonner";
import { storeLandingPageData } from "@/lib/tracking";
import { useSettings } from "@/lib/contexts/settings-context";
import { composeDMImageBrowser, LayoutTemplate } from "@/lib/dm-image-compositor-browser";
import { ImageQuality, ImageSize, calculateImageCost } from "@/lib/ai/openai-v2";
import { TemplateSelector } from "@/components/dm-creative/template-selector";
import { cn } from "@/lib/utils";

/**
 * Compact Aspect Ratio Selector with Icon Boxes
 */
interface AspectRatioSelectorProps {
  selected: ImageSize;
  onSelect: (size: ImageSize) => void;
}

function AspectRatioSelector({ selected, onSelect }: AspectRatioSelectorProps) {
  const ratios: { value: ImageSize; icon: typeof Square; label: string; desc: string }[] = [
    { value: '1024x1024', icon: Square, label: 'Square', desc: '1:1' },
    { value: '1536x1024', icon: RectangleHorizontal, label: 'Landscape', desc: '3:2' },
    { value: '1024x1536', icon: RectangleVertical, label: 'Portrait', desc: '2:3' },
  ];

  return (
    <div className="space-y-2">
      <Label className="font-medium text-purple-900">Aspect Ratio</Label>
      <div className="grid grid-cols-3 gap-2">
        {ratios.map(({ value, icon: Icon, label, desc }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={cn(
                "relative p-3 rounded-lg border-2 transition-all text-center",
                "hover:border-purple-400 hover:bg-purple-50",
                isSelected
                  ? "border-purple-600 bg-purple-100"
                  : "border-purple-200 bg-white"
              )}
            >
              <Icon className={cn(
                "h-8 w-8 mx-auto mb-1",
                isSelected ? "text-purple-600" : "text-purple-400"
              )} />
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className="font-medium text-xs">{label}</div>
              <div className="text-[10px] text-slate-500">{desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DMBuilderProps {
  onGenerated?: (dmData: DirectMailData) => void;
}

export function DMBuilder({ onGenerated }: DMBuilderProps) {
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [campaignInfo, setCampaignInfo] = useState<{id: string; name: string} | null>(null);
  const [usingAICopy, setUsingAICopy] = useState(false);
  const [aiCopyInfo, setAiCopyInfo] = useState<{ platform: string; audience: string } | null>(null);

  // Template loading state
  const [loadedTemplate, setLoadedTemplate] = useState<{
    templateId: string;
    templateName: string;
    hasDesign: boolean;
    dmTemplateId?: string;
    targetAudience?: string;
  } | null>(null);

  // V2 Image Generation Settings (Smart Defaults)
  const [imageQuality, setImageQuality] = useState<ImageQuality>('low'); // Default: LOW quality (cost-optimized)
  const [imageAspectRatio, setImageAspectRatio] = useState<ImageSize>('1536x1024'); // Default: Landscape (best for DM)
  const [layoutTemplate, setLayoutTemplate] = useState<LayoutTemplate>('classic'); // Default: Classic layout

  // Canvas Editor State (stores data temporarily before navigation)
  const [acceptedBackground, setAcceptedBackground] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [landingPageUrl, setLandingPageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    address: "",
    city: "",
    zip: "",
    message: "",
    campaignName: "",
    phoneNumber: "",
    sceneDescription: "Happy and active social life scene with 1-2 people smiling and engaging in conversation, natural warm lighting, intimate cozy setting, friendly atmosphere, NOT crowded, authentic lifestyle photography",
  });

  // Console logging for testing (Phase 1)
  useEffect(() => {
    console.log('🎨 DM Builder mounted with V2 support');
    console.log('📸 Image Settings:', { quality: imageQuality, aspectRatio: imageAspectRatio });
    console.log('💰 Estimated cost per image:', `$${calculateImageCost(imageQuality, imageAspectRatio).toFixed(3)}`);
  }, []);

  // Check for editor result on mount (when returning from editor page)
  useEffect(() => {
    const editorResult = sessionStorage.getItem("dm-editor-result");
    if (editorResult) {
      console.log('✅ Editor result found - processing final DM');

      // Clear the result from sessionStorage
      sessionStorage.removeItem("dm-editor-result");
      sessionStorage.removeItem("dm-editor-data");

      // Process the result
      handleEditorResult(editorResult);
    }
  }, []);

  /**
   * Handle result from canvas editor page
   */
  const handleEditorResult = async (finalImage: string) => {
    console.log('🎨 Processing editor result');
    setIsLoading(true);

    try {
      const recipient: RecipientData = {
        name: formData.name,
        lastname: formData.lastname,
        address: formData.address,
        city: formData.city,
        zip: formData.zip,
      };

      if (!trackingId || !qrCodeDataUrl || !landingPageUrl) {
        toast.error("Missing tracking data - please regenerate");
        setIsLoading(false);
        return;
      }

      // Store landing page data
      storeLandingPageData({
        trackingId: trackingId,
        recipient,
        message: formData.message,
        companyName: settings.companyName,
        createdAt: new Date().toISOString(),
        visits: 0,
      });

      // Generate final DM data
      const dmData: DirectMailData = {
        trackingId: trackingId,
        creativeImageUrl: finalImage,
        qrCodeDataUrl: qrCodeDataUrl,
        landingPageUrl: landingPageUrl,
        message: formData.message,
        recipient,
        createdAt: new Date().toISOString(),
        companyName: settings.companyName,
      };

      onGenerated?.(dmData);
      toast.success("✨ Premium DM created successfully!");

      // Reset states
      setAcceptedBackground(null);
      setQrCodeDataUrl(null);
      setTrackingId(null);
      setLandingPageUrl(null);
    } catch (error) {
      console.error("Error processing editor result:", error);
      toast.error("Failed to process editor result");
    } finally {
      setIsLoading(false);
    }
  };

  // Log quality changes (Phase 2 testing)
  useEffect(() => {
    if (imageQuality) {
      console.log('📸 Quality changed to:', imageQuality);
      console.log('💰 New estimated cost:', `$${calculateImageCost(imageQuality, imageAspectRatio).toFixed(3)}`);
    }
  }, [imageQuality, imageAspectRatio]);

  // Pre-fill form from copywriting query params
  useEffect(() => {
    const copy = searchParams.get("copy");
    const platform = searchParams.get("platform");
    const audience = searchParams.get("audience");

    if (copy) {
      setFormData((prev) => ({
        ...prev,
        message: copy,
        // Pre-fill campaign name with the campaign title from copywriting
        campaignName: platform || prev.campaignName
      }));
      setUsingAICopy(true);
      setAiCopyInfo({ platform: platform || "Unknown", audience: audience || "Unknown" });
      toast.success("✨ AI-generated copy and campaign name loaded");
    }
  }, [searchParams]);

  // Auto-fill from template data
  useEffect(() => {
    const templateData = localStorage.getItem("selectedTemplate");

    if (templateData) {
      try {
        const template = JSON.parse(templateData);

        // Pre-fill form with template message
        setFormData((prev) => ({
          ...prev,
          message: template.message || prev.message,
          campaignName: template.templateName ? `${template.templateName} Campaign` : prev.campaignName,
        }));

        // Store loaded template info (just IDs and metadata, not large design data)
        setLoadedTemplate({
          templateId: template.templateId,
          templateName: template.templateName,
          hasDesign: template.hasDesign || false,
          dmTemplateId: template.dmTemplateId,
          targetAudience: template.targetAudience,
        });

        setUsingAICopy(true);
        setAiCopyInfo({
          platform: "Template",
          audience: template.targetAudience || "From Template"
        });

        const designMessage = template.hasDesign ? " (with pre-designed layout)" : "";
        toast.success(`✨ Template "${template.templateName}" loaded${designMessage}`);

        // DON'T clear yet - we need it for canvas session creation
        // Will be cleared after session is created
      } catch (error) {
        console.error("Error loading template data:", error);
        toast.error("Failed to load template");
      }
    }
  }, []);

  // Auto-suggest campaign name based on company
  useEffect(() => {
    if (settings.companyName && !formData.campaignName) {
      const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const suggestedName = `${settings.companyName} Campaign - ${date}`;
      setFormData((prev) => ({ ...prev, campaignName: suggestedName }));
    }
  }, [settings.companyName]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const clearTemplate = () => {
    setLoadedTemplate(null);
    localStorage.removeItem("selectedTemplate");
    toast.info("Template cleared");
  };

  /**
   * Apply template without generating new background
   * Only creates QR code and replaces variable fields
   */
  const handleTemplateApplication = async () => {
    console.log('📋 Applying template:', loadedTemplate?.dmTemplateId);

    try {
      const recipient: RecipientData = {
        name: formData.name,
        lastname: formData.lastname,
        address: formData.address,
        city: formData.city,
        zip: formData.zip,
      };

      // Fetch the template to get background image and dimensions
      const templateResponse = await fetch(`/api/dm-template?id=${loadedTemplate?.dmTemplateId}`);
      const templateResult = await templateResponse.json();

      if (!templateResult.success || !templateResult.data) {
        toast.error("Failed to load template, falling back to standard generation");
        setIsLoading(false);
        return;
      }

      const template = templateResult.data;
      console.log('✅ Template fetched:', template.name);

      toast.info("Creating tracking code and landing page...");

      // Generate DM using template's background (no AI generation)
      const response = await fetch("/api/dm-creative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          message: formData.message,
          phoneNumber: formData.phoneNumber,
          companyContext: {
            companyName: settings.companyName,
            industry: settings.industry,
            brandVoice: settings.brandVoice,
            targetAudience: settings.targetAudience,
          },
          apiKey: settings.openaiApiKey,
          campaignName: formData.campaignName || undefined,
          // IMPORTANT: Tell API to skip image generation
          skipImageGeneration: true,
          // Use template's existing background
          existingBackgroundImage: template.backgroundImage,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ Tracking and QR code created');

        // Fetch brand config for canvas editor
        console.log('📦 Fetching brand configuration for canvas editor...');
        let brandConfigLocal = {
          logoUrl: undefined as string | undefined,
          primaryColor: undefined as string | undefined,
          textColor: undefined as string | undefined,
        };

        try {
          const brandResponse = await fetch(`/api/brand/config?companyName=${encodeURIComponent(settings.companyName)}`);
          const brandData = await brandResponse.json();

          if (brandData.success && brandData.data) {
            const rawLogoUrl = brandData.data.logo_url;
            let logoUrl: string | undefined;

            if (rawLogoUrl) {
              if (rawLogoUrl.startsWith('http://') || rawLogoUrl.startsWith('https://')) {
                const proxyResponse = await fetch(`/api/brand/logo-proxy?url=${encodeURIComponent(rawLogoUrl)}`);
                const proxyData = await proxyResponse.json();
                if (proxyData.success) {
                  logoUrl = proxyData.dataUrl;
                }
              } else {
                logoUrl = rawLogoUrl;
              }
            }

            brandConfigLocal = {
              logoUrl,
              primaryColor: brandData.data.primary_color,
              textColor: brandData.data.text_color,
            };
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch brand config, using defaults:', error);
        }

        // Create canvas session with template reference
        console.log('💾 Creating canvas session with template design...');

        const sessionResponse = await fetch('/api/canvas-session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: data.campaignId,
            backgroundImage: template.backgroundImage, // Use template's background
            qrCodeDataUrl: data.data.qrCodeDataUrl,
            trackingId: data.data.trackingId,
            landingPageUrl: data.data.landingPageUrl,
            recipientName: recipient.name,
            recipientLastname: recipient.lastname,
            recipientAddress: recipient.address,
            recipientCity: recipient.city,
            recipientZip: recipient.zip,
            message: formData.message,
            companyName: settings.companyName,
            campaignName: formData.campaignName,
            logoUrl: brandConfigLocal.logoUrl,
            primaryColor: brandConfigLocal.primaryColor || "#003E7E",
            textColor: brandConfigLocal.textColor || "#1F2937",
            canvasWidth: template.canvasWidth,
            canvasHeight: template.canvasHeight,
            phoneNumber: formData.phoneNumber || settings.phoneNumber || "+1 (555) 123-4567",
            dmTemplateId: loadedTemplate?.dmTemplateId, // IMPORTANT: Link to template
          }),
        });

        const sessionData = await sessionResponse.json();

        if (!sessionData.success) {
          toast.error('Failed to create canvas session');
          setIsLoading(false);
          return;
        }

        console.log('✅ Canvas session created with template:', sessionData.sessionId);

        // Store campaign info
        if (data.campaignId && data.campaignName) {
          setCampaignInfo({ id: data.campaignId, name: data.campaignName });
        }

        // Clear template from localStorage
        if (loadedTemplate) {
          localStorage.removeItem("selectedTemplate");
          console.log('🧹 Template data cleared from localStorage');
        }

        setIsLoading(false);

        // Navigate to editor
        toast.success("Opening Canvas Editor with template design...");
        router.push(`/dm-creative/editor?session=${sessionData.sessionId}`);
      } else {
        toast.error(data.error || "Failed to create tracking data");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error applying template:", error);
      toast.error("An error occurred while applying the template");
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.lastname || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    // TEMPLATE WORKFLOW: Skip AI generation, use template design
    if (loadedTemplate?.hasDesign && loadedTemplate?.dmTemplateId) {
      console.log('📋 TEMPLATE WORKFLOW: Skipping AI generation, using saved template design');
      await handleTemplateApplication();
      return;
    }

    // STANDARD WORKFLOW: Generate AI background and navigate to canvas editor
    console.log('🎨 STANDARD WORKFLOW: Generating AI background → Canvas Editor');

    try {
      const recipient: RecipientData = {
        name: formData.name,
        lastname: formData.lastname,
        address: formData.address,
        city: formData.city,
        zip: formData.zip,
      };

      if (!settings.openaiApiKey) {
        toast.error("Please configure your OpenAI API key in Settings");
        setIsLoading(false);
        return;
      }

      // Log API request details
      console.log('📤 Sending to API:', {
        recipient,
        message: formData.message,
        phoneNumber: formData.phoneNumber,
        imageQuality,
        imageAspectRatio,
        estimatedCost: calculateImageCost(imageQuality, imageAspectRatio),
      });

      toast.info("Generating AI background image...");

      const response = await fetch("/api/dm-creative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          message: formData.message,
          phoneNumber: formData.phoneNumber, // NEW: Phone number from form
          companyContext: {
            companyName: settings.companyName,
            industry: settings.industry,
            brandVoice: settings.brandVoice,
            targetAudience: settings.targetAudience,
          },
          apiKey: settings.openaiApiKey,
          campaignName: formData.campaignName || undefined,
          // V2 Image Generation Parameters
          imageQuality,
          imageAspectRatio,
          layoutTemplate,
          sceneDescription: formData.sceneDescription, // Scene description drives image generation
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        console.log('✅ AI background generated, preparing canvas editor...');

        // Store QR code and tracking data
        setQrCodeDataUrl(data.data.qrCodeDataUrl);
        setTrackingId(data.data.trackingId);
        setLandingPageUrl(data.data.landingPageUrl);
        setAcceptedBackground(data.data.creativeImageUrl);

        // Fetch brand config for canvas editor
        console.log('📦 Fetching brand configuration for canvas editor...');
        let brandConfigLocal = {
          logoUrl: undefined as string | undefined,
          primaryColor: undefined as string | undefined,
          textColor: undefined as string | undefined,
        };

        try {
          const brandResponse = await fetch(`/api/brand/config?companyName=${encodeURIComponent(settings.companyName)}`);
          const brandData = await brandResponse.json();

          if (brandData.success && brandData.data) {
            const rawLogoUrl = brandData.data.logo_url;
            let logoUrl: string | undefined;

            if (rawLogoUrl) {
              if (rawLogoUrl.startsWith('http://') || rawLogoUrl.startsWith('https://')) {
                const proxyResponse = await fetch(`/api/brand/logo-proxy?url=${encodeURIComponent(rawLogoUrl)}`);
                const proxyData = await proxyResponse.json();
                if (proxyData.success) {
                  logoUrl = proxyData.dataUrl;
                  console.log('✅ Logo proxied successfully');
                }
              } else {
                logoUrl = rawLogoUrl;
              }
            }

            brandConfigLocal = {
              logoUrl,
              primaryColor: brandData.data.primary_color,
              textColor: brandData.data.text_color,
            };

            console.log('✅ Brand config loaded:', {
              hasLogo: !!logoUrl,
              primaryColor: brandConfigLocal.primaryColor,
              textColor: brandConfigLocal.textColor,
            });
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch brand config, using defaults:', error);
        }

        // Save canvas session to database instead of sessionStorage
        console.log('💾 Saving canvas session to database...');

        const sessionResponse = await fetch('/api/canvas-session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: data.campaignId,
            backgroundImage: data.data.creativeImageUrl,
            qrCodeDataUrl: data.data.qrCodeDataUrl,
            trackingId: data.data.trackingId,
            landingPageUrl: data.data.landingPageUrl,
            recipientName: recipient.name,
            recipientLastname: recipient.lastname,
            recipientAddress: recipient.address,
            recipientCity: recipient.city,
            recipientZip: recipient.zip,
            message: formData.message,
            companyName: settings.companyName,
            campaignName: formData.campaignName,
            logoUrl: brandConfigLocal.logoUrl,
            primaryColor: brandConfigLocal.primaryColor || "#003E7E",
            textColor: brandConfigLocal.textColor || "#1F2937",
            canvasWidth: imageAspectRatio === '1536x1024' ? 1536 : 1024,
            canvasHeight: imageAspectRatio === '1536x1024' ? 1024 : 1536,
            phoneNumber: formData.phoneNumber || settings.phoneNumber || "+1 (555) 123-4567",
            // NEW: Template data for canvas editor
            dmTemplateId: loadedTemplate?.dmTemplateId,
          }),
        });

        const sessionData = await sessionResponse.json();

        if (!sessionData.success) {
          toast.error('Failed to create canvas session');
          setIsLoading(false);
          return;
        }

        console.log('✅ Canvas session created:', sessionData.sessionId);

        // Store campaign info
        if (data.campaignId && data.campaignName) {
          setCampaignInfo({ id: data.campaignId, name: data.campaignName });
        }

        // Clear template from localStorage after session created successfully
        if (loadedTemplate) {
          localStorage.removeItem("selectedTemplate");
          console.log('🧹 Template data cleared from localStorage');
        }

        setIsLoading(false);

        // Navigate to editor page with session ID in URL
        toast.success("Opening Canvas Editor...");
        router.push(`/dm-creative/editor?session=${sessionData.sessionId}`);
      } else {
        toast.error(data.error || "Failed to generate AI background");
      }
    } catch (error) {
      console.error("Error generating DM:", error);
      toast.error("An error occurred while generating the direct mail");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>Direct Mail Details</CardTitle>
            {campaignInfo && (
              <p className="text-sm text-green-600 mt-1">
                Campaign: {campaignInfo.name}
              </p>
            )}
          </div>
          {usingAICopy && aiCopyInfo && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-purple-900">AI-Generated Copy</span>
                <span className="text-[10px] text-purple-700">
                  Campaign: {aiCopyInfo.platform}
                </span>
                <span className="text-[10px] text-purple-600">
                  {aiCopyInfo.audience}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Template Loaded Indicator */}
        {loadedTemplate && (
          <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Library className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">
                  Template Loaded: {loadedTemplate.templateName}
                </p>
                <p className="text-sm text-blue-700 mt-0.5">
                  {loadedTemplate.hasDesign
                    ? "✨ Message and design will be applied in the canvas editor"
                    : "📝 Message will be applied, design as usual"}
                </p>
                {loadedTemplate.targetAudience && (
                  <p className="text-xs text-blue-600 mt-1">
                    Target: {loadedTemplate.targetAudience}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTemplate}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-6">
          {/* Two Column Layout: Data Entry (Left) + AI Settings (Right) */}
          <div className="grid grid-cols-5 gap-6 items-start">
            {/* Left Column - All Data Entry (Campaign, Content, Recipient) */}
            <div className="col-span-3 flex flex-col space-y-6">
              {/* Campaign Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    Campaign Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaignName">Campaign Name (Optional)</Label>
                    <Input
                      id="campaignName"
                      name="campaignName"
                      value={formData.campaignName}
                      onChange={handleChange}
                      placeholder="e.g., Summer 2025 Hearing Aid Promo"
                      className="text-base"
                    />
                    <p className="text-xs text-slate-500">
                      Leave empty to auto-generate
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Contact Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      placeholder="+1 (800) 555-1234"
                      className="text-base"
                    />
                    <p className="text-xs text-slate-500">
                      Appears on all direct mail pieces
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Marketing Content Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Marketing Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label htmlFor="message">Marketing Message *</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Enter your personalized marketing message..."
                    rows={8}
                    required
                    className="text-base resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    This message will appear in both the direct mail and landing page
                  </p>
                </CardContent>
              </Card>

              {/* Recipient Details Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recipient Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">First Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John"
                        required
                        className="text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastname">Last Name *</Label>
                      <Input
                        id="lastname"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleChange}
                        placeholder="Doe"
                        required
                        className="text-base"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="123 Main Street"
                      className="text-base"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="New York"
                        className="text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        name="zip"
                        value={formData.zip}
                        onChange={handleChange}
                        placeholder="10001"
                        className="text-base"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - AI Image Generation Settings + Submit Button */}
            <div className="col-span-2 flex flex-col space-y-4">
              {/* AI Image Generation Section - Only show if NO template loaded */}
              {!loadedTemplate?.hasDesign && (
                <Card className="border-2 border-purple-200 bg-purple-50/30 flex-1">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      AI Image Generation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Scene Description */}
                    <div className="space-y-2">
                      <Label htmlFor="sceneDescription" className="font-medium text-purple-900">
                        Scene Description
                      </Label>
                      <Textarea
                        id="sceneDescription"
                        name="sceneDescription"
                        value={formData.sceneDescription}
                        onChange={handleChange}
                        placeholder="Describe the scene for your AI-generated background image..."
                        rows={8}
                        className="resize-none border-purple-300 focus:border-purple-500 bg-white text-base min-h-[180px] h-[180px]"
                      />
                      <p className="text-xs text-purple-700">
                        <strong>Pro tip:</strong> Be specific about setting, mood, number of people (1-2 recommended), lighting, and atmosphere.
                      </p>
                    </div>

                    {/* Quality Slider */}
                    <div className="space-y-2 pt-3 border-t border-purple-200">
                      <Label className="font-medium text-purple-900">
                        Image Quality
                      </Label>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="1"
                          value={imageQuality === 'low' ? 0 : imageQuality === 'medium' ? 1 : 2}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            const qualities: ImageQuality[] = ['low', 'medium', 'high'];
                            setImageQuality(qualities[value]);
                          }}
                          className="w-full h-2 bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          style={{
                            background: imageQuality === 'low'
                              ? 'linear-gradient(to right, #86efac 0%, #86efac 50%, #cbd5e1 50%, #cbd5e1 100%)'
                              : imageQuality === 'medium'
                              ? 'linear-gradient(to right, #86efac 0%, #93c5fd 50%, #cbd5e1 50%, #cbd5e1 100%)'
                              : 'linear-gradient(to right, #86efac 0%, #93c5fd 50%, #c4b5fd 100%)'
                          }}
                        />
                        <div className="flex justify-between text-xs">
                          <span className={`font-medium ${imageQuality === 'low' ? 'text-green-700' : 'text-slate-400'}`}>
                            Low
                          </span>
                          <span className={`font-medium ${imageQuality === 'medium' ? 'text-blue-700' : 'text-slate-400'}`}>
                            Medium
                          </span>
                          <span className={`font-medium ${imageQuality === 'high' ? 'text-purple-700' : 'text-slate-400'}`}>
                            High
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact Aspect Ratio Selector */}
                    <div className="pt-3 border-t border-purple-200">
                      <AspectRatioSelector
                        selected={imageAspectRatio}
                        onSelect={setImageAspectRatio}
                      />
                    </div>

                    {/* Template Selector */}
                    <div className="pt-3 border-t border-purple-200">
                      <TemplateSelector
                        selected={layoutTemplate}
                        onSelect={setLayoutTemplate}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button - Bottom of Right Column */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full gap-2"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {loadedTemplate?.hasDesign ? "Applying Template..." : "Generating..."}
                  </>
                ) : loadedTemplate?.hasDesign ? (
                  <>
                    <Library className="h-5 w-5" />
                    Apply Template to Recipient
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    Generate Direct Mail
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
