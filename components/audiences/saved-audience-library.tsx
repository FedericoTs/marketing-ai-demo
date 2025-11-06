"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Target
} from "lucide-react";
import type { SavedAudience } from "@/lib/audience";

interface SavedAudienceLibraryProps {
  onSelectAudience: (audience: SavedAudience) => void;
  onCreateNew: () => void;
}

/**
 * Saved Audience Library - Grid View
 *
 * Displays saved audience segments with:
 * - Search and filtering
 * - Performance metrics
 * - Quick actions (edit, duplicate, delete)
 * - Empty state with CTA
 */
export function SavedAudienceLibrary({
  onSelectAudience,
  onCreateNew,
}: SavedAudienceLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Replace with actual database query
  const mockAudiences: SavedAudience[] = [
    // Empty for now - will be populated from database
  ];

  const filteredAudiences = mockAudiences.filter((audience) =>
    audience.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    audience.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search audiences..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
          onClick={onCreateNew}
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Audience
        </Button>
      </div>

      {/* Empty State */}
      {filteredAudiences.length === 0 && (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
              <Target className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              {searchQuery ? "No audiences found" : "Create your first audience"}
            </h3>
            <p className="mb-6 max-w-md text-center text-slate-600">
              {searchQuery
                ? `No audiences match "${searchQuery}". Try a different search term.`
                : "Build precise audience segments to target the right people with your campaigns. Save time by reusing proven audiences."}
            </p>
            {!searchQuery && (
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={onCreateNew}
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Your First Audience
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audience Grid */}
      {filteredAudiences.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAudiences.map((audience) => (
            <Card
              key={audience.id}
              className="group cursor-pointer transition-all hover:shadow-lg hover:border-purple-300"
              onClick={() => onSelectAudience(audience)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-purple-600 transition-colors">
                      {audience.name}
                    </CardTitle>
                    {audience.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {audience.description}
                      </CardDescription>
                    )}
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-slate-100 rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Show action menu
                    }}
                  >
                    <MoreVertical className="h-4 w-4 text-slate-600" />
                  </button>
                </div>

                {/* Tags */}
                {audience.tags && audience.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {audience.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {audience.tags.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        +{audience.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Size</span>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {audience.last_count
                        ? formatNumber(audience.last_count)
                        : "—"}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs">Cost</span>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {audience.last_estimated_cost
                        ? formatCurrency(audience.last_estimated_cost)
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Performance */}
                {audience.avg_conversion_rate !== null && audience.avg_conversion_rate !== undefined && (
                  <div className="rounded-lg bg-green-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">
                        Avg. Conversion
                      </span>
                      <div className="flex items-center gap-1 text-green-700">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-bold">
                          {(audience.avg_conversion_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(audience.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {audience.total_campaigns_using > 0 && (
                    <span className="font-medium text-purple-600">
                      {audience.total_campaigns_using} campaigns
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
