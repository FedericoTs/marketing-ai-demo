"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CancelOrderDialogProps {
  orderId: string;
  orderNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelled: () => void;
}

export function CancelOrderDialog({
  orderId,
  orderNumber,
  open,
  onOpenChange,
  onCancelled,
}: CancelOrderDialogProps) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/campaigns/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (reason.trim()) {
          await fetch(`/api/campaigns/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              notes: `CANCELLED: ${reason.trim()}`,
            }),
          });
        }

        toast.success(`Order ${orderNumber} has been cancelled`);
        onOpenChange(false);
        setReason("");
        onCancelled();
      } else {
        toast.error(result.error || "Failed to cancel order");
      }
    } catch (error) {
      console.error("[Cancel Order] Error:", error);
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>Cancel Order {orderNumber}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the order and mark it as cancelled. This action can
                be reversed by updating the order status.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="cancellation-reason">
              Cancellation Reason (Optional)
            </Label>
            <Textarea
              id="cancellation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
              rows={3}
            />
          </div>

          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-900">
              <strong>Note:</strong> Cancelling an order will prevent further processing
              but will not delete the order. You can view cancelled orders in the orders
              list.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason("");
            }}
            disabled={cancelling}
          >
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={cancelling}
            className="gap-2"
          >
            {cancelling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                Cancel Order
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}