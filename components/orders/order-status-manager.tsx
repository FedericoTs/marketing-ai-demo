"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  Truck,
  Package,
  Send,
  Printer,
  Home,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface OrderStatusManagerProps {
  orderId: string;
  currentStatus: string;
  orderNumber: string;
  onStatusUpdated: () => void;
}

const statusOptions = [
  { value: "draft", label: "Draft", icon: Clock, color: "bg-gray-100 text-gray-800" },
  { value: "pending", label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  { value: "sent", label: "Sent", icon: Send, color: "bg-blue-100 text-blue-800" },
  { value: "printing", label: "Printing", icon: Printer, color: "bg-purple-100 text-purple-800" },
  { value: "shipped", label: "Shipped", icon: Truck, color: "bg-indigo-100 text-indigo-800" },
  { value: "delivered", label: "Delivered", icon: Home, color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "bg-red-100 text-red-800" },
];

export function OrderStatusManager({
  orderId,
  currentStatus,
  orderNumber,
  onStatusUpdated,
}: OrderStatusManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async () => {
    if (newStatus === currentStatus) {
      toast.error("Please select a different status");
      return;
    }

    setUpdating(true);
    try {
      const body: any = { status: newStatus };

      // Add tracking number if shipping
      if (newStatus === "shipped" && trackingNumber.trim()) {
        body.trackingNumber = trackingNumber.trim();
      }

      // Add timestamp for sent/delivered
      if (newStatus === "sent") {
        body.sentAt = new Date().toISOString();
      } else if (newStatus === "delivered") {
        body.deliveredAt = new Date().toISOString();
      }

      const response = await fetch(`/api/campaigns/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Order ${orderNumber} status updated to '${newStatus}'`);
        setShowDialog(false);
        setTrackingNumber("");
        onStatusUpdated();
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("[Status Manager] Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const getCurrentStatusOption = () => {
    return statusOptions.find((opt) => opt.value === currentStatus);
  };

  const currentStatusOption = getCurrentStatusOption();

  return (
    <>
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentStatusOption && (
                <>
                  <currentStatusOption.icon className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Order Status
                    </p>
                    <Badge className={currentStatusOption.color}>
                      {currentStatusOption.label}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDialog(true)}
              className="gap-2"
            >
              <Package className="h-4 w-4" />
              Update Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order {orderNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Current Status</Label>
              <div className="mt-2">
                <Badge className={currentStatusOption?.color}>
                  {currentStatusOption?.label}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="new-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.value === currentStatus}
                    >
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tracking Number for Shipped Status */}
            {newStatus === "shipped" && (
              <div>
                <Label htmlFor="tracking-number">
                  Tracking Number (Optional)
                </Label>
                <Input
                  id="tracking-number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number..."
                />
              </div>
            )}

            {/* Status Change Preview */}
            <div className="p-3 bg-slate-50 rounded-lg border">
              <p className="text-sm text-slate-600">
                Status will be updated from{" "}
                <strong>{currentStatusOption?.label}</strong> to{" "}
                <strong>
                  {statusOptions.find((opt) => opt.value === newStatus)?.label}
                </strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setNewStatus(currentStatus);
                setTrackingNumber("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updating || newStatus === currentStatus}
              className="gap-2"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
