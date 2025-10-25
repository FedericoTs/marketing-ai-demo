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
import { MapPin, Package, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Store {
  id: string;
  store_number: string;
  name: string;
  city: string | null;
  state: string | null;
  region: string | null;
  address: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface GeographicBulkSelectionProps {
  campaigns: Campaign[];
  onAddStores: (stores: Store[], campaignId: string, quantity: number) => void;
  defaultCampaignId?: string;
}

export function GeographicBulkSelection({
  campaigns,
  onAddStores,
  defaultCampaignId,
}: GeographicBulkSelectionProps) {
  // Filter state
  const [region, setRegion] = useState<string>("all");
  const [state, setState] = useState<string>("all");
  const [city, setCity] = useState<string>("all");

  // Options state
  const [regions, setRegions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Campaign and quantity
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(defaultCampaignId || "");
  const [quantity, setQuantity] = useState<string>("100");

  // Stores state
  const [matchingStores, setMatchingStores] = useState<Store[]>([]);
  const [storeCount, setStoreCount] = useState<number>(0);
  const [loadingStores, setLoadingStores] = useState<boolean>(false);

  // Preview modal
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Load initial filters on mount
  useEffect(() => {
    loadFilters();
  }, []);

  // Load stores when filters change
  useEffect(() => {
    loadMatchingStores();
  }, [region, state, city]);

  // Load cascading filter options
  const loadFilters = async () => {
    try {
      const response = await fetch("/api/campaigns/orders/bulk-stores/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, state }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setRegions(result.data.regions || []);
        setStates(result.data.states || []);
        setCities(result.data.cities || []);
      }
    } catch (error) {
      console.error("Error loading filters:", error);
      toast.error("Failed to load filter options");
    }
  };

  // Load matching stores based on filters
  const loadMatchingStores = async () => {
    setLoadingStores(true);

    try {
      const params = new URLSearchParams({
        region,
        state,
        city,
        isActive: "true",
      });

      const response = await fetch(`/api/campaigns/orders/bulk-stores?${params}`);
      const result = await response.json();

      if (result.success && result.data) {
        setMatchingStores(result.data.stores || []);
        setStoreCount(result.data.count || 0);
      } else {
        throw new Error(result.error || "Failed to load stores");
      }
    } catch (error) {
      console.error("Error loading stores:", error);
      toast.error("Failed to load matching stores");
      setMatchingStores([]);
      setStoreCount(0);
    } finally {
      setLoadingStores(false);
    }
  };

  // Handle region change (reset state and city)
  const handleRegionChange = (value: string) => {
    setRegion(value);
    setState("all");
    setCity("all");
    // Reload filters with new region
    setTimeout(() => loadFilters(), 100);
  };

  // Handle state change (reset city)
  const handleStateChange = (value: string) => {
    setState(value);
    setCity("all");
    // Reload filters with new state
    setTimeout(() => loadFilters(), 100);
  };

  // Handle add stores
  const handleAddStores = () => {
    // Validation
    if (matchingStores.length === 0) {
      toast.error("No stores match the selected filters");
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
    onAddStores(matchingStores, selectedCampaignId, quantityNum);

    // Close preview if open
    setShowPreview(false);

    // Reset form
    setRegion("all");
    setState("all");
    setCity("all");
    setSelectedCampaignId("");
    setQuantity("100");

    toast.success(`Added ${matchingStores.length} stores to order`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Geographic Bulk Selection
        </CardTitle>
        <CardDescription>
          Select stores by region, state, and city. Apply the same campaign and quantity to all
          matching stores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Geographic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Region */}
          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={region} onValueChange={handleRegionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State */}
          <div className="space-y-2">
            <Label>State</Label>
            <Select value={state} onValueChange={handleStateChange} disabled={region === "all"}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label>City</Label>
            <Select value={city} onValueChange={setCity} disabled={state === "all"}>
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Matching Stores Count */}
        <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">
              {loadingStores ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading stores...
                </span>
              ) : (
                <span>{storeCount} stores match your filters</span>
              )}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {region !== "all" && `Region: ${region}`}
              {state !== "all" && ` • State: ${state}`}
              {city !== "all" && ` • City: ${city}`}
              {region === "all" && state === "all" && city === "all" && "All active stores"}
            </p>
          </div>
        </div>

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
            disabled={storeCount === 0 || loadingStores}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview Stores
          </Button>

          <Button
            onClick={handleAddStores}
            disabled={storeCount === 0 || !selectedCampaignId || loadingStores}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Add {storeCount} Store{storeCount !== 1 ? "s" : ""} to Order
          </Button>
        </div>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Matching Stores ({storeCount})</DialogTitle>
              <DialogDescription>
                Review the stores that match your geographic filters before adding them to the
                order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {matchingStores.slice(0, 100).map((store) => (
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

              {matchingStores.length > 100 && (
                <div className="p-3 text-center text-sm text-gray-600 dark:text-gray-400">
                  + {matchingStores.length - 100} more stores...
                </div>
              )}
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
                Add {storeCount} Stores
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
