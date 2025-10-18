"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { CopyVariation, BrandMetadata } from "@/types/copywriting";
import { VariationCard } from "./variation-card";
import { toast } from "sonner";
import { useSettings } from "@/lib/contexts/settings-context";

export function CopyGenerator() {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState("");
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [brandMetadata, setBrandMetadata] = useState<BrandMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a marketing message or idea");
      return;
    }

    if (!settings.openaiApiKey) {
      toast.error("Please configure your OpenAI API key in Settings");
      return;
    }

    setIsLoading(true);
    setVariations([]);

    try {
      const response = await fetch("/api/copywriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          companyContext: {
            companyName: settings.companyName,
            industry: settings.industry,
            brandVoice: settings.brandVoice,
            targetAudience: settings.targetAudience,
          },
        }),
      });

      const data = await response.json();

      console.log("API Response:", data); // Debug log

      if (data.success && data.variations) {
        console.log("Variations received:", data.variations);
        setVariations(data.variations);
        setBrandMetadata(data.brandMetadata || null);

        if (data.brandMetadata?.brandVoiceApplied) {
          toast.success(`✨ Generated ${data.variations.length} variations with your brand voice!`);
        } else {
          toast.success(`Generated ${data.variations.length} variations!`);
        }
      } else {
        console.error("API Error:", data.error);
        toast.error(data.error || "Failed to generate variations");
      }
    } catch (error) {
      console.error("Error generating copy:", error);
      toast.error("An error occurred while generating copy");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="prompt">Marketing Message or Campaign Idea</Label>
        <Textarea
          id="prompt"
          placeholder="E.g., Launch of our new AI-powered analytics platform that helps businesses make data-driven decisions faster..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <p className="text-sm text-slate-500">
          Describe your marketing message, campaign idea, or value proposition
        </p>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim()}
        size="lg"
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Generate Variations
          </>
        )}
      </Button>

      {variations.length > 0 && (
        <div className="space-y-4">
          <div className="border-t pt-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Generated Variations ({variations.length})
              </h2>

              {/* Brand DNA Indicator */}
              {brandMetadata?.brandVoiceApplied && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-900">Brand Voice Applied</span>
                </div>
              )}
            </div>

            {/* Brand DNA Details */}
            {brandMetadata?.brandVoiceApplied && (
              <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-purple-900 mb-2">
                      AI used your brand intelligence to generate these variations
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {brandMetadata.tone && (
                        <span className="inline-flex items-center px-2 py-1 bg-white border border-purple-200 rounded-md text-xs text-purple-700">
                          <strong className="mr-1">Tone:</strong> {brandMetadata.tone}
                        </span>
                      )}
                      {brandMetadata.keyPhrasesCount !== undefined && brandMetadata.keyPhrasesCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-white border border-purple-200 rounded-md text-xs text-purple-700">
                          {brandMetadata.keyPhrasesCount} key {brandMetadata.keyPhrasesCount === 1 ? 'phrase' : 'phrases'}
                        </span>
                      )}
                      {brandMetadata.valuesCount !== undefined && brandMetadata.valuesCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-white border border-purple-200 rounded-md text-xs text-purple-700">
                          {brandMetadata.valuesCount} brand {brandMetadata.valuesCount === 1 ? 'value' : 'values'}
                        </span>
                      )}
                      {brandMetadata.styleNotesCount !== undefined && brandMetadata.styleNotesCount > 0 && (
                        <span className="inline-flex items-center px-2 py-1 bg-white border border-purple-200 rounded-md text-xs text-purple-700">
                          {brandMetadata.styleNotesCount} style {brandMetadata.styleNotesCount === 1 ? 'guideline' : 'guidelines'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variations.map((variation) => (
                <VariationCard key={variation.id} variation={variation} />
              ))}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-12 border-2 border-dashed rounded-lg">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
            <p className="text-slate-600">Generating AI-powered variations...</p>
          </div>
        </div>
      )}

      {!isLoading && variations.length === 0 && prompt && (
        <div className="text-center p-8 border-2 border-dashed rounded-lg">
          <p className="text-slate-500">
            Click &quot;Generate Variations&quot; to create AI-powered copy
          </p>
        </div>
      )}
    </div>
  );
}
