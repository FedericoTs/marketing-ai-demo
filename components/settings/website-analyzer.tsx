"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BrandData {
  // Company Profile
  companyName: string;
  industry: string;
  brandVoice: string;
  tone: string;
  targetAudience: string;
  keyPhrases: string[];
  brandValues: string[];
  websiteUrl: string;
  // Visual Brand Kit
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  landingPageTemplate: string;
}

interface WebsiteAnalyzerProps {
  onBrandDataExtracted: (data: BrandData) => void;
}

export function WebsiteAnalyzer({ onBrandDataExtracted }: WebsiteAnalyzerProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl) {
      toast.error("Please enter a website URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    } catch (e) {
      toast.error("Please enter a valid website URL");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/brand/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        onBrandDataExtracted(result.data);
        toast.success("✨ Website analyzed! All fields auto-filled from your website.");
      } else {
        toast.error(result.error || "Failed to analyze website");
      }
    } catch (error) {
      console.error("Error analyzing website:", error);
      toast.error("Failed to analyze website. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-blue-50 shadow-md">
      <CardHeader className="border-b border-purple-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl flex items-center gap-2">
              AI Website Analyzer
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                AI POWERED
              </span>
            </CardTitle>
            <CardDescription className="mt-1">
              Automatically extract your complete brand identity from your website
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Feature List */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-white/60 rounded-lg border border-purple-100">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Company Profile</p>
                <p className="text-xs text-slate-600">Voice, tone, audience</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Visual Identity</p>
                <p className="text-xs text-slate-600">Logo, colors, fonts</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Brand Elements</p>
                <p className="text-xs text-slate-600">Key phrases, values</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-xs">✓</span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Smart Templates</p>
                <p className="text-xs text-slate-600">Industry-optimized</p>
              </div>
            </div>
          </div>

          {/* URL Input */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="Enter your website URL (e.g., www.yourcompany.com)"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !analyzing && handleAnalyzeWebsite()}
                className="h-12 border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                disabled={analyzing}
              />
            </div>
            <Button
              onClick={handleAnalyzeWebsite}
              disabled={analyzing || !websiteUrl}
              size="lg"
              className="gap-2 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  Analyze Website
                </>
              )}
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-slate-600 italic">
            💡 The AI will analyze your website content, extract colors from your design, identify fonts,
            and determine your brand voice - then automatically fill in all fields below.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
