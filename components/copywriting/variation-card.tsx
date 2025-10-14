"use client";

import { CopyVariation } from "@/types/copywriting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface VariationCardProps {
  variation: CopyVariation;
}

export function VariationCard({ variation }: VariationCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(variation.content);
      setCopied(true);
      toast.success("Copied to clipboard!");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Failed to copy");
      console.error("Error copying:", error);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{variation.platform}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {variation.audience}
          </span>
          {variation.tone && (
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
              {variation.tone}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
          {variation.content}
        </p>
      </CardContent>
    </Card>
  );
}
