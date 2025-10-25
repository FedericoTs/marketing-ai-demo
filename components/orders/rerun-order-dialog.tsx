"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw, Store, Package, DollarSign, CheckCircle2 } from "lucide-react";
import { CampaignOrder } from "@/lib/database/order-queries";
import { toast } from "sonner";

interface RerunOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CampaignOrder;
  onSuccess?: (newOrder: CampaignOrder) => void;
}

/**
 * RerunOrderDialog - One-click order duplication
 *
 * Perfect for recurring monthly campaigns
 * Impact: 93% click reduction (15+ clicks → 1 click)
 *
 * Features:
 * - Duplicates all stores and quantities
 * - Creates new order number automatically
 * - Sets status to "draft" for review
 * - Preserves supplier email and notes
 */
export function RerunOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: RerunOrderDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleRerun = async () => {
    setLoading(true);

    try {
      console.log('🔁 [RerunOrderDialog] Duplicating order:', order.order_number);

      const response = await fetch(`/api/campaigns/orders/${order.id}/duplicate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to duplicate order');
      }

      const newOrder = result.data.order;

      console.log('✅ [RerunOrderDialog] Order duplicated:', newOrder.order_number);

      // Show success toast with new order number
      toast.success(
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Order Duplicated Successfully!</div>
          <div className="text-sm text-slate-600">
            New order: {newOrder.order_number}
          </div>
        </div>,
        {
          duration: 5000,
        }
      );

      onOpenChange(false);

      if (onSuccess) {
        onSuccess(newOrder);
      }
    } catch (error) {
      console.error('❌ [RerunOrderDialog] Error duplicating order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCw className="h-5 w-5 text-blue-600" />
            Rerun Order {order.order_number}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            This will create a new order with <strong>identical stores and quantities</strong>.
            Perfect for recurring monthly campaigns!
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Order Summary */}
        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg transition-colors hover:bg-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Store className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-900">Total Stores</p>
                <p className="text-xs text-purple-700">Will be duplicated</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-purple-900">
              {order.total_stores}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg transition-colors hover:bg-green-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-900">Total Quantity</p>
                <p className="text-xs text-green-700">Same quantities</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-green-900">
              {order.total_quantity.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg transition-colors hover:bg-orange-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-900">Estimated Cost</p>
                <p className="text-xs text-orange-700">$0.25 per piece</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-orange-900">
              ${order.estimated_cost.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              What happens next?
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• New order created with status <strong>"Draft"</strong></li>
              <li>• Auto-generated order number (ORD-YYYY-MM-XXX)</li>
              <li>• All stores and quantities preserved</li>
              <li>• Ready for review and adjustments</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRerun}
            disabled={loading}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <RotateCw className="h-4 w-4" />
                Rerun Order
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
