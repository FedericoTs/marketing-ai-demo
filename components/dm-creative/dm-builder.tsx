"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    address: "",
    city: "",
    zip: "",
    message: "",
  });

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

        onGenerated(data.data);
        toast.success("Direct mail generated successfully!");
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
        <CardTitle>Direct Mail Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGenerate} className="space-y-4">
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
