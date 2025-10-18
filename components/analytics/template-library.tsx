"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Library,
  Sparkles,
  TrendingUp,
  Plus,
  Trash2,
  Copy,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: "general" | "retail" | "seasonal" | "promotional";
  template_data: {
    message: string;
    targetAudience?: string;
    industry?: string;
    tone?: string;
  };
  is_system_template: number;
  use_count: number;
  created_at: string;
  updated_at: string;
  assets?: TemplateAsset[];
  dmTemplate?: DMTemplateData; // NEW: Linked DM template design
}

interface TemplateAsset {
  id: string;
  asset_type: string;
  asset_name: string;
  publicUrl: string;
  metadata: any;
}

interface DMTemplateData {
  id: string;
  campaignId: string;
  canvasSessionId?: string;
  name: string;
  canvasJSON: string;
  backgroundImage: string;
  canvasWidth: number;
  canvasHeight: number;
  previewImage?: string;
  variableMappings?: string;
}

type CategoryFilter = "all" | "general" | "retail" | "seasonal" | "promotional";

export function TemplateLibrary() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/campaigns/templates");
      const result = await response.json();

      if (result.success) {
        // Fetch assets and DM templates for each template
        const templatesWithData = await Promise.all(
          result.data.map(async (template: Template) => {
            try {
              // Fetch assets (background images, QR codes)
              const assetsResponse = await fetch(`/api/campaigns/templates/${template.id}/assets`);
              const assetsResult = await assetsResponse.json();

              // Fetch linked DM template design
              const dmTemplateResponse = await fetch(`/api/dm-template?campaignTemplateId=${template.id}`);
              const dmTemplateResult = await dmTemplateResponse.json();

              return {
                ...template,
                assets: assetsResult.success ? assetsResult.data : [],
                dmTemplate: dmTemplateResult.success && dmTemplateResult.data ? dmTemplateResult.data : undefined,
              };
            } catch (error) {
              console.error(`Failed to load data for template ${template.id}:`, error);
              return { ...template, assets: [], dmTemplate: undefined };
            }
          })
        );

        setTemplates(templatesWithData);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setProcessingId(id);
    try {
      const response = await fetch(`/api/campaigns/templates/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Template deleted successfully");
        await loadTemplates();
      } else {
        toast.error(result.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      // Increment template use count
      await fetch(`/api/campaigns/templates/${template.id}/use`, {
        method: "POST",
      });

      // Store template metadata in localStorage (NOT the large design data)
      // Canvas editor will fetch the full template using dmTemplateId
      localStorage.setItem(
        "selectedTemplate",
        JSON.stringify({
          templateId: template.id,
          templateName: template.name,
          message: template.template_data.message,
          targetAudience: template.template_data.targetAudience,
          tone: template.template_data.tone,
          // DM template reference (just the ID, not the large data)
          dmTemplateId: template.dmTemplate?.id,
          hasDesign: !!template.dmTemplate,
          // Note: canvasJSON, backgroundImage, previewImage are NOT stored here
          // They're too large for localStorage and will be fetched by canvas editor
        })
      );

      const designStatus = template.dmTemplate ? "message and design" : "message";
      toast.success(`Template loaded (${designStatus})! Redirecting...`);

      // Redirect to DM Creative page
      setTimeout(() => {
        window.location.href = "/dm-creative";
      }, 800);
    } catch (error) {
      console.error("Error using template:", error);
      toast.error("Failed to use template");
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.template_data.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || template.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "retail":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "seasonal":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "promotional":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "retail":
        return TrendingUp;
      case "seasonal":
        return Sparkles;
      case "promotional":
        return TrendingUp;
      default:
        return Library;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <Card className="border-slate-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search templates by name, description, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-56">
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}
              >
                <SelectTrigger className="w-full">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredTemplates.length}</span>{" "}
              of <span className="font-semibold text-slate-900">{templates.length}</span> templates
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Results Message */}
      {filteredTemplates.length === 0 && searchQuery && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Found</h3>
              <p className="text-slate-600 mb-4">Try adjusting your search or filter criteria</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const CategoryIcon = getCategoryIcon(template.category);
          const isSystemTemplate = template.is_system_template === 1;
          const hasDesign = !!template.dmTemplate;

          // Prioritize DM template preview image, fallback to background asset
          const previewImage = template.dmTemplate?.previewImage;
          const backgroundAsset = template.assets?.find(
            (asset) => asset.asset_type === "background_image"
          );
          const qrAsset = template.assets?.find((asset) => asset.asset_type === "qr_code");

          return (
            <Card
              key={template.id}
              className="border-slate-200 hover:border-slate-300 transition-all hover:shadow-md overflow-hidden"
            >
              {/* DM Preview Image */}
              {(previewImage || backgroundAsset) && (
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={previewImage || backgroundAsset?.publicUrl || ""}
                    alt={`${template.name} preview`}
                    className="w-full h-full object-cover"
                  />
                  {qrAsset && (
                    <div className="absolute bottom-2 right-2 bg-white p-1 rounded shadow-md">
                      <img
                        src={qrAsset.publicUrl || ""}
                        alt="QR Code"
                        className="w-12 h-12"
                      />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-2">
                    {hasDesign && (
                      <div
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium shadow-sm flex items-center gap-1"
                        title="This template includes a pre-designed layout"
                      >
                        <Eye className="h-3 w-3" />
                        Design Available
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-slate-700">
                    Preview
                  </div>
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <CategoryIcon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {isSystemTemplate && (
                        <div className="flex items-center gap-1 mt-1">
                          <Sparkles className="h-3 w-3 text-amber-600" />
                          <span className="text-xs text-amber-600 font-medium">System Template</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full border ${getCategoryColor(
                      template.category
                    )}`}
                  >
                    {template.category}
                  </span>
                  <span className="text-xs text-slate-500">
                    Used {template.use_count} {template.use_count === 1 ? "time" : "times"}
                  </span>
                </div>

                {template.description && (
                  <CardDescription className="mt-3">{template.description}</CardDescription>
                )}
              </CardHeader>

              <CardContent>
                {/* Template Message Preview */}
                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-700 line-clamp-3">{template.template_data.message}</p>
                </div>

                {/* Template Metadata */}
                <div className="mb-4 space-y-2">
                  {/* What's Included Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs font-medium">
                      <Library className="h-3 w-3" />
                      {hasDesign ? "Message + Design" : "Message Only"}
                    </span>
                  </div>

                  {(template.template_data.targetAudience || template.template_data.tone) && (
                    <div className="space-y-1 text-xs text-slate-600">
                      {template.template_data.targetAudience && (
                        <p>
                          <span className="font-medium">Target:</span> {template.template_data.targetAudience}
                        </p>
                      )}
                      {template.template_data.tone && (
                        <p>
                          <span className="font-medium">Tone:</span> {template.template_data.tone}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1 gap-2"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Use Template
                  </Button>

                  {!isSystemTemplate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      disabled={processingId === template.id}
                      className="gap-2 text-red-700 border-red-300 hover:bg-red-50"
                    >
                      {processingId === template.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State (no templates at all) */}
      {templates.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Library className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Available</h3>
              <p className="text-slate-600 mb-6">
                Create your first template to get started with reusable campaign designs.
              </p>
              <Link href="/dm-creative">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Campaign
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
