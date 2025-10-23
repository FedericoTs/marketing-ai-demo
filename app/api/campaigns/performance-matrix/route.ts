import { NextRequest, NextResponse } from "next/server";
import {
  getAllStorePerformanceMetrics,
  getAllCampaignCreativePerformance,
  getGeographicPatterns,
} from "@/lib/database/performance-matrix-queries";
import {
  generateBatchRecommendations,
  CampaignRecommendation,
  RecommendationConfig,
} from "@/lib/algorithms/campaign-recommendation";

export const dynamic = "force-dynamic";

interface PerformanceMatrixResponse {
  success: boolean;
  data?: {
    stores: StoreWithRecommendations[];
    campaigns: CampaignSummary[];
    summary: MatrixSummary;
    filters: AvailableFilters;
  };
  error?: string;
}

interface StoreWithRecommendations {
  store_id: string;
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  region: string;

  // Historical performance
  total_campaigns: number;
  avg_conversion_rate: number;
  recent_conversion_rate: number;

  // Top recommendation
  top_recommendation: CampaignRecommendation | null;

  // All recommendations (sorted by score)
  all_recommendations: CampaignRecommendation[];

  // Status
  status: "auto-approve" | "needs-review" | "skip";
  status_reason: string;
}

interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  total_stores_recommended: number;
  total_quantity_recommended: number;
  avg_confidence: number;
  expected_total_conversions: number;
}

interface MatrixSummary {
  total_stores: number;
  auto_approve_count: number;
  needs_review_count: number;
  skip_count: number;
  total_recommended_quantity: number;
  total_campaigns: number;
}

interface AvailableFilters {
  regions: string[];
  states: string[];
  status: ("auto-approve" | "needs-review" | "skip")[];
}

/**
 * GET /api/campaigns/performance-matrix
 *
 * Returns intelligent campaign recommendations for all stores
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Query parameters
    const daysBack = parseInt(searchParams.get("daysBack") || "90");
    const regionFilter = searchParams.get("region");
    const stateFilter = searchParams.get("state");
    const statusFilter = searchParams.get("status") as
      | "auto-approve"
      | "needs-review"
      | "skip"
      | null;
    const minConfidence = parseFloat(searchParams.get("minConfidence") || "0.5");

    console.log("[Performance Matrix] Generating recommendations...", {
      daysBack,
      regionFilter,
      stateFilter,
      statusFilter,
      minConfidence,
    });

    // 1. Fetch data
    const stores = getAllStorePerformanceMetrics(daysBack);
    const campaigns = getAllCampaignCreativePerformance(daysBack);
    const geographicPatterns = getGeographicPatterns(daysBack);

    console.log("[Performance Matrix] Data fetched:", {
      stores: stores.length,
      campaigns: campaigns.length,
      patterns: geographicPatterns.length,
    });

    // 2. Generate recommendations with custom config
    const config: RecommendationConfig = {
      weights: {
        store_performance: 0.4,
        creative_performance: 0.3,
        geographic_fit: 0.2,
        timing_alignment: 0.1,
      },
      min_confidence_threshold: minConfidence,
      quantity_multiplier: 1.0,
    };

    const recommendations = generateBatchRecommendations(
      stores,
      campaigns,
      geographicPatterns,
      config
    );

    // 3. Build response data
    const storesWithRecs: StoreWithRecommendations[] = stores.map((store) => {
      const storeRecs = recommendations.get(store.store_id) || [];
      const topRec = storeRecs[0] || null;

      // Determine status
      let status: "auto-approve" | "needs-review" | "skip";
      let statusReason: string;

      if (!topRec) {
        status = "skip";
        statusReason = "No suitable campaigns found";
      } else if (topRec.confidence_level === "high" && topRec.overall_score >= 0.75) {
        status = "auto-approve";
        statusReason = `High confidence (${(topRec.overall_score * 100).toFixed(0)}% match)`;
      } else if (topRec.confidence_level === "low" || topRec.overall_score < 0.6) {
        status = "needs-review";
        statusReason = topRec.risk_factors[0] || "Low confidence, manual review recommended";
      } else {
        status = "needs-review";
        statusReason = "Medium confidence, please verify";
      }

      return {
        store_id: store.store_id,
        store_number: store.store_number,
        store_name: store.store_name,
        city: store.city,
        state: store.state,
        region: store.region,
        total_campaigns: store.total_campaigns,
        avg_conversion_rate: store.avg_conversion_rate,
        recent_conversion_rate: store.recent_conversion_rate,
        top_recommendation: topRec,
        all_recommendations: storeRecs,
        status,
        status_reason: statusReason,
      };
    });

    // 4. Apply filters
    let filteredStores = storesWithRecs;

    if (regionFilter) {
      filteredStores = filteredStores.filter((s) => s.region === regionFilter);
    }

    if (stateFilter) {
      filteredStores = filteredStores.filter((s) => s.state === stateFilter);
    }

    if (statusFilter) {
      filteredStores = filteredStores.filter((s) => s.status === statusFilter);
    }

    // 5. Calculate campaign summaries
    const campaignSummaries: Map<string, CampaignSummary> = new Map();

    filteredStores.forEach((store) => {
      if (!store.top_recommendation) return;

      const campaignId = store.top_recommendation.campaign_id;
      const existing = campaignSummaries.get(campaignId);

      if (existing) {
        existing.total_stores_recommended += 1;
        existing.total_quantity_recommended += store.top_recommendation.recommended_quantity;
        existing.avg_confidence =
          (existing.avg_confidence * (existing.total_stores_recommended - 1) +
            store.top_recommendation.overall_score) /
          existing.total_stores_recommended;
        existing.expected_total_conversions +=
          store.top_recommendation.recommended_quantity *
          store.top_recommendation.expected_conversion_rate;
      } else {
        campaignSummaries.set(campaignId, {
          campaign_id: campaignId,
          campaign_name: store.top_recommendation.campaign_name,
          total_stores_recommended: 1,
          total_quantity_recommended: store.top_recommendation.recommended_quantity,
          avg_confidence: store.top_recommendation.overall_score,
          expected_total_conversions:
            store.top_recommendation.recommended_quantity *
            store.top_recommendation.expected_conversion_rate,
        });
      }
    });

    // 6. Calculate summary statistics
    const summary: MatrixSummary = {
      total_stores: filteredStores.length,
      auto_approve_count: filteredStores.filter((s) => s.status === "auto-approve").length,
      needs_review_count: filteredStores.filter((s) => s.status === "needs-review").length,
      skip_count: filteredStores.filter((s) => s.status === "skip").length,
      total_recommended_quantity: filteredStores.reduce(
        (sum, s) => sum + (s.top_recommendation?.recommended_quantity || 0),
        0
      ),
      total_campaigns: campaignSummaries.size,
    };

    // 7. Build available filters
    const uniqueRegions = [...new Set(stores.map((s) => s.region))].filter(Boolean).sort();
    const uniqueStates = [...new Set(stores.map((s) => s.state))].filter(Boolean).sort();

    const filters: AvailableFilters = {
      regions: uniqueRegions,
      states: uniqueStates,
      status: ["auto-approve", "needs-review", "skip"],
    };

    console.log("[Performance Matrix] Generated recommendations:", {
      totalStores: filteredStores.length,
      autoApprove: summary.auto_approve_count,
      needsReview: summary.needs_review_count,
      skip: summary.skip_count,
      campaigns: campaignSummaries.size,
    });

    // 8. Return response
    const response: PerformanceMatrixResponse = {
      success: true,
      data: {
        stores: filteredStores,
        campaigns: Array.from(campaignSummaries.values()).sort(
          (a, b) => b.total_stores_recommended - a.total_stores_recommended
        ),
        summary,
        filters,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("[Performance Matrix] Error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json<PerformanceMatrixResponse>(
      {
        success: false,
        error: `Failed to generate performance matrix: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
