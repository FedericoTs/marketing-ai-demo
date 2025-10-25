"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Package, Eye, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Store {
  id: string;
  store_number: string;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface StoreGroup {
  id: string;
  name: string;
  description: string | null;
  store_count: number;
}

interface StoreGroupWithStores extends StoreGroup {
  stores: Store[];
}

interface StoreGroupSelectionProps {
  campaigns: Campaign[];
  onAddStores: (stores: Store[], campaignId: string, quantity: number) => void;
  defaultCampaignId?: string;
}

export function StoreGroupSelection({ campaigns, onAddStores, defaultCampaignId }: StoreGroupSelectionProps) {
  const [groups, setGroups] = useState<StoreGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<StoreGroupWithStores | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(defaultCampaignId || "");
  const [quantity, setQuantity] = useState<string>("100");

  const [loading, setLoading] = useState<boolean>(true);
  const [loadingGroup, setLoadingGroup] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Load group details when selection changes
  useEffect(() => {
    if (selectedGroupId) {
      loadGroupDetails(selectedGroupId);
    } else {
      setSelectedGroup(null);
    }
  }, [selectedGroupId]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/store-groups");
      const result = await response.json();

      if (result.success && result.data) {
        setGroups(result.data.groups || []);
      } else {
        throw new Error(result.error || "Failed to load store groups");
      }
    } catch (error) {
      console.error("Error loading store groups:", error);
      toast.error("Failed to load store groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (groupId: string) => {
    setLoadingGroup(true);
    try {
      const response = await fetch(`/api/store-groups/${groupId}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSelectedGroup(result.data.group);
      } else {
        throw new Error(result.error || "Failed to load group details");
      }
    } catch (error) {
      console.error("Error loading group details:", error);
      toast.error("Failed to load group details");
      setSelectedGroup(null);
    } finally {
      setLoadingGroup(false);
    }
  };

  const handleAddStores = () => {
    // Validation
    if (!selectedGroup) {
      toast.error("Please select a store group");
      return;
    }

    if (selectedGroup.stores.length === 0) {
      toast.error("This group has no stores");
      return;
    }

    if (!selectedCampaignId) {
      toast.error("Please select a campaign");
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    // Add stores
    onAddStores(selectedGroup.stores, selectedCampaignId, quantityNum);

    // Close preview if open
    setShowPreview(false);

    // Reset selection
    setSelectedGroupId("");
    setSelectedCampaignId("");
    setQuantity("100");

    toast.success(`Added ${selectedGroup.stores.length} stores from "${selectedGroup.name}" to order`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Store Group Selection
        </CardTitle>
        <CardDescription>
          Select a saved store group to quickly add all its stores to your order with the same
          campaign and quantity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : groups.length === 0 ? (
          // Empty state
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              No store groups yet. Create a group to save frequently-used store selections.
            </p>
            <Link href="/store-groups">
              <Button className="gap-2">
                <Users className="h-4 w-4" />
                Manage Store Groups
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Group Selection */}
            <div className="space-y-2">
              <Label>Select Store Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a store group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.store_count} store{group.store_count !== 1 ? "s" : ""})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Group Info */}
            {loadingGroup ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : selectedGroup ? (
              <>
                <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {selectedGroup.name}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedGroup.store_count} store{selectedGroup.store_count !== 1 ? "s" : ""} in this
                      group
                      {selectedGroup.description && ` • ${selectedGroup.description}`}
                    </p>
                  </div>
                </div>

                {selectedGroup.stores.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        This group has no stores
                      </p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Add stores to this group from the Store Groups page
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Campaign and Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Campaign Selection */}
                      <div className="space-y-2">
                        <Label>Campaign</Label>
                        <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
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

                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label>Quantity per store</Label>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowPreview(true)}
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview Stores
                      </Button>

                      <Button
                        onClick={handleAddStores}
                        disabled={!selectedCampaignId || selectedGroup.stores.length === 0}
                        className="gap-2"
                      >
                        <Package className="h-4 w-4" />
                        Add {selectedGroup.store_count} Store{selectedGroup.store_count !== 1 ? "s" : ""}{" "}
                        to Order
                      </Button>
                    </div>
                  </>
                )}
              </>
            ) : null}

            {/* Preview Modal */}
            {selectedGroup && (
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Preview: {selectedGroup.name}</DialogTitle>
                    <DialogDescription>
                      Review the stores in this group before adding them to the order
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedGroup.stores.map((store) => (
                      <div
                        key={store.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div>
                          <p className="font-medium">
                            #{store.store_number} - {store.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {store.city}, {store.state} • {store.region}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPreview(false)}>
                      Close
                    </Button>
                    <Button
                      onClick={handleAddStores}
                      disabled={!selectedCampaignId}
                      className="gap-2"
                    >
                      <Package className="h-4 w-4" />
                      Add {selectedGroup.store_count} Stores
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
