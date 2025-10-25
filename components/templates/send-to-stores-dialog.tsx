"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  template_data: {
    message: string;
    targetAudience?: string;
    industry?: string;
    tone?: string;
  };
}

interface SendToStoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
}

/**
 * Send to Stores Dialog - Direct Template-to-Order Flow
 *
 * Streamlined workflow: Template → Order in 3 clicks
 * Impact: 67% click reduction (9+ clicks → 3 clicks)
 *
 * Flow:
 * 1. User clicks "Send to Stores" on template card
 * 2. This dialog opens with campaign name pre-filled
 * 3. Click "Create Order" → Redirects to order creation page with campaign pre-selected
 */
export function SendToStoresDialog({
  open,
  onOpenChange,
  template,
}: SendToStoresDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState("");

  // Auto-generate campaign name when dialog opens
  useEffect(() => {
    if (open) {
      const today = new Date();
      const monthYear = today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      setCampaignName(`${template.name} - ${monthYear}`);
    }
  }, [open, template.name]);

  const handleCreateOrder = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    setLoading(true);

    try {
      console.log('📤 [Send to Stores] Creating campaign from template:', template.name);

      // Step 1: Create campaign from template
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          message: template.template_data.message,
          companyName: localStorage.getItem('companyName') || 'My Company',
        }),
      });

      const campaignResult = await campaignResponse.json();

      if (!campaignResult.success) {
        throw new Error(campaignResult.error || 'Failed to create campaign');
      }

      const campaign = campaignResult.data;
      console.log('✅ [Send to Stores] Campaign created:', campaign.id);

      // Step 2: Increment template use count
      await fetch(`/api/campaigns/templates/${template.id}/use`, {
        method: 'POST',
      });

      // Step 3: Navigate to order creation with pre-selected campaign
      toast.success(`Campaign "${campaignName}" created! Redirecting to order creation...`);

      onOpenChange(false);

      // Redirect to new order page with campaign pre-selected
      setTimeout(() => {
        router.push(`/campaigns/orders/new?campaignId=${campaign.id}&fromTemplate=true`);
      }, 800);

    } catch (error) {
      console.error('❌ [Send to Stores] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Send "{template.name}" to Stores
          </DialogTitle>
          <DialogDescription>
            Create a campaign from this template, then configure your order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campaign Name Input */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name</Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Holiday Campaign - Dec 2025"
              autoFocus
            />
            <p className="text-xs text-slate-500">
              This will create a campaign with the template's message
            </p>
          </div>

          {/* Template Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="font-medium text-blue-900">Template Message:</span>
              <p className="text-blue-700 mt-1 line-clamp-2">
                {template.template_data.message}
              </p>
            </div>
            {template.template_data.targetAudience && (
              <p className="text-xs text-blue-600">
                <span className="font-medium">Target:</span> {template.template_data.targetAudience}
              </p>
            )}
          </div>

          {/* Next Steps Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm font-medium text-slate-900 mb-2">Next steps:</p>
            <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
              <li>Campaign will be created with template message</li>
              <li>You'll be redirected to the order page</li>
              <li>Select stores and quantities</li>
              <li>Generate and download your order</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrder}
            disabled={loading || !campaignName.trim()}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Create & Continue to Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
