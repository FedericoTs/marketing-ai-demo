"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Campaign } from "@/lib/database/tracking-queries";
import { toast } from "sonner";

interface EditCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onSuccess?: () => void;
}

/**
 * EditCampaignDialog - Inline campaign editing modal
 *
 * Allows editing campaign details without navigating to a separate page.
 * Part of Improvement #5: Contextual Quick Actions
 *
 * Features:
 * - Pre-filled form with current campaign data
 * - Status dropdown (active/paused/completed)
 * - Validation and error handling
 * - Success toast notification
 * - Automatic parent refresh via onSuccess callback
 *
 * Usage:
 * ```tsx
 * <EditCampaignDialog
 *   open={showEditDialog}
 *   onOpenChange={setShowEditDialog}
 *   campaign={campaign}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function EditCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: EditCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: campaign.name,
    message: campaign.message,
    status: campaign.status,
  });

  // Reset form when dialog opens or campaign changes
  useEffect(() => {
    if (open) {
      setFormData({
        name: campaign.name,
        message: campaign.message,
        status: campaign.status,
      });
    }
  }, [open, campaign]);

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Campaign message is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update campaign');
      }

      toast.success('Campaign updated successfully');
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('❌ [Edit Campaign Dialog] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-2"
              placeholder="e.g., Summer Sale 2025"
            />
          </div>

          <div>
            <Label htmlFor="message">Marketing Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={6}
              className="mt-2 resize-none"
              placeholder="Enter your marketing message..."
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Campaign['status']) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
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
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
