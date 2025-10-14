"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, Check, Lightbulb } from "lucide-react";

interface BrandProfileManagerProps {
  companyName: string;
  apiKey: string;
}

interface ExtractedProfile {
  brandVoice: string;
  tone: string;
  keyPhrases: string[];
  values: string[];
  targetAudience: string;
  profileId?: string;
}

export function BrandProfileManager({ companyName, apiKey }: BrandProfileManagerProps) {
  const [content, setContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("Please paste some marketing content to analyze");
      return;
    }

    if (!companyName) {
      toast.error("Please set your company name in Settings first");
      return;
    }

    if (!apiKey) {
      toast.error("Please configure your OpenAI API key in Settings first");
      return;
    }

    setIsAnalyzing(true);
    setShowSuccess(false);

    try {
      const response = await fetch("/api/brand/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          companyName,
          apiKey,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setExtractedProfile(result.data);
        setShowSuccess(true);
        toast.success("Brand intelligence extracted and saved!");

        // Clear success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        toast.error(result.error || "Failed to extract brand intelligence");
      }
    } catch (error) {
      console.error("Error analyzing brand:", error);
      toast.error("An error occurred while analyzing your brand");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-xl">Brand Intelligence (AI-Powered)</CardTitle>
        </div>
        <CardDescription>
          Upload your existing marketing content and let AI extract your brand voice, tone, and key messaging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 text-sm mb-1">
                How it works
              </h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Paste sample marketing content (website copy, emails, brochures)</li>
                <li>AI analyzes your brand voice, tone, and key phrases</li>
                <li>Profile is automatically saved and used in copywriting</li>
                <li>Your AI-generated content will match your brand consistently</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <Label htmlFor="brandContent" className="text-sm font-medium">
            Your Marketing Content
          </Label>
          <Textarea
            id="brandContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your existing marketing materials here...&#10;&#10;Examples:&#10;- Website homepage copy&#10;- Email campaign text&#10;- Brochure descriptions&#10;- Social media posts&#10;- Product descriptions"
            rows={10}
            className="font-mono text-sm resize-none"
          />
          <p className="text-xs text-slate-500">
            💡 Recommended: At least 200-500 words for accurate analysis
          </p>
        </div>

        {/* Analyze Button */}
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !content.trim()}
          className="w-full h-11"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing Brand Intelligence...
            </>
          ) : showSuccess ? (
            <>
              <Check className="mr-2 h-5 w-5" />
              Profile Saved!
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Extract Brand Intelligence
            </>
          )}
        </Button>

        {/* Extracted Profile Display */}
        {extractedProfile && (
          <div className="mt-6 space-y-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Check className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-slate-900">
                Extracted Brand Profile
              </h3>
            </div>

            <div className="space-y-3">
              {/* Brand Voice */}
              <div>
                <Label className="text-xs text-slate-600 uppercase tracking-wide">
                  Brand Voice
                </Label>
                <p className="text-sm text-slate-900 mt-1">
                  {extractedProfile.brandVoice}
                </p>
              </div>

              {/* Tone */}
              <div>
                <Label className="text-xs text-slate-600 uppercase tracking-wide">
                  Tone
                </Label>
                <p className="text-sm text-slate-900 mt-1">
                  {extractedProfile.tone}
                </p>
              </div>

              {/* Key Phrases */}
              <div>
                <Label className="text-xs text-slate-600 uppercase tracking-wide">
                  Key Phrases
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractedProfile.keyPhrases.map((phrase, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white border border-purple-200 rounded-full text-xs text-slate-900"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>

              {/* Values */}
              <div>
                <Label className="text-xs text-slate-600 uppercase tracking-wide">
                  Core Values
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractedProfile.values.map((value, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white border border-blue-200 rounded-full text-xs text-slate-900"
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <Label className="text-xs text-slate-600 uppercase tracking-wide">
                  Target Audience
                </Label>
                <p className="text-sm text-slate-900 mt-1">
                  {extractedProfile.targetAudience}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-purple-200">
              <p className="text-xs text-slate-600">
                ✨ This profile will be automatically used to generate brand-consistent copy
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
