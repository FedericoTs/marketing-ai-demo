"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Package,
} from "lucide-react";

interface CampaignRecommendation {
  store_id: string;
  store_name: string;
  campaign_id: string;
  campaign_name: string;
  overall_score: number;
  confidence_level: "high" | "medium" | "low";
  recommended_quantity: number;
  scores: {
    store_performance: number;
    creative_performance: number;
    geographic_fit: number;
    timing_alignment: number;
  };
  reasoning: string[];
  expected_conversion_rate: number;
  risk_factors: string[];
}

interface Store {
  store_id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region: string;
  total_campaigns: number;
  avg_conversion_rate: number;
  recent_conversion_rate: number;
  top_recommendation: CampaignRecommendation | null;
  all_recommendations: CampaignRecommendation[];
  status: "auto-approve" | "needs-review" | "skip";
  status_reason: string;
}

interface PerformanceMatrixGridProps {
  stores: Store[];
}

export function PerformanceMatrixGrid({ stores }: PerformanceMatrixGridProps) {
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  const toggleExpand = (storeId: string) => {
    setExpandedStoreId(expandedStoreId === storeId ? null : storeId);
  };

  const getStatusColor = (status: Store["status"]) => {
    switch (status) {
      case "auto-approve":
        return "border-green-200 bg-green-50";
      case "needs-review":
        return "border-yellow-200 bg-yellow-50";
      case "skip":
        return "border-slate-200 bg-slate-50";
    }
  };

  const getStatusIcon = (status: Store["status"]) => {
    switch (status) {
      case "auto-approve":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "needs-review":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "skip":
        return <X className="h-5 w-5 text-slate-600" />;
    }
  };

  const getStatusLabel = (status: Store["status"]) => {
    switch (status) {
      case "auto-approve":
        return "Auto-Approve";
      case "needs-review":
        return "Needs Review";
      case "skip":
        return "Skip";
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: "bg-green-100 text-green-800 border-green-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-slate-100 text-slate-800 border-slate-300",
    };
    return colors[confidence as keyof typeof colors] || colors.low;
  };

  const getTrendIcon = (store: Store) => {
    if (store.total_campaigns < 2) return <Minus className="h-4 w-4 text-slate-400" />;

    const diff = store.recent_conversion_rate - store.avg_conversion_rate;
    if (Math.abs(diff) < 0.01) return <Minus className="h-4 w-4 text-slate-400" />;

    return diff > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  if (stores.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-600">
            No stores match your current filters
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {stores.map((store) => {
        const isExpanded = expandedStoreId === store.store_id;
        const rec = store.top_recommendation;

        return (
          <Card key={store.store_id} className={getStatusColor(store.status)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                {/* Store Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(store.status)}
                    <div>
                      <CardTitle className="text-lg">
                        #{store.store_number} - {store.store_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {store.city}, {store.state} • {store.region}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <Badge
                  variant="outline"
                  className={`${
                    store.status === "auto-approve"
                      ? "border-green-600 text-green-900"
                      : store.status === "needs-review"
                      ? "border-yellow-600 text-yellow-900"
                      : "border-slate-600 text-slate-900"
                  }`}
                >
                  {getStatusLabel(store.status)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Performance Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Past Campaigns</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {store.total_campaigns}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                    Avg. Conversion {getTrendIcon(store)}
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {(store.avg_conversion_rate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Recent Conversion</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {(store.recent_conversion_rate * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Status Reason</p>
                  <p className="text-sm text-slate-700 truncate" title={store.status_reason}>
                    {store.status_reason}
                  </p>
                </div>
              </div>

              {/* Top Recommendation */}
              {rec ? (
                <div className="border-t pt-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">
                          Recommended: {rec.campaign_name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={getConfidenceBadge(rec.confidence_level)}
                        >
                          {rec.confidence_level} confidence
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-slate-500" />
                          <span className="font-medium text-slate-900">
                            {rec.recommended_quantity.toLocaleString()} pieces
                          </span>
                        </div>
                        <div className="text-slate-600">
                          Score: {(rec.overall_score * 100).toFixed(0)}%
                        </div>
                        <div className="text-slate-600">
                          Expected: {(rec.expected_conversion_rate * 100).toFixed(1)}% conversion
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(store.store_id)}
                      className="flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Details
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Store Performance</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${rec.scores.store_performance * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-900">
                          {(rec.scores.store_performance * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Creative Performance</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${rec.scores.creative_performance * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-900">
                          {(rec.scores.creative_performance * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Geographic Fit</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${rec.scores.geographic_fit * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-900">
                          {(rec.scores.geographic_fit * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Timing Alignment</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${rec.scores.timing_alignment * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-900">
                          {(rec.scores.timing_alignment * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {/* Reasoning */}
                      {rec.reasoning.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-900 mb-2">
                            Why This Campaign?
                          </h5>
                          <ul className="space-y-1">
                            {rec.reasoning.map((reason, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-slate-700 flex items-start gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Risk Factors */}
                      {rec.risk_factors.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-900 mb-2">
                            Risk Factors
                          </h5>
                          <ul className="space-y-1">
                            {rec.risk_factors.map((risk, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-slate-700 flex items-start gap-2"
                              >
                                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Alternative Recommendations */}
                      {store.all_recommendations.length > 1 && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-900 mb-2">
                            Alternative Campaigns ({store.all_recommendations.length - 1})
                          </h5>
                          <div className="space-y-2">
                            {store.all_recommendations.slice(1, 4).map((altRec) => (
                              <div
                                key={altRec.campaign_id}
                                className="flex items-center justify-between p-2 bg-white rounded border border-slate-200"
                              >
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {altRec.campaign_name}
                                  </p>
                                  <p className="text-xs text-slate-600">
                                    {altRec.recommended_quantity.toLocaleString()} pieces •{" "}
                                    {(altRec.overall_score * 100).toFixed(0)}% match
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={getConfidenceBadge(altRec.confidence_level)}
                                >
                                  {altRec.confidence_level}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t pt-4">
                  <p className="text-sm text-slate-600">No suitable campaigns found for this store</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
