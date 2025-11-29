"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Eye, TrendingUp, Calendar, Loader2, ChevronRight, Search, Filter, MoreVertical, Play, Pause, CheckCircle, Copy, Trash2, Download, Bookmark, Square, CheckSquare, Archive, ExternalLink, Target } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { CampaignStoreStats } from "@/components/analytics/campaign-store-stats";

interface Campaign {
  id: string;
  name: string;
  message: string;
  company_name: string;
  created_at: string;
  status: "active" | "paused" | "completed";
  totalRecipients: number;
  uniqueVisitors: number;
  totalConversions: number;
  conversionRate: number;
  templateThumbnail?: string | null;
}

type StatusFilter = "all" | "active" | "paused" | "completed";
type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "performance-desc";

export function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [loadingLandingPages, setLoadingLandingPages] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await fetch("/api/analytics/campaigns");
      const result = await response.json();

      if (result.success) {
        setCampaigns(result.data);
      }
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "active" | "paused" | "completed") => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        await loadCampaigns(); // Reload campaigns
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update campaign status");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/campaigns/${id}/duplicate`, {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        await loadCampaigns(); // Reload campaigns
      } else {
        toast.error(result.error || "Failed to duplicate campaign");
      }
    } catch (error) {
      console.error("Error duplicating campaign:", error);
      toast.error("Failed to duplicate campaign");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?\n\nThis will permanently delete the campaign and all associated data (recipients, events, conversions). This action cannot be undone.`
    );

    if (!confirmed) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        await loadCampaigns(); // Reload campaigns
      } else {
        toast.error(result.error || "Failed to delete campaign");
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveAsTemplate = async (campaign: Campaign) => {
    const templateName = window.prompt(
      `Save "${campaign.name}" as a template.\n\nEnter template name:`,
      `${campaign.name} Template`
    );

    if (!templateName) return;

    const templateDescription = window.prompt(
      "Enter template description (optional):",
      `Based on successful ${campaign.name} campaign`
    );

    const category = window.prompt(
      "Enter category (general, retail, seasonal, promotional):",
      "general"
    ) as "general" | "retail" | "seasonal" | "promotional" | null;

    if (!category || !["general", "retail", "seasonal", "promotional"].includes(category)) {
      toast.error("Invalid category. Template not saved.");
      return;
    }

    setProcessingId(campaign.id);
    try {
      const response = await fetch("/api/campaigns/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription || null,
          category,
          templateData: {
            message: campaign.message,
            targetAudience: "General audience",
            tone: "Professional",
          },
          campaignId: campaign.id, // For asset copying
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Campaign saved as template! View it in the Templates tab.");
      } else {
        toast.error(result.error || "Failed to save template");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save campaign as template");
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/analytics/campaigns/export");

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : "all_campaigns.csv";

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Campaigns exported successfully");
    } catch (error) {
      console.error("Error exporting campaigns:", error);
      toast.error("Failed to export campaigns");
    } finally {
      setExporting(false);
    }
  };

  const toggleCampaignSelection = (id: string) => {
    setSelectedCampaigns((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCampaigns.length === filteredAndSortedCampaigns.length) {
      setSelectedCampaigns([]);
    } else {
      setSelectedCampaigns(filteredAndSortedCampaigns.map((c) => c.id));
    }
  };

  const handleViewLandingPages = async (campaignId: string) => {
    setLoadingLandingPages(campaignId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/landing-pages`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        // Open first landing page in preview mode (no tracking)
        const firstPage = result.data[0];
        window.open(`/lp/${firstPage.tracking_code}?preview=true`, '_blank');
        toast.success(`Found ${result.data.length} landing page${result.data.length !== 1 ? 's' : ''} for this campaign`);
      } else {
        toast.info("No landing pages found for this campaign");
      }
    } catch (error) {
      console.error("Error loading landing pages:", error);
      toast.error("Failed to load landing pages");
    } finally {
      setLoadingLandingPages(null);
    }
  };

  const handleBulkAction = async (action: "activate" | "pause" | "archive" | "delete") => {
    if (selectedCampaigns.length === 0) {
      toast.error("Please select campaigns first");
      return;
    }

    const actionNames = {
      activate: "activate",
      pause: "pause",
      archive: "archive",
      delete: "delete",
    };

    if (action === "delete") {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedCampaigns.length} campaign(s)?\n\nThis will permanently delete all associated data. This action cannot be undone.`
      );
      if (!confirmed) return;
    }

    setBulkProcessing(true);
    try {
      const response = await fetch("/api/campaigns/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          campaignIds: selectedCampaigns,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || `${selectedCampaigns.length} campaign(s) ${actionNames[action]}d`);
        setSelectedCampaigns([]);
        await loadCampaigns();
      } else {
        toast.error(result.error || "Failed to perform bulk action");
      }
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = [...campaigns];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (campaign) =>
          campaign.name.toLowerCase().includes(query) ||
          campaign.company_name.toLowerCase().includes(query) ||
          campaign.message.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((campaign) => campaign.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "performance-desc":
          return b.conversionRate - a.conversionRate;
        default:
          return 0;
      }
    });

    return filtered;
  }, [campaigns, searchQuery, statusFilter, sortOption]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading campaigns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Campaigns Yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first direct mail campaign to start tracking analytics.
            </p>
            <Link href="/dm-creative">
              <Button>Create Campaign</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "completed":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Bulk Actions Toolbar */}
      {selectedCampaigns.length > 0 && (
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-900">
                  {selectedCampaigns.length} campaign{selectedCampaigns.length !== 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCampaigns([])}
                  className="h-8"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("activate")}
                  disabled={bulkProcessing}
                  className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                >
                  {bulkProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Activate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("pause")}
                  disabled={bulkProcessing}
                  className="gap-2 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                >
                  {bulkProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                  Pause
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("archive")}
                  disabled={bulkProcessing}
                  className="gap-2 text-slate-700 border-slate-300 hover:bg-slate-50"
                >
                  {bulkProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                  Archive
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction("delete")}
                  disabled={bulkProcessing}
                  className="gap-2 text-red-700 border-red-300 hover:bg-red-50"
                >
                  {bulkProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search campaigns by name, company, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Options */}
            <div className="w-full md:w-56">
              <Select
                value={sortOption}
                onValueChange={(value) => setSortOption(value as SortOption)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="performance-desc">Best Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count, Select All, and Export Button */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{filteredAndSortedCampaigns.length}</span>{" "}
                of <span className="font-semibold text-slate-900">{campaigns.length}</span> campaigns
              </div>
              {filteredAndSortedCampaigns.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="gap-2 h-8"
                >
                  {selectedCampaigns.length === filteredAndSortedCampaigns.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {selectedCampaigns.length === filteredAndSortedCampaigns.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            {campaigns.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                disabled={exporting}
                className="gap-2"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No Results Message */}
      {filteredAndSortedCampaigns.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Campaigns Found</h3>
              <p className="text-slate-600 mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSortOption("date-desc");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns List */}
      {filteredAndSortedCampaigns.map((campaign) => {
        const isSelected = selectedCampaigns.includes(campaign.id);

        return (
        <Card key={campaign.id} className={`overflow-hidden border-slate-200 hover:border-slate-300 hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="flex flex-col md:flex-row">
            {/* Left: Template Preview */}
            <div className="relative md:w-64 lg:w-80 h-48 md:h-auto bg-gradient-to-br from-slate-100 to-slate-200 flex-shrink-0">
              {campaign.templateThumbnail ? (
                <>
                  <img
                    src={campaign.templateThumbnail}
                    alt="Campaign template"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">No Template</p>
                  </div>
                </div>
              )}

              {/* Selection Checkbox - Overlay on image */}
              <button
                onClick={() => toggleCampaignSelection(campaign.id)}
                className="absolute top-3 left-3 p-1.5 bg-white/90 backdrop-blur-sm hover:bg-white rounded-lg shadow-sm transition-all"
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Square className="h-5 w-5 text-slate-600" />
                )}
              </button>

              {/* Status Badge - Overlay on image */}
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm backdrop-blur-sm ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>
            </div>

            {/* Right: Content */}
            <div className="flex-1 p-6 flex flex-col">
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{campaign.name}</h3>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span className="font-medium">{campaign.company_name}</span>
                </div>
              </div>

              {/* Stats Grid - 2x2 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Recipients */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{campaign.totalRecipients}</p>
                  <p className="text-xs text-slate-600">Recipients</p>
                </div>
              </div>

                {/* Visitors */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{campaign.uniqueVisitors}</p>
                    <p className="text-xs text-slate-600">Visitors</p>
                  </div>
                </div>

                {/* Conversions */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{campaign.totalConversions}</p>
                    <p className="text-xs text-slate-600">Conversions</p>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-green-600">{campaign.conversionRate}%</p>
                    <p className="text-xs text-slate-600">Conv. Rate</p>
                  </div>
                </div>
              </div>

              {/* Campaign Message Preview */}
              {campaign.message && (
                <div className="mb-4">
                  <p className="text-sm text-slate-600 line-clamp-2">{campaign.message}</p>
                </div>
              )}

              {/* PHASE 8C: Store Deployment Analytics */}
              <div className="mb-4">
                <CampaignStoreStats campaignId={campaign.id} />
              </div>

              {/* Action Buttons */}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
              {/* Status Change Buttons */}
              {campaign.status === "paused" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(campaign.id, "active")}
                  disabled={processingId === campaign.id}
                  className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                >
                  {processingId === campaign.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Activate
                </Button>
              )}

              {campaign.status === "active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(campaign.id, "paused")}
                  disabled={processingId === campaign.id}
                  className="gap-2 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                >
                  {processingId === campaign.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                  Pause
                </Button>
              )}

              {campaign.status !== "completed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(campaign.id, "completed")}
                  disabled={processingId === campaign.id}
                  className="gap-2 text-slate-700 border-slate-300 hover:bg-slate-50"
                >
                  {processingId === campaign.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                  Mark Complete
                </Button>
              )}

              {/* Duplicate Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDuplicate(campaign.id, campaign.name)}
                disabled={processingId === campaign.id}
                className="gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                {processingId === campaign.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Duplicate
              </Button>

              {/* Save as Template Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveAsTemplate(campaign)}
                disabled={processingId === campaign.id}
                className="gap-2 text-purple-700 border-purple-300 hover:bg-purple-50"
              >
                {processingId === campaign.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
                Save as Template
              </Button>

              {/* View Landing Pages Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewLandingPages(campaign.id)}
                disabled={loadingLandingPages === campaign.id}
                className="gap-2 text-cyan-700 border-cyan-300 hover:bg-cyan-50"
              >
                {loadingLandingPages === campaign.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                View Landing Page
              </Button>

              {/* Delete Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(campaign.id, campaign.name)}
                disabled={processingId === campaign.id}
                className="gap-2 text-red-700 border-red-300 hover:bg-red-50"
              >
                {processingId === campaign.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </Button>

              {/* View Details Button */}
              <Link href={`/campaigns/${campaign.id}`} className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              </div>
            </div>
          </div>
        </Card>
        );
      })}
    </div>
  );
}
