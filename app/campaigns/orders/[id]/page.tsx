"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Loader2,
  Download,
  Edit,
  Trash2,
  FileText,
  Package,
  DollarSign,
  Store as StoreIcon,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { OrderStatusManager } from "@/components/orders/order-status-manager";
import { CancelOrderDialog } from "@/components/orders/cancel-order-dialog";

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: string;
  total_stores: number;
  total_quantity: number;
  estimated_cost: number;
  pdf_url: string | null;
  csv_url: string | null;
  notes: string | null;
  tracking_number: string | null;
  supplier_email: string | null;
  sent_at: string | null;
  delivered_at: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  store_id: string;
  campaign_id: string;
  recommended_quantity: number;
  approved_quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
  // JOINed fields
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  campaign_name: string;
}

interface OrderDetailData {
  order: Order;
  items: OrderItem[];
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [data, setData] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/campaigns/orders/${orderId}`);
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        toast.error(result.error || "Failed to load order");
        router.push("/campaigns/orders");
      }
    } catch (error) {
      console.error("[Order Detail] Error loading order:", error);
      toast.error("Failed to load order");
      router.push("/campaigns/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!data) return;

    if (!["draft", "pending"].includes(data.order.status)) {
      toast.error(`Cannot delete orders in '${data.order.status}' status`);
      return;
    }

    const confirmed = window.confirm(
      `Delete order ${data.order.order_number}? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/orders/${data.order.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Order ${data.order.order_number} deleted`);
        router.push("/campaigns/orders");
      } else {
        toast.error(result.error || "Failed to delete order");
      }
    } catch (error) {
      console.error("[Order Detail] Error deleting order:", error);
      toast.error("Failed to delete order");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-blue-100 text-blue-800",
      printing: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.draft;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canEdit = (status: string) => {
    return ["draft", "pending"].includes(status);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Order not found
              </h3>
              <p className="text-slate-600 mb-6">
                The order you're looking for doesn't exist or has been deleted
              </p>
              <Button onClick={() => router.push("/campaigns/orders")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { order, items } = data;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/campaigns/orders")}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">
                Order {order.order_number}
              </h1>
              <Badge className={getStatusColor(order.status)}>
                {order.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {formatDate(order.created_at)}
              </div>
              {order.updated_at !== order.created_at && (
                <div>Updated {formatDate(order.updated_at)}</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {order.pdf_url && (
              <Button
                variant="outline"
                onClick={() => window.open(order.pdf_url!, "_blank")}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => window.open(`/api/campaigns/orders/${order.id}/csv`, "_blank")}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>

            {canEdit(order.status) && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/campaigns/orders/${order.id}/edit`)
                  }
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Order
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowCancelDialog(true)}
                  className="gap-2 text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                >
                  <AlertCircle className="h-4 w-4" />
                  Cancel Order
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gap-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Order Status Manager */}
      <div className="mb-6">
        <OrderStatusManager
          orderId={order.id}
          currentStatus={order.status}
          orderNumber={order.order_number}
          onStatusUpdated={loadOrder}
        />
      </div>

      {/* Order Notes */}
      {order.notes && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Order Notes</p>
                <p className="text-sm text-blue-800 mt-1">{order.notes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Stores
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {order.total_stores}
                </p>
              </div>
              <StoreIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Quantity
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {order.total_quantity.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">pieces</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Estimated Cost
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  ${order.estimated_cost.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  $0.25 per piece
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Unit Cost
                </p>
                <p className="text-2xl font-bold text-slate-900">$0.25</p>
                <p className="text-xs text-slate-500 mt-1">per piece</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      {(order.supplier_email || order.tracking_number) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.supplier_email && (
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Supplier Email
                  </p>
                  <p className="text-slate-900">{order.supplier_email}</p>
                </div>
              )}
              {order.tracking_number && (
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Tracking Number
                  </p>
                  <p className="text-slate-900">{order.tracking_number}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">#{item.store_number}</div>
                        <div className="text-sm text-slate-500">
                          {item.store_name}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.city}, {item.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{item.campaign_name}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.approved_quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${item.unit_cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${item.total_cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Total Row */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <div className="text-lg font-semibold text-slate-900">
                Order Total
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600">
                  {order.total_stores} stores × {order.total_quantity.toLocaleString()} pieces
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  ${order.estimated_cost.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline (Future Enhancement) */}
      {(order.sent_at || order.delivered_at) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-slate-900">Order Created</p>
                  <p className="text-sm text-slate-600">
                    {formatDate(order.created_at)}
                  </p>
                </div>
              </div>

              {order.sent_at && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-slate-900">Order Sent</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(order.sent_at)}
                    </p>
                  </div>
                </div>
              )}

              {order.delivered_at && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-slate-900">Order Delivered</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(order.delivered_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        orderId={order.id}
        orderNumber={order.order_number}
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onCancelled={loadOrder}
      />
    </div>
  );
}
