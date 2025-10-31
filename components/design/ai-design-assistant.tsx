'use client';

import { useState } from 'react';
import { Canvas } from 'fabric';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Sparkles, Send, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AIDesignAssistantProps {
  canvas: Canvas | null;
  onUpdate: () => void;
}

const EXAMPLE_PROMPTS = [
  "Create a summer sale postcard with bright colors",
  "Design a professional business card template",
  "Make a holiday greeting card with festive elements",
  "Create a minimalist product announcement",
];

export function AIDesignAssistant({ canvas, onUpdate }: AIDesignAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
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

  if (!isOpen) {
    return (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="shadow-lg hover:shadow-xl transition-shadow gap-2 h-12 px-6"
          size="lg"
        >
          <Sparkles className="h-5 w-5" />
          AI Design Assistant
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <Card className="shadow-2xl border-2 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI Design Assistant</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              placeholder="Describe your design... (e.g., 'Create a summer sale postcard with bright colors and palm tree graphics')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isGenerating}
            />

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Examples:</span>
              {EXAMPLE_PROMPTS.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(example)}
                  disabled={isGenerating}
                  className="text-xs h-7"
                >
                  {example}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Generate Design
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
