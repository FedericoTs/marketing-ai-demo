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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Store, Package, DollarSign, AlertCircle } from "lucide-react";

interface OrderConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderSummary: {
    totalStores: number;
    totalQuantity: number;
    estimatedCost: number;
    stores: Array<{
      storeNumber: string;
      storeName: string;
      quantity: number;
    }>;
  };
  onConfirm: (data: { notes?: string; supplierEmail?: string }) => Promise<void>;
  loading?: boolean;
}

export function OrderConfirmationModal({
  open,
  onOpenChange,
  orderSummary,
  onConfirm,
  loading = false,
}: OrderConfirmationModalProps) {
  const [notes, setNotes] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");

  const handleConfirm = async () => {
    await onConfirm({
      notes: notes || undefined,
      supplierEmail: supplierEmail || undefined,
    });
  };

  const handleCancel = () => {
    setNotes("");
    setSupplierEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Confirm Order Generation
          </DialogTitle>
          <DialogDescription>
            Review the order details before generating the PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Stores</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {orderSummary.totalStores}
                  </p>
                </div>
                <Store className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Quantity</p>
                  <p className="text-2xl font-bold text-green-900">
                    {orderSummary.totalQuantity.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700">pieces</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Estimated Cost</p>
                  <p className="text-2xl font-bold text-orange-900">
                    ${orderSummary.estimatedCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-orange-700">$0.25 per piece</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Store Breakdown */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 mb-3">Store Breakdown</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {orderSummary.stores.slice(0, 5).map((store, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-500">
                      #{store.storeNumber}
                    </span>
                    <span className="text-sm text-slate-900">{store.storeName}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {store.quantity} pieces
                  </span>
                </div>
              ))}
              {orderSummary.stores.length > 5 && (
                <div className="text-center py-2 text-sm text-slate-500">
                  + {orderSummary.stores.length - 5} more stores...
                </div>
              )}
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Order Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any special instructions or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="supplier-email">Supplier Email (Optional)</Label>
              <Input
                id="supplier-email"
                type="email"
                placeholder="supplier@printco.com"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">
                If provided, the order PDF will be sent to this email
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Ready to generate?
              </p>
              <p className="text-sm text-blue-800 mt-1">
                A PDF will be generated and the order will be saved with status "draft".
                You can edit it later from the Orders page.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Order...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Order & PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
