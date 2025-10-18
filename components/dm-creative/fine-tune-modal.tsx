"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Check, X, RefreshCw, Settings2, Eye, EyeOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FineTuneModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: (backgroundImage: string) => void;
  // Generation parameters
  message: string;
  companyContext: any;
  apiKey: string;
  imageQuality: string;
  imageAspectRatio: string;
  layoutTemplate: string;
  brandConfig?: any;
  initialSceneDescription?: string; // Scene description from main form
}

type PromptStyle = 'natural' | 'professional' | 'artistic' | 'vibrant';

export function FineTuneModal({
  open,
  onClose,
  onAccept,
  message,
  companyContext,
  apiKey,
  imageQuality,
  imageAspectRatio,
  layoutTemplate,
  brandConfig,
  initialSceneDescription,
}: FineTuneModalProps) {
  const [generatedBackground, setGeneratedBackground] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true); // Changed to TRUE - show controls by default

  // Fine-tuning parameters - initialized from parent form
  const [promptStyle, setPromptStyle] = useState<PromptStyle>('professional');
  const [noLogoStrength, setNoLogoStrength] = useState<number>(10); // 1-10 scale
  const [customInstructions, setCustomInstructions] = useState('');
  const [customSceneDescription, setCustomSceneDescription] = useState(
    initialSceneDescription || 'Happy and active social life scene with 1-2 people smiling and engaging in conversation, natural warm lighting, intimate cozy setting, friendly atmosphere, NOT crowded, authentic lifestyle photography'
  );
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [imageMetadata, setImageMetadata] = useState<any>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // NO auto-generation - user controls when to generate
  // Removed useEffect that auto-generated on mount

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedBackground(null);
    setAttemptCount(prev => prev + 1);

    try {
      console.log('🔧 Fine-tune modal: Generating background with parameters:', {
        promptStyle,
        noLogoStrength,
        customInstructions: customInstructions.substring(0, 50),
        customSceneDescription: customSceneDescription.substring(0, 50),
        layoutTemplate,
        imageQuality,
        imageAspectRatio,
      });

      // Call API to generate background
      const response = await fetch('/api/dm-creative/generate-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          companyContext,
          apiKey,
          imageQuality,
          imageAspectRatio,
          layoutTemplate,
          brandConfig,
          // Fine-tuning parameters
          promptStyle,
          noLogoStrength,
          customInstructions,
          customSceneDescription,  // NEW: Pass scene description
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate background');
      }

      setGeneratedBackground(data.backgroundImage);
      setGeneratedPrompt(data.promptUsed || '');
      setImageMetadata(data.metadata || null);

      toast.success('Background generated successfully');
    } catch (error) {
      console.error('❌ Fine-tune modal: Generation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate background');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (generatedBackground) {
      console.log('✅ Fine-tune modal: Background accepted');
      onAccept(generatedBackground);
      onClose();
    }
  };

  const handleReject = () => {
    console.log('❌ Fine-tune modal: Background rejected, showing fine-tune controls');
    setShowAdvanced(true);
    toast.info('Adjust the parameters below and regenerate');
  };

  const handleReset = () => {
    setPromptStyle('professional');
    setNoLogoStrength(10);
    setCustomInstructions('');
    setCustomSceneDescription('Happy and active social life scene with 1-2 people (not crowded), natural warm lighting, genuine smiles, engaging in meaningful conversation or activity together');  // Reset to default
    setGeneratedBackground(null);
    setGeneratedPrompt('');
  };

  const getNoLogoLabel = (value: number): string => {
    if (value >= 9) return 'Maximum Enforcement';
    if (value >= 7) return 'Very Strong';
    if (value >= 5) return 'Strong';
    if (value >= 3) return 'Moderate';
    return 'Basic';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Fine-Tune Background Generation
            {attemptCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Attempt #{attemptCount}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Customize the scene description below, then generate your background. You can regenerate as many times as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scene Description FIRST - Most Important Control */}
          <div className="space-y-3 p-5 border-2 border-purple-200 rounded-lg bg-purple-50/50">
            <Label htmlFor="scene-description" className="text-base font-bold flex items-center gap-2 text-purple-900">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Scene Description
            </Label>
            <p className="text-sm text-purple-700 mb-2">
              Describe the scene you want pictured. This is the most important field for getting your desired image!
            </p>
            <Textarea
              id="scene-description"
              value={customSceneDescription}
              onChange={(e) => setCustomSceneDescription(e.target.value)}
              placeholder="e.g., 'Happy active social life: two friends laughing over coffee at a bright modern cafe, natural sunlight streaming through large windows, warm and inviting atmosphere - NOT crowded, intimate setting'"
              rows={4}
              className="resize-none border-purple-300 focus:border-purple-500 font-medium"
            />
            <p className="text-xs text-purple-600">
              💡 <strong>Default:</strong> Scenes show happy, active social life (1-2 people, not crowded, natural lighting, genuine engagement).
            </p>
          </div>

          {/* Generate Button - Prominent */}
          {!generatedBackground && (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full gap-2 h-12 text-base"
              size="lg"
            >
              <Sparkles className={cn("w-5 h-5", isGenerating && "animate-spin")} />
              {isGenerating ? 'Generating Your Background...' : 'Generate Background'}
            </Button>
          )}

          {/* Preview Section - Only show after generation */}
          {(generatedBackground || isGenerating) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Background Preview</Label>
                {generatedPrompt && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPrompt(!showPrompt)}
                  >
                    {showPrompt ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {showPrompt ? 'Hide' : 'View'} Prompt
                  </Button>
                )}
              </div>

              {/* Generated Image Preview */}
              <div className="relative w-full aspect-[3/2] bg-slate-100 rounded-lg border-2 border-slate-200 overflow-hidden flex items-center justify-center">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Generating background with {layoutTemplate} template...
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md text-center">
                      Using your scene description: "{customSceneDescription.substring(0, 80)}..."
                    </p>
                  </div>
                ) : generatedBackground ? (
                  <img
                    src={generatedBackground}
                    alt="Generated background"
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>

            {/* Image Metadata */}
            {imageMetadata && (
              <div className="text-xs text-muted-foreground space-y-1 bg-slate-50 p-3 rounded">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="font-medium">Quality:</span> {imageMetadata.quality}
                  </div>
                  <div>
                    <span className="font-medium">Size:</span> {imageMetadata.size}
                  </div>
                  <div>
                    <span className="font-medium">Model:</span> {imageMetadata.model || 'gpt-image-1'}
                  </div>
                </div>
              </div>
            )}

              {/* Prompt Display */}
              {showPrompt && generatedPrompt && (
                <div className="mt-3">
                  <Label className="text-sm font-medium mb-2 block">Generated Prompt:</Label>
                  <Textarea
                    value={generatedPrompt}
                    readOnly
                    rows={8}
                    className="font-mono text-xs bg-slate-50"
                  />
                </div>
              )}
            </div>
          )}

          {/* Quick Accept Action - Always visible when background is ready */}
          {generatedBackground && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Happy with this background?
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  Click Accept to continue with final composition, or adjust parameters below and regenerate.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAccept}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4" />
                Accept & Continue
              </Button>
            </div>
          )}

          {/* Advanced Fine-Tuning Controls - Collapsible after first generation */}
          {generatedBackground && (
            <div className="space-y-4 p-5 border-2 border-blue-200 rounded-lg bg-blue-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-bold flex items-center gap-2 text-blue-900">
                    <Settings2 className="w-5 h-5" />
                    Advanced Adjustments
                  </Label>
                  <p className="text-xs text-blue-700 mt-1">
                    Fine-tune the scene description or other parameters and regenerate
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Reset All
                </Button>
              </div>

              {/* Scene Description - Editable */}
              <div className="space-y-2">
                <Label htmlFor="scene-description-edit" className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Scene Description
                </Label>
                <Textarea
                  id="scene-description-edit"
                  value={customSceneDescription}
                  onChange={(e) => setCustomSceneDescription(e.target.value)}
                  placeholder="Describe the scene..."
                  rows={3}
                  className="resize-none border-purple-300 focus:border-purple-500"
                />
              </div>

              {/* Prompt Style */}
              <div className="space-y-2">
                <Label htmlFor="prompt-style">Photography Style</Label>
                <Select value={promptStyle} onValueChange={(value) => setPromptStyle(value as PromptStyle)}>
                  <SelectTrigger id="prompt-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Natural & Authentic</SelectItem>
                    <SelectItem value="professional">Professional & Polished</SelectItem>
                    <SelectItem value="artistic">Artistic & Creative</SelectItem>
                    <SelectItem value="vibrant">Vibrant & Energetic</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Influences the overall aesthetic and mood of the photograph
                </p>
              </div>

              {/* NO LOGO Strength */}
              <div className="space-y-3">
                <Label htmlFor="no-logo-strength">
                  NO LOGO Enforcement: {getNoLogoLabel(noLogoStrength)} ({noLogoStrength}/10)
                </Label>
                <Slider
                  id="no-logo-strength"
                  min={1}
                  max={10}
                  step={1}
                  value={[noLogoStrength]}
                  onValueChange={(values) => setNoLogoStrength(values[0])}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher values add more explicit instructions to prevent AI from generating logos or text
                </p>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label htmlFor="custom-instructions">Custom Instructions (Optional)</Label>
                <Textarea
                  id="custom-instructions"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g., 'Use warmer tones', 'Include nature elements', 'Avoid busy patterns'..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Additional specific guidance for the AI image generator
                </p>
              </div>

              {/* Regenerate Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 gap-2"
                  variant="default"
                >
                  <RefreshCw className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                  {isGenerating ? 'Generating...' : 'Regenerate Background'}
                </Button>
                {generatedBackground && (
                  <Button
                    type="button"
                    onClick={handleAccept}
                    disabled={isGenerating}
                    className="gap-2"
                    variant="outline"
                  >
                    <Check className="w-4 h-4" />
                    Accept This
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
            <p className="font-medium text-blue-900 mb-1">💡 Tips for Better Results:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>If logos appear: Increase NO LOGO enforcement to maximum and regenerate</li>
              <li>For cleaner layouts: Use "Professional" style with minimal template</li>
              <li>To fix colors: Add custom instructions like "use cooler blue tones"</li>
              <li>Multiple attempts: Each generation creates a unique variation</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
