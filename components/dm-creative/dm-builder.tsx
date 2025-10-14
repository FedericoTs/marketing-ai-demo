"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { RecipientData, DirectMailData } from "@/types/dm-creative";
import { toast } from "sonner";
import { storeLandingPageData } from "@/lib/tracking";
import { useSettings } from "@/lib/contexts/settings-context";
import { composeDMImageBrowser } from "@/lib/dm-image-compositor-browser";

interface DMBuilderProps {
  onGenerated: (dmData: DirectMailData) => void;
}

export function DMBuilder({ onGenerated }: DMBuilderProps) {
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [campaignInfo, setCampaignInfo] = useState<{id: string; name: string} | null>(null);
  const [usingAICopy, setUsingAICopy] = useState(false);
  const [aiCopyInfo, setAiCopyInfo] = useState<{ platform: string; audience: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    address: "",
    city: "",
    zip: "",
    message: "",
    campaignName: "",
  });

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.lastname || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

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

      const response = await fetch("/api/dm-creative/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          message: formData.message,
          companyContext: {
            companyName: settings.companyName,
            industry: settings.industry,
            brandVoice: settings.brandVoice,
            targetAudience: settings.targetAudience,
          },
          apiKey: settings.openaiApiKey,
          campaignName: formData.campaignName || undefined,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Compose the final image client-side
        toast.info("Composing final image...");

        const finalCreativeImage = await composeDMImageBrowser({
          backgroundImage: data.data.creativeImageUrl, // This is the AI-generated background
          recipient,
          message: formData.message,
          qrCodeDataUrl: data.data.qrCodeDataUrl,
          companyName: settings.companyName,
        });

        // Update the DM data with the composed image
        data.data.creativeImageUrl = finalCreativeImage;

        // Store landing page data in localStorage
        storeLandingPageData({
          trackingId: data.data.trackingId,
          recipient,
          message: formData.message,
          companyName: settings.companyName,
          createdAt: data.data.createdAt,
          visits: 0,
        });

        // Store campaign info
        if (data.campaignId && data.campaignName) {
          setCampaignInfo({ id: data.campaignId, name: data.campaignName });
        }

        onGenerated(data.data);
        toast.success(`Direct mail generated! Campaign: ${data.campaignName || "Created"}`);
      } else {
        toast.error(data.error || "Failed to generate direct mail");
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
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name (Optional)</Label>
            <Input
              id="campaignName"
              name="campaignName"
              value={formData.campaignName}
              onChange={handleChange}
              placeholder="e.g., Summer 2025 Hearing Aid Promo"
            />
            <p className="text-xs text-slate-500">
              Leave empty to auto-generate campaign name
            </p>
          </div>
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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Marketing Message *</Label>
            <Textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Enter your personalized marketing message..."
              rows={5}
              required
            />
            <p className="text-xs text-slate-500">
              This message will appear in both the direct mail and landing page
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Generate Direct Mail
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
