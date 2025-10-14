"use client";

import { CopyVariation } from "@/types/copywriting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface VariationCardProps {
  variation: CopyVariation;
}

export function VariationCard({ variation }: VariationCardProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

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

  const handleUseInCampaign = () => {
    // Encode copy data for URL
    const params = new URLSearchParams({
      copy: variation.content,
      platform: variation.platform,
      audience: variation.audience,
    });

    toast.success("Opening DM Creative with your copy...");
    router.push(`/dm-creative?${params.toString()}`);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{variation.platform}</CardTitle>
          <div className="flex items-center gap-2">
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
            <Button
              variant="default"
              size="sm"
              onClick={handleUseInCampaign}
              className="gap-1.5 h-8 px-3"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Use in Campaign</span>
            </Button>
          </div>
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
