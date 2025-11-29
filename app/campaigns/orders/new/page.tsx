"use client";

import { useState, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  FileText,
  AlertCircle,
  MapPin,
  Upload,
  Hand,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { GeographicBulkSelection } from "@/components/orders/geographic-bulk-selection";
import { CSVBulkUpload } from "@/components/orders/csv-bulk-upload";
import { StoreGroupSelection } from "@/components/orders/store-group-selection";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

interface Store {
  id: string;
  store_number: string;
  store_name?: string; // For compatibility with existing manual selection
  name?: string; // For compatibility with bulk selection
  city: string | null;
  state: string | null;
  region?: string | null;
  address?: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface OrderItem {
  id: string; // temporary ID for UI
  storeId: string;
  campaignId: string;
  quantity: number;
  notes?: string;
  confirmed?: boolean; // Track if user explicitly confirmed this item
}

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");

  // Pre-selected campaign from template workflow
  const [preSelectedCampaignId, setPreSelectedCampaignId] = useState<string | null>(null);
  const fromTemplate = searchParams?.get("fromTemplate") === "true";

  // Save as Group state
  const [showSaveGroupDialog, setShowSaveGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load stores and campaigns in parallel
      const [storesRes, campaignsRes] = await Promise.all([
        fetch("/api/retail/stores"),
        fetch("/api/campaigns"),
      ]);

      const storesData = await storesRes.json();
      const campaignsData = await campaignsRes.json();

      if (storesData.success && storesData.data) {
        setStores(storesData.data.stores || storesData.data);
      }

      if (campaignsData.success && campaignsData.data) {
        // Filter to active campaigns only
        const activeCampaigns = (campaignsData.data.campaigns || campaignsData.data).filter(
          (c: Campaign) => c.status === "active"
        );
        setCampaigns(activeCampaigns);

        // Check for pre-selected campaign from query parameter
        const campaignIdParam = searchParams?.get("campaignId");
        if (campaignIdParam) {
          const preSelectedCampaign = activeCampaigns.find(
            (c: Campaign) => c.id === campaignIdParam
          );
          if (preSelectedCampaign) {
            setPreSelectedCampaignId(campaignIdParam);
            console.log("[New Order] Pre-selected campaign:", preSelectedCampaign.name);

            if (fromTemplate) {
              toast.success(
                `Campaign "${preSelectedCampaign.name}" pre-selected. Add stores to create your order.`,
                { duration: 5000 }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("[New Order] Error loading data:", error);
      toast.error("Failed to load stores and campaigns");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      storeId: "",
      campaignId: preSelectedCampaignId || "", // Use pre-selected campaign if available
      quantity: 100, // Default quantity
      notes: fromTemplate ? "From template workflow" : "",
      confirmed: false, // Start in editing mode
    };
    setOrderItems([...orderItems, newItem]);
  };

  const removeItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setOrderItems(
      orderItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const confirmItem = (id: string) => {
    setOrderItems(
      orderItems.map((item) =>
        item.id === id ? { ...item, confirmed: true } : item
      )
    );
  };

  const editItem = (id: string) => {
    setOrderItems(
      orderItems.map((item) =>
        item.id === id ? { ...item, confirmed: false } : item
      )
    );
  };

  // Handle bulk store addition (from geographic or CSV)
  const handleBulkAddStores = (
    bulkStores: Store[],
    campaignId: string,
    quantity: number
  ) => {
    // Check for duplicates
    const existingKeys = new Set(
      orderItems.map((item) => `${item.storeId}-${item.campaignId}`)
    );

    const newItems: OrderItem[] = [];
    let duplicates = 0;

    bulkStores.forEach((store) => {
      const key = `${store.id}-${campaignId}`;
      if (existingKeys.has(key)) {
        duplicates++;
        return;
      }

      newItems.push({
        id: `temp-${Date.now()}-${store.id}`,
        storeId: store.id,
        campaignId,
        quantity,
        notes: "Added via bulk selection",
        confirmed: true, // Bulk items are pre-filled and confirmed
      });

      existingKeys.add(key);
    });

    if (newItems.length > 0) {
      setOrderItems([...orderItems, ...newItems]);
      toast.success(`Added ${newItems.length} stores to order`);
    }

    if (duplicates > 0) {
      toast.warning(`Skipped ${duplicates} duplicate store-campaign combinations`);
    }
  };

  const getSelectedStore = (storeId: string) => {
    return stores.find((s) => s.id === storeId);
  };

  const getSelectedCampaign = (campaignId: string) => {
    return campaigns.find((c) => c.id === campaignId);
  };

  const calculateTotals = () => {
    const totalStores = orderItems.filter(
      (item) => item.storeId && item.campaignId
    ).length;
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const estimatedCost = totalQuantity * 0.25;
    return { totalStores, totalQuantity, estimatedCost };
  };

  const validateOrder = (): string | null => {
    if (orderItems.length === 0) {
      return "Add at least one store to the order";
    }

    for (const item of orderItems) {
      if (!item.storeId) {
        return "Please select a store for all items";
      }
      if (!item.campaignId) {
        return "Please select a campaign for all items";
      }
      if (item.quantity <= 0) {
        return "Quantity must be greater than 0";
      }
    }

    // Check for duplicate store-campaign combinations
    const combinations = new Set<string>();
    for (const item of orderItems) {
      const key = `${item.storeId}-${item.campaignId}`;
      if (combinations.has(key)) {
        return "Cannot have duplicate store-campaign combinations";
      }
      combinations.add(key);
    }

    return null;
  };

  const handleSubmit = async () => {
    // Validation
    const error = validateOrder();
    if (error) {
      toast.error(error);
      return;
    }

    setCreating(true);
    try {
      // Prepare approvals data
      const approvals = orderItems.map((item) => ({
        storeId: item.storeId,
        campaignId: item.campaignId,
        recommendedQuantity: item.quantity,
        approvedQuantity: item.quantity,
        notes: item.notes || "Manually created order",
      }));

      // Create order
      const response = await fetch("/api/campaigns/orders/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvals,
          notes: orderNotes,
          supplierEmail: supplierEmail || undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const { orderId, orderNumber, totalStores, totalQuantity, estimatedCost, pdfUrl } =
          result.data;

        toast.success(
          `Order ${orderNumber} created! ${totalStores} stores, ${totalQuantity} pieces, $${estimatedCost.toFixed(
            2
          )}`,
          { duration: 5000 }
        );

        // Open PDF in new tab
        if (pdfUrl) {
          window.open(pdfUrl, "_blank");
        }

        // Redirect to order detail page
        router.push(`/campaigns/orders/${orderId}`);
      } else {
        throw new Error(result.error || "Failed to create order");
      }
    } catch (error) {
      console.error("[New Order] Error creating order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create order"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleSaveAsGroup = async () => {
    // Validation
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("No stores to save");
      return;
    }

    setSavingGroup(true);
    try {
      // Get unique store IDs
      const storeIds = [...new Set(orderItems.map((item) => item.storeId))];

      // Create group
      const createResponse = await fetch("/api/store-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDescription.trim() || undefined,
        }),
      });

      const createResult = await createResponse.json();

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create group");
      }

      const groupId = createResult.data.group.id;

      // Add stores to group
      const addStoresResponse = await fetch(`/api/store-groups/${groupId}/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeIds }),
      });

      const addStoresResult = await addStoresResponse.json();

      if (!addStoresResult.success) {
        throw new Error(addStoresResult.error || "Failed to add stores to group");
      }

      toast.success(`Store group "${groupName}" created with ${storeIds.length} stores`);
      setShowSaveGroupDialog(false);
      setGroupName("");
      setGroupDescription("");
    } catch (error) {
      console.error("[New Order] Error saving group:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save group");
    } finally {
      setSavingGroup(false);
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Breadcrumbs />

      {/* Header */}
      <div className="mb-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Create New Order
            </h1>
            <p className="text-slate-600 mt-1">
              Manually create a campaign order by selecting stores and campaigns
            </p>
          </div>
        </div>
      </div>

      {/* Pre-selected Campaign Banner */}
      {preSelectedCampaignId && fromTemplate && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900">
                  Campaign Pre-selected from Template
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  Campaign "{getSelectedCampaign(preSelectedCampaignId)?.name}" is pre-selected for this order.
                  All stores you add will use this campaign automatically.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreSelectedCampaignId(null)}
                className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      {stores.length === 0 || campaigns.length === 0 ? (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">
                  Missing Data
                </p>
                <p className="text-sm text-orange-800 mt-1">
                  {stores.length === 0 &&
                    "No stores found. Please add stores first. "}
                  {campaigns.length === 0 &&
                    "No active campaigns found. Please create a campaign first."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Order Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="notes">Order Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this order..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={3}
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Stores Section with Tabs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Stores to Order</CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Choose a method to add stores: individual, geographic bulk, CSV upload, or saved groups
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manual" className="gap-2">
                <Hand className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="geographic" className="gap-2">
                <MapPin className="h-4 w-4" />
                Geographic
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-2">
                <Upload className="h-4 w-4" />
                CSV Upload
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-2">
                <Users className="h-4 w-4" />
                Store Groups
              </TabsTrigger>
            </TabsList>

            {/* Manual Individual Selection */}
            <TabsContent value="manual" className="mt-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  Add stores one at a time with individual campaign and quantity settings
                </p>
                <Button
                  onClick={addItem}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={stores.length === 0 || campaigns.length === 0}
                >
                  <Plus className="h-4 w-4" />
                  Add Store
                </Button>
              </div>

              {orderItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">
                    No stores added yet. Use any tab above to add stores.
                  </p>
                  <Button
                    onClick={addItem}
                    className="gap-2"
                    disabled={stores.length === 0 || campaigns.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Add First Store
                  </Button>
                </div>
              ) : null}
            </TabsContent>

            {/* Geographic Bulk Selection */}
            <TabsContent value="geographic" className="mt-6">
              <GeographicBulkSelection
                campaigns={campaigns}
                onAddStores={handleBulkAddStores}
                defaultCampaignId={preSelectedCampaignId || undefined}
              />
            </TabsContent>

            {/* CSV Upload */}
            <TabsContent value="csv" className="mt-6">
              <CSVBulkUpload
                campaigns={campaigns}
                onAddStores={handleBulkAddStores}
                defaultCampaignId={preSelectedCampaignId || undefined}
              />
            </TabsContent>

            {/* Store Groups */}
            <TabsContent value="groups" className="mt-6">
              <StoreGroupSelection
                campaigns={campaigns}
                onAddStores={handleBulkAddStores}
                defaultCampaignId={preSelectedCampaignId || undefined}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Current Order Items (shown when items exist) */}
      {orderItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Order Items</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {orderItems.length} store{orderItems.length !== 1 ? "s" : ""} added
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveGroupDialog(true)}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  Save as Group
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrderItems([])}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {orderItems.map((item) => {
                const store = getSelectedStore(item.storeId);
                const campaign = getSelectedCampaign(item.campaignId);
                const storeName = store?.store_name || store?.name || "Unknown Store";
                const isEditing = !item.confirmed; // Show editing UI if not confirmed
                const isComplete = item.storeId && item.campaignId; // Check if all fields are filled

                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg bg-white"
                  >
                    {isEditing ? (
                      // EDITING MODE: Show select dropdowns for incomplete items
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Store Selection */}
                          <div>
                            <Label className="text-xs text-slate-600">Store</Label>
                            <Select
                              value={item.storeId}
                              onValueChange={(value) => updateItem(item.id, "storeId", value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select a store..." />
                              </SelectTrigger>
                              <SelectContent>
                                {stores.map((store) => {
                                  const displayName = store.store_name || store.name || "Unnamed";
                                  return (
                                    <SelectItem key={store.id} value={store.id}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          #{store.store_number} - {displayName}
                                        </span>
                                        {(store.city || store.state) && (
                                          <span className="text-xs text-slate-500">
                                            {store.city}{store.city && store.state ? ", " : ""}{store.state}
                                          </span>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Campaign Selection */}
                          <div>
                            <Label className="text-xs text-slate-600">Campaign</Label>
                            <Select
                              value={item.campaignId}
                              onValueChange={(value) => updateItem(item.id, "campaignId", value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select a campaign..." />
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
                        </div>

                        <div className="space-y-3">
                          {/* Quantity Input */}
                          <div>
                            <Label className="text-xs text-slate-600">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.id, "quantity", parseInt(e.target.value) || 100)
                              }
                              className="mt-1"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => confirmItem(item.id)}
                              disabled={!isComplete}
                              className="gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="h-4 w-4" />
                              Add to Order
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // DISPLAY MODE: Show formatted info for complete items
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            #{store?.store_number} - {storeName}
                          </p>
                          <p className="text-sm text-slate-600">
                            {store?.city}, {store?.state} • {campaign?.name} • {item.quantity}{" "}
                            pieces • ${(item.quantity * 0.25).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => editItem(item.id)}
                            className="gap-2"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Stores</p>
              <p className="text-2xl font-bold text-slate-900">
                {totals.totalStores}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Quantity
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {totals.totalQuantity.toLocaleString()} pieces
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">
                Estimated Cost
              </p>
              <p className="text-2xl font-bold text-slate-900">
                ${totals.estimatedCost.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                $0.25 per piece
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push("/campaigns/orders")}
          disabled={creating}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={creating || orderItems.length === 0}
          className="gap-2"
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Generate Order & PDF
            </>
          )}
        </Button>
      </div>

      {/* Save as Group Dialog */}
      <Dialog open={showSaveGroupDialog} onOpenChange={setShowSaveGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Store Group</DialogTitle>
            <DialogDescription>
              Save the current store selection as a group for quick reuse in future orders
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                placeholder="e.g., Top 50 Performers, Metro Stores"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="group-description">Description (Optional)</Label>
              <Textarea
                id="group-description"
                placeholder="Brief description of this group..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {[...new Set(orderItems.map((item) => item.storeId))].length} unique store
                {[...new Set(orderItems.map((item) => item.storeId))].length !== 1 ? "s" : ""} will be saved to this group
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveGroupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsGroup} disabled={savingGroup} className="gap-2">
              {savingGroup ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Save Group
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>}>
      <NewOrderContent />
    </Suspense>
  );
}
