"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { Campaign } from "@/lib/database/tracking-queries";
import { toast } from "sonner";

interface DeleteCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onSuccess?: () => void;
}

/**
 * DeleteCampaignDialog - Campaign deletion confirmation modal
 *
 * Provides a confirmation dialog to prevent accidental campaign deletion.
 * Part of Improvement #5: Contextual Quick Actions
 *
 * Features:
 * - Clear warning message with campaign name
 * - Destructive action styling (red button)
 * - Loading state during deletion
 * - Success toast notification
 * - Automatic parent refresh via onSuccess callback
 *
 * Usage:
 * ```tsx
 * <DeleteCampaignDialog
 *   open={showDeleteDialog}
 *   onOpenChange={setShowDeleteDialog}
 *   campaign={campaign}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function DeleteCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: DeleteCampaignDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete campaign');
      }

      toast.success(`Campaign "${campaign.name}" deleted successfully`);
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('❌ [Delete Campaign Dialog] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>Delete Campaign</DialogTitle>
          </div>
          <DialogDescription className="pt-3">
            Are you sure you want to delete <strong>"{campaign.name}"</strong>?
            <br />
            <br />
            This action cannot be undone. All associated recipients, tracking data, and analytics
            will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete Campaign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
