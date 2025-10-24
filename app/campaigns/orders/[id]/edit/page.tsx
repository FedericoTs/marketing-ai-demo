"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Loader2,
  Trash2,
  AlertCircle,
  Package,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
}

interface Store {
  id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
}

interface OrderItem {
  id?: string; // Optional for new items
  storeId: string;
  campaignId: string;
  approvedQuantity: number;
  recommendedQuantity: number;
  notes?: string;
  // For display
  store_number?: string;
  store_name?: string;
  city?: string;
  state?: string;
  campaign_name?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  notes: string | null;
  supplier_email: string | null;
  total_stores: number;
  total_quantity: number;
  estimated_cost: number;
}

export default function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Order data
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");

  // Reference data
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  // New item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemStoreId, setNewItemStoreId] = useState("");
  const [newItemCampaignId, setNewItemCampaignId] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("100");

  useEffect(() => {
    params.then((p) => setOrderId(p.id));
  }, [params]);

  useEffect(() => {
    if (orderId) {
      loadData();
    }
  }, [orderId]);

  const loadData = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      // Load order data
      const orderResponse = await fetch(`/api/campaigns/orders/${orderId}`);
      const orderResult = await orderResponse.json();

      if (!orderResult.success || !orderResult.data) {
        toast.error(orderResult.error || "Failed to load order");
        router.push("/campaigns/orders");
        return;
      }

      const { order: orderData, items } = orderResult.data;

      // Check if order can be edited
      if (!["draft", "pending"].includes(orderData.status)) {
        toast.error(`Cannot edit order in '${orderData.status}' status`);
        router.push(`/campaigns/orders/${orderId}`);
        return;
      }

      setOrder(orderData);
      setNotes(orderData.notes || "");
      setSupplierEmail(orderData.supplier_email || "");

      // Transform items to editable format
      const editableItems = items.map((item: any) => ({
        id: item.id,
        storeId: item.store_id,
        campaignId: item.campaign_id,
        approvedQuantity: item.approved_quantity,
        recommendedQuantity: item.recommended_quantity,
        notes: item.notes,
        store_number: item.store_number,
        store_name: item.store_name,
        city: item.city,
        state: item.state,
        campaign_name: item.campaign_name,
      }));

      setOrderItems(editableItems);

      // Load campaigns
      const campaignsResponse = await fetch("/api/campaigns");
      const campaignsResult = await campaignsResponse.json();
      if (campaignsResult.success) {
        setCampaigns(campaignsResult.data || []);
      }

      // Load stores
      const storesResponse = await fetch("/api/retail/stores");
      const storesResult = await storesResponse.json();
      if (storesResult.success && storesResult.data) {
        setStores(storesResult.data.stores || []);
      }
    } catch (error) {
      console.error("[Edit Order] Error loading data:", error);
      toast.error("Failed to load order data");
      router.push("/campaigns/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = (index: number, newQuantity: string) => {
    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity < 1) return;

    const updated = [...orderItems];
    updated[index].approvedQuantity = quantity;
    setOrderItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = orderItems.filter((_, i) => i !== index);
    setOrderItems(updated);
  };

  const handleAddNewItem = () => {
    if (!newItemStoreId || !newItemCampaignId) {
      toast.error("Please select store and campaign");
      return;
    }

    const quantity = parseInt(newItemQuantity, 10);
    if (isNaN(quantity) || quantity < 1) {
      toast.error("Please enter valid quantity");
      return;
    }

    // Find store details
    const store = stores.find((s) => s.id === newItemStoreId);
    const campaign = campaigns.find((c) => c.id === newItemCampaignId);

    const newItem: OrderItem = {
      storeId: newItemStoreId,
      campaignId: newItemCampaignId,
      approvedQuantity: quantity,
      recommendedQuantity: quantity,
      store_number: store?.store_number,
      store_name: store?.store_name,
      city: store?.city,
      state: store?.state,
      campaign_name: campaign?.name,
    };

    setOrderItems([...orderItems, newItem]);
    setShowAddItem(false);
    setNewItemStoreId("");
    setNewItemCampaignId("");
    setNewItemQuantity("100");
    toast.success("Item added to order");
  };

  const calculateTotals = () => {
    const totalStores = orderItems.length;
    const totalQuantity = orderItems.reduce(
      (sum, item) => sum + item.approvedQuantity,
      0
    );
    const estimatedCost = totalQuantity * 0.25;

    return { totalStores, totalQuantity, estimatedCost };
  };

  const handleSave = async () => {
    if (orderItems.length === 0) {
      toast.error("Order must have at least one item");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/campaigns/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItems: orderItems.map((item) => ({
            id: item.id,
            storeId: item.storeId,
            campaignId: item.campaignId,
            approvedQuantity: item.approvedQuantity,
            recommendedQuantity: item.recommendedQuantity,
            notes: item.notes,
          })),
          notes: notes.trim() || undefined,
          supplierEmail: supplierEmail.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Order ${order?.order_number} updated successfully`);
        router.push(`/campaigns/orders/${orderId}`);
      } else {
        toast.error(result.error || "Failed to update order");
      }
    } catch (error) {
      console.error("[Edit Order] Error saving:", error);
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
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

  if (!order) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Order not found
              </h3>
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

  const totals = calculateTotals();

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/campaigns/orders/${orderId}`)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">
                Edit Order {order.order_number}
              </h1>
              <Badge className="bg-yellow-100 text-yellow-800">Editing</Badge>
            </div>
            <p className="text-slate-600">
              Make changes to this order. Changes will recalculate totals and update
              the order.
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || orderItems.length === 0}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Order Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="notes">Order Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this order..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="supplierEmail">Supplier Email (Optional)</Label>
              <Input
                id="supplierEmail"
                type="email"
                value={supplierEmail}
                onChange={(e) => setSupplierEmail(e.target.value)}
                placeholder="supplier@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Items ({orderItems.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddItem(!showAddItem)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add New Item Form */}
          {showAddItem && (
            <div className="mb-6 p-4 border rounded-lg bg-slate-50">
              <h3 className="font-semibold text-slate-900 mb-4">Add New Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Store</Label>
                  <Select value={newItemStoreId} onValueChange={setNewItemStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          #{store.store_number} - {store.store_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Campaign</Label>
                  <Select
                    value={newItemCampaignId}
                    onValueChange={setNewItemCampaignId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={handleAddNewItem} className="flex-1">
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddItem(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          {orderItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">
                No items in this order. Add items to continue.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item, index) => (
                    <TableRow key={item.id || index}>
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
                        <Input
                          type="number"
                          min="1"
                          value={item.approvedQuantity}
                          onChange={(e) =>
                            handleUpdateQuantity(index, e.target.value)
                          }
                          className="w-24 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(item.approvedQuantity * 0.25).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Totals */}
          {orderItems.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-600">Total Stores</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {totals.totalStores}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-600">
                    Total Quantity
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {totals.totalQuantity.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">pieces</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-600">
                    Estimated Cost
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    ${totals.estimatedCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">$0.25 per piece</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/campaigns/orders/${orderId}`)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || orderItems.length === 0}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
