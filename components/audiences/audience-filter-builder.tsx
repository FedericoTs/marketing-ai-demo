"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Users,
  DollarSign,
  Heart,
  X,
  Plus,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Save,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AudienceFilters, AudienceCountResponse } from "@/lib/audience";
import { toast } from "sonner";
import { PurchaseModal } from "./purchase-modal";

interface AudienceFilterBuilderProps {
  mode: "standalone" | "campaign";
  initialFilters?: AudienceFilters;
  organizationId?: string;
  userId?: string;
  onSave?: (data: { name: string; description?: string; filters: AudienceFilters }) => void;
  onPurchase?: (filters: AudienceFilters, count: number) => void;
}

type FilterCategory = "geography" | "demographics" | "financial" | "lifestyle";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

/**
 * Audience Filter Builder - Three-Panel Layout
 *
 * World-class UX following Facebook Ads Manager pattern:
 * - LEFT: Filter categories (expandable sections)
 * - CENTER: Active filters + controls
 * - RIGHT: Live preview (count + cost)
 */
export function AudienceFilterBuilder({
  mode,
  initialFilters = {},
  organizationId,
  userId,
  onSave,
  onPurchase,
}: AudienceFilterBuilderProps) {
  const [filters, setFilters] = useState<AudienceFilters>(initialFilters);
  const [expandedCategories, setExpandedCategories] = useState<Set<FilterCategory>>(
    new Set(["geography"])
  );
  const [countData, setCountData] = useState<AudienceCountResponse | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-admin');
        if (response.ok) {
          const data = await response.json();
          console.log('[Frontend] Admin check response:', data);
          setIsAdmin(data.isAdmin || false);
        } else {
          console.error('[Frontend] Admin check failed with status:', response.status);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('[Frontend] Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  // Debounced count fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCount();
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timer);
  }, [filters]);

  const fetchCount = async () => {
    // Only fetch if at least one filter is set
    const hasFilters = Object.keys(filters).length > 0;
    if (!hasFilters) {
      setCountData(null);
      return;
    }

    setIsLoadingCount(true);
    try {
      const response = await fetch('/api/audience/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCountData(data);
    } catch (error) {
      console.error("Failed to fetch count:", error);
      // Set null on error to show empty state
      setCountData(null);
    } finally {
      setIsLoadingCount(false);
    }
  };

  const toggleCategory = (category: FilterCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const updateFilter = (key: keyof AudienceFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const removeFilter = (key: keyof AudienceFilters) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setCountData(null);
  };

  const getQualityIndicator = () => {
    if (!countData) return null;

    const { count } = countData;
    if (count > 1000000) {
      return { status: "warning", message: "Too broad - Consider narrowing", icon: TrendingDown, color: "text-orange-600" };
    } else if (count < 1000) {
      return { status: "warning", message: "Too narrow - Widen your criteria", icon: TrendingUp, color: "text-orange-600" };
    } else {
      return { status: "good", message: "Good targeting balance", icon: CheckCircle, color: "text-green-600" };
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleSave = async () => {
    if (!saveName.trim()) {
      toast.error("Please enter an audience name");
      return;
    }

    // Check if organizationId and userId are available
    if (!organizationId || !userId) {
      toast.error("Missing user or organization information. Please log in.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/audience/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          userId,
          name: saveName,
          description: saveDescription || undefined,
          filters,
          lastCount: countData?.count,
          lastEstimatedCost: countData?.estimatedCost,
          lastUserCharge: countData?.userCharge,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save audience');
      }

      const data = await response.json();

      // Success!
      toast.success("Audience saved successfully!");

      // Call the onSave callback if provided
      onSave?.({
        name: saveName,
        description: saveDescription,
        filters,
      });

      // Reset form
      setShowSaveForm(false);
      setSaveName("");
      setSaveDescription("");

    } catch (error: any) {
      console.error("Failed to save audience:", error);
      toast.error(error.message || "Failed to save audience");
    } finally {
      setIsSaving(false);
    }
  };

  const qualityIndicator = getQualityIndicator();
  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* LEFT PANEL: Filter Categories */}
      <div className="col-span-3 space-y-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Filter Categories</h3>
            {activeFilterCount > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                {activeFilterCount}
              </span>
            )}
          </div>

          {/* Category: Geography */}
          <FilterCategory
            icon={MapPin}
            title="Geography"
            isExpanded={expandedCategories.has("geography")}
            onToggle={() => toggleCategory("geography")}
            count={[filters.state, filters.city, filters.zip].filter(Boolean).length}
          />

          {/* Category: Demographics */}
          <FilterCategory
            icon={Users}
            title="Demographics"
            isExpanded={expandedCategories.has("demographics")}
            onToggle={() => toggleCategory("demographics")}
            count={
              [filters.ageMin, filters.ageMax, filters.gender, filters.maritalStatus].filter(
                Boolean
              ).length
            }
          />

          {/* Category: Financial */}
          <FilterCategory
            icon={DollarSign}
            title="Financial"
            isExpanded={expandedCategories.has("financial")}
            onToggle={() => toggleCategory("financial")}
            count={
              [
                filters.incomeMin,
                filters.incomeMax,
                filters.homeowner,
                filters.homeValueMin,
              ].filter((v) => v !== undefined).length
            }
          />

          {/* Category: Lifestyle */}
          <FilterCategory
            icon={Heart}
            title="Lifestyle"
            isExpanded={expandedCategories.has("lifestyle")}
            onToggle={() => toggleCategory("lifestyle")}
            count={(filters.interests?.length || 0) + (filters.behaviors?.length || 0)}
          />

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full text-slate-600 hover:text-red-600"
              onClick={clearAllFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Clear All Filters
            </Button>
          )}
        </div>

        {/* AI Recommendations */}
        <Button
          variant="outline"
          className="w-full border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
        >
          <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
          <span className="text-purple-700">AI Recommendations</span>
        </Button>
      </div>

      {/* CENTER PANEL: Filter Controls */}
      <div className="col-span-6 space-y-4">
        <Card className="p-6">
          {expandedCategories.size === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Plus className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">Start Building</h3>
              <p className="text-sm text-slate-600">
                Select a category on the left to begin adding filters
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Geography Filters */}
              {expandedCategories.has("geography") && (
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Geography
                  </h4>

                  <div className="grid gap-4">
                    <div>
                      <Label>State</Label>
                      <Select
                        value={filters.state || ""}
                        onValueChange={(value) => updateFilter("state", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>City</Label>
                      <Input
                        placeholder="e.g., San Francisco"
                        value={filters.city || ""}
                        onChange={(e) => updateFilter("city", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>ZIP Code</Label>
                      <Input
                        placeholder="e.g., 94105"
                        value={filters.zip || ""}
                        onChange={(e) => updateFilter("zip", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Demographics Filters */}
              {expandedCategories.has("demographics") && (
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Users className="h-5 w-5 text-green-600" />
                    Demographics
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Age</Label>
                      <Input
                        type="number"
                        placeholder="18"
                        min="18"
                        max="100"
                        value={filters.ageMin || ""}
                        onChange={(e) => updateFilter("ageMin", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max Age</Label>
                      <Input
                        type="number"
                        placeholder="100"
                        min="18"
                        max="100"
                        value={filters.ageMax || ""}
                        onChange={(e) => updateFilter("ageMax", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={filters.gender || ""}
                      onValueChange={(value) => updateFilter("gender", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="U">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Marital Status</Label>
                    <Select
                      value={filters.maritalStatus || ""}
                      onValueChange={(value) => updateFilter("maritalStatus", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">Single</SelectItem>
                        <SelectItem value="M">Married</SelectItem>
                        <SelectItem value="D">Divorced</SelectItem>
                        <SelectItem value="W">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Financial Filters */}
              {expandedCategories.has("financial") && (
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    Financial
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Income</Label>
                      <Input
                        type="number"
                        placeholder="$0"
                        step="10000"
                        value={filters.incomeMin || ""}
                        onChange={(e) => updateFilter("incomeMin", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max Income</Label>
                      <Input
                        type="number"
                        placeholder="$1,000,000"
                        step="10000"
                        value={filters.incomeMax || ""}
                        onChange={(e) => updateFilter("incomeMax", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Homeowner Status</Label>
                    <Select
                      value={
                        filters.homeowner === undefined
                          ? ""
                          : filters.homeowner
                          ? "true"
                          : "false"
                      }
                      onValueChange={(value) =>
                        updateFilter("homeowner", value === "true" ? true : value === "false" ? false : undefined)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Homeowner</SelectItem>
                        <SelectItem value="false">Renter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Home Value</Label>
                      <Input
                        type="number"
                        placeholder="$0"
                        step="50000"
                        value={filters.homeValueMin || ""}
                        onChange={(e) => updateFilter("homeValueMin", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Max Home Value</Label>
                      <Input
                        type="number"
                        placeholder="$10,000,000"
                        step="50000"
                        value={filters.homeValueMax || ""}
                        onChange={(e) => updateFilter("homeValueMax", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Lifestyle Filters */}
              {expandedCategories.has("lifestyle") && (
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Heart className="h-5 w-5 text-purple-600" />
                    Lifestyle
                  </h4>

                  <div>
                    <Label>Interests</Label>
                    <Input
                      placeholder="e.g., golf, travel, investing (comma-separated)"
                      value={filters.interests?.join(", ") || ""}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        // Only split if user has typed a comma, otherwise keep as single value
                        const values = rawValue.includes(",")
                          ? rawValue.split(",").map((s) => s.trim()).filter(Boolean)
                          : rawValue.trim() ? [rawValue.trim()] : [];
                        updateFilter("interests", values.length > 0 ? values : undefined);
                      }}
                    />
                  </div>

                  <div>
                    <Label>Behaviors</Label>
                    <Input
                      placeholder="e.g., luxury_shopper, technology_enthusiast"
                      value={filters.behaviors?.join(", ") || ""}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        // Only split if user has typed a comma, otherwise keep as single value
                        const values = rawValue.includes(",")
                          ? rawValue.split(",").map((s) => s.trim()).filter(Boolean)
                          : rawValue.trim() ? [rawValue.trim()] : [];
                        updateFilter("behaviors", values.length > 0 ? values : undefined);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* RIGHT PANEL: Live Preview */}
      <div className="col-span-3 space-y-4">
        {/* Count Preview */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Audience Size</h3>
            {isLoadingCount && <Loader2 className="h-4 w-4 animate-spin text-purple-600" />}
          </div>

          {countData ? (
            <>
              <div className="mb-4">
                <div className="text-4xl font-bold text-slate-900">
                  {formatNumber(countData.count)}
                </div>
                <div className="text-sm text-slate-600">contacts match your filters</div>
              </div>

              {/* Quality Indicator */}
              {qualityIndicator && (
                <div
                  className={cn(
                    "mb-4 flex items-center gap-2 rounded-lg p-3",
                    qualityIndicator.status === "good" ? "bg-green-50" : "bg-orange-50"
                  )}
                >
                  <qualityIndicator.icon className={cn("h-5 w-5", qualityIndicator.color)} />
                  <span className={cn("text-sm font-medium", qualityIndicator.color)}>
                    {qualityIndicator.message}
                  </span>
                </div>
              )}

              {/* Cost Calculator */}
              <div className="space-y-3 border-t border-purple-100 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">Cost Breakdown</h4>
                  {/* DEBUG: Show admin status */}
                  <span className={cn("text-xs px-2 py-1 rounded", isAdmin ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600")}>
                    {isAdmin ? "Admin Mode" : "User Mode"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Per Contact</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(countData.userCostPerContact)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total ({formatNumber(countData.count)})</span>
                  <span className="text-lg font-bold text-purple-700">
                    {formatCurrency(countData.userCharge)}
                  </span>
                </div>

                {/* Admin-only: Margin display */}
                {isAdmin && (
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-green-900">Your Margin</span>
                      <span className="font-bold text-green-700">
                        {formatCurrency(countData.margin)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                Add filters to see<br />audience size & cost
              </p>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        {countData && (
          <div className="space-y-2">
            {mode === "standalone" && !showSaveForm && (
              <>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  onClick={() => setShowPurchaseModal(true)}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Purchase Contacts
                </Button>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  size="lg"
                  onClick={() => setShowSaveForm(true)}
                >
                  <Save className="mr-2 h-5 w-5" />
                  Save Audience
                </Button>
              </>
            )}

            {mode === "campaign" && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={() => onPurchase?.(filters, countData.count)}
              >
                <DollarSign className="mr-2 h-5 w-5" />
                Purchase Contacts
              </Button>
            )}
          </div>
        )}

        {/* Save Form */}
        {showSaveForm && (
          <Card className="p-4">
            <h4 className="mb-3 font-semibold text-slate-900">Save Audience</h4>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input
                  placeholder="e.g., Affluent Seniors - CA"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Optional"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSaveForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleSave}
                  disabled={!saveName.trim() || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Purchase Modal */}
      {countData && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          contactCount={countData.count}
          costPerContact={countData.userCostPerContact}
          totalCost={countData.userCharge}
          margin={countData.margin}
          filters={filters}
          audienceName={saveName || `Audience - ${new Date().toLocaleDateString()}`}
        />
      )}
    </div>
  );
}

// Helper component for filter category buttons
function FilterCategory({
  icon: Icon,
  title,
  isExpanded,
  onToggle,
  count,
}: {
  icon: any;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "mb-2 flex w-full items-center justify-between rounded-lg p-3 text-left transition-all",
        isExpanded
          ? "bg-purple-100 text-purple-900"
          : "hover:bg-slate-50 text-slate-700"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", isExpanded ? "text-purple-600" : "text-slate-400")} />
        <span className="font-medium">{title}</span>
      </div>
      {count > 0 && (
        <span className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold",
          isExpanded ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-700"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
