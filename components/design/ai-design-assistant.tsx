'use client';

import { useState } from 'react';
import { Canvas } from 'fabric';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface AIDesignAssistantProps {
  canvas: Canvas | null;
  onUpdate: () => void;
}

const EXAMPLE_PROMPTS = [
  "Summer sale postcard",
  "Professional business card",
  "Holiday greeting",
  "Minimalist announcement",
];

export function AIDesignAssistant({ canvas, onUpdate }: AIDesignAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!canvas || !prompt.trim()) {
      toast.error('Please enter a description of your design');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate design');
      }

      const { design } = await response.json();

      // Inject design into canvas
      await injectDesignToCanvas(design);

      toast.success('Design generated successfully!');
      setPrompt('');
      setIsExpanded(false);
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate design. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const injectDesignToCanvas = async (design: any) => {
    if (!canvas) return;

    try {
      // Clear canvas first if specified
      if (design.clearCanvas) {
        canvas.clear();
        canvas.backgroundColor = design.backgroundColor || '#ffffff';
      }

      // Load objects from the generated design JSON
      if (design.objects && Array.isArray(design.objects)) {
        for (const objData of design.objects) {
          await canvas.loadFromJSON({ objects: [objData] }, () => {
            canvas.renderAll();
          });
        }
      }

      canvas.renderAll();
      onUpdate();
    } catch (error) {
      console.error('Failed to inject design:', error);
      toast.error('Failed to apply design to canvas');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
      {/* Floating Panel - Spline-style centered at bottom */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 transition-all duration-200">
        {/* Expanded Section - Examples */}
        {isExpanded && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
            <div className="max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Quick Templates</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    disabled={isGenerating}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50 text-slate-700"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Input Bar */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-[500px]">
            {/* AI Icon + Expand Toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors group relative"
              title={isExpanded ? 'Hide templates' : 'Show templates'}
            >
              <Sparkles className="h-4 w-4 text-blue-600" />
              {isExpanded ? (
                <ChevronDown className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-slate-400 bg-white rounded-full" />
              ) : (
                <ChevronUp className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-slate-400 bg-white rounded-full" />
              )}
            </button>

            {/* Input Field */}
            <div className="flex-1">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your design..."
                disabled={isGenerating}
                className="h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-colors placeholder:text-slate-400 rounded-lg"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              size="sm"
              className="h-9 px-4 gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Generate</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
