import {
  StorePerformanceMetrics,
  CampaignCreativePerformance,
  GeographicPattern,
  findSimilarStores,
} from "../database/performance-matrix-queries";

// ============================================================================
// INTELLIGENT CAMPAIGN RECOMMENDATION ALGORITHM
// ============================================================================
// Multi-factor scoring system for matching campaigns to stores

export interface CampaignRecommendation {
  store_id: string;
  store_name: string;
  campaign_id: string;
  campaign_name: string;

  // Recommendation scoring
  overall_score: number; // 0-1, weighted combination of all factors
  confidence_level: "high" | "medium" | "low";
  recommended_quantity: number;

  // Breakdown scores (0-1 each)
  scores: {
    store_performance: number; // 40% weight
    creative_performance: number; // 30% weight
    geographic_fit: number; // 20% weight
    timing_alignment: number; // 10% weight
  };

  // Supporting data
  reasoning: string[];
  expected_conversion_rate: number;
  risk_factors: string[];
}

export interface RecommendationConfig {
  weights: {
    store_performance: number;
    creative_performance: number;
    geographic_fit: number;
    timing_alignment: number;
  };
  min_confidence_threshold: number;
  quantity_multiplier: number; // Applied to base calculation
}

const DEFAULT_CONFIG: RecommendationConfig = {
  weights: {
    store_performance: 0.4,
    creative_performance: 0.3,
    geographic_fit: 0.2,
    timing_alignment: 0.1,
  },
  min_confidence_threshold: 0.5,
  quantity_multiplier: 1.0,
};

/**
 * Generate campaign recommendations for a single store
 */
export function generateStoreRecommendations(
  store: StorePerformanceMetrics,
  campaigns: CampaignCreativePerformance[],
  geographicPatterns: GeographicPattern[],
  config: RecommendationConfig = DEFAULT_CONFIG
): CampaignRecommendation[] {
  const recommendations = campaigns.map((campaign) => {
    // Calculate individual scores
    const storeScore = calculateStorePerformanceScore(store);
    const creativeScore = calculateCreativePerformanceScore(campaign);
    const geoScore = calculateGeographicFitScore(store, campaign, geographicPatterns);
    const timingScore = calculateTimingAlignmentScore(store, campaign);

    // Calculate weighted overall score
    const overallScore =
      storeScore * config.weights.store_performance +
      creativeScore * config.weights.creative_performance +
      geoScore * config.weights.geographic_fit +
      timingScore * config.weights.timing_alignment;

    // Determine confidence level
    const confidenceLevel = determineConfidenceLevel(overallScore, store, campaign);

    // Calculate recommended quantity
    const quantity = calculateRecommendedQuantity(
      store,
      campaign,
      overallScore,
      config.quantity_multiplier
    );

    // Generate reasoning
    const reasoning = generateReasoning(
      store,
      campaign,
      { storeScore, creativeScore, geoScore, timingScore },
      overallScore
    );

    // Identify risk factors
    const riskFactors = identifyRiskFactors(store, campaign, overallScore);

    // Predict expected conversion rate
    const expectedConversionRate = predictConversionRate(
      store,
      campaign,
      overallScore
    );

    return {
      store_id: store.store_id,
      store_name: store.store_name,
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      overall_score: overallScore,
      confidence_level: confidenceLevel,
      recommended_quantity: quantity,
      scores: {
        store_performance: storeScore,
        creative_performance: creativeScore,
        geographic_fit: geoScore,
        timing_alignment: timingScore,
      },
      reasoning,
      expected_conversion_rate: expectedConversionRate,
      risk_factors: riskFactors,
    };
  });

  // Return sorted by score, filtered by confidence threshold
  return recommendations
    .filter((r) => r.overall_score >= config.min_confidence_threshold)
    .sort((a, b) => b.overall_score - a.overall_score);
}

/**
 * Calculate store performance score (0-1)
 * Based on historical conversion rate and recent trend
 */
function calculateStorePerformanceScore(store: StorePerformanceMetrics): number {
  if (store.total_campaigns === 0) {
    return 0.5; // Neutral score for new stores
  }

  // Base score from overall conversion rate (normalized to 0-1)
  // Assuming 20% conversion rate is excellent
  const baseScore = Math.min(store.avg_conversion_rate / 0.2, 1.0);

  // Recent performance trend adjustment
  let trendMultiplier = 1.0;
  if (store.recent_campaigns >= 2) {
    if (store.recent_conversion_rate > store.avg_conversion_rate * 1.1) {
      trendMultiplier = 1.1; // Improving trend, boost score
    } else if (store.recent_conversion_rate < store.avg_conversion_rate * 0.9) {
      trendMultiplier = 0.9; // Declining trend, reduce score
    }
  }

  return Math.min(baseScore * trendMultiplier, 1.0);
}

/**
 * Calculate creative performance score (0-1)
 * Based on campaign's overall success rate
 */
function calculateCreativePerformanceScore(
  campaign: CampaignCreativePerformance
): number {
  if (campaign.total_recipients === 0) {
    return 0.5; // Neutral score for new campaigns
  }

  // Normalize conversion rate (20% = 1.0)
  const conversionScore = Math.min(campaign.overall_conversion_rate / 0.2, 1.0);

  // Bonus for campaigns with good sample size
  let sampleBonus = 0;
  if (campaign.total_recipients >= 1000) {
    sampleBonus = 0.1; // High confidence from large sample
  } else if (campaign.total_recipients >= 500) {
    sampleBonus = 0.05;
  }

  return Math.min(conversionScore + sampleBonus, 1.0);
}

/**
 * Calculate geographic fit score (0-1)
 * Based on campaign performance in similar locations
 */
function calculateGeographicFitScore(
  store: StorePerformanceMetrics,
  campaign: CampaignCreativePerformance,
  geographicPatterns: GeographicPattern[]
): number {
  // Check if campaign performed well in this region
  const regionMatch = campaign.top_performing_regions.find(
    (r) => r.region === store.region
  );

  if (regionMatch) {
    // Campaign has history in this region
    const regionScore = Math.min(regionMatch.conversion_rate / 0.2, 1.0);
    return regionScore * 1.1; // Boost for proven regional fit
  }

  // Check state-level performance
  const stateMatch = campaign.top_performing_states.find(
    (s) => s.state === store.state
  );

  if (stateMatch) {
    const stateScore = Math.min(stateMatch.conversion_rate / 0.2, 1.0);
    return stateScore;
  }

  // Check general regional patterns
  const regionPattern = geographicPatterns.find(
    (p) => p.region === store.region
  );

  if (regionPattern) {
    return Math.min(regionPattern.avg_conversion_rate / 0.2, 1.0);
  }

  return 0.5; // No geographic data, neutral score
}

/**
 * Calculate timing alignment score (0-1)
 * Based on time-to-conversion compatibility
 */
function calculateTimingAlignmentScore(
  store: StorePerformanceMetrics,
  campaign: CampaignCreativePerformance
): number {
  if (
    store.avg_time_to_conversion_hours === 0 ||
    campaign.avg_time_to_conversion_hours === 0
  ) {
    return 0.8; // Neutral-positive score when no data
  }

  // Calculate difference in conversion timing (hours)
  const timeDiff = Math.abs(
    store.avg_time_to_conversion_hours - campaign.avg_time_to_conversion_hours
  );

  // Score decreases as time difference increases
  // Perfect match (0 diff) = 1.0, 48hr diff = 0.5, 168hr+ diff = 0.3
  if (timeDiff <= 24) {
    return 1.0; // Excellent match
  } else if (timeDiff <= 48) {
    return 0.8; // Good match
  } else if (timeDiff <= 72) {
    return 0.6; // Acceptable match
  } else if (timeDiff <= 168) {
    return 0.5; // Moderate mismatch
  } else {
    return 0.3; // Poor match
  }
}

/**
 * Determine confidence level based on score and data quality
 */
function determineConfidenceLevel(
  score: number,
  store: StorePerformanceMetrics,
  campaign: CampaignCreativePerformance
): "high" | "medium" | "low" {
  // Check data quality
  const hasStoreHistory = store.total_campaigns >= 3;
  const hasCampaignHistory = campaign.total_recipients >= 100;

  if (score >= 0.75 && hasStoreHistory && hasCampaignHistory) {
    return "high";
  } else if (score >= 0.6 && (hasStoreHistory || hasCampaignHistory)) {
    return "medium";
  } else {
    return "low";
  }
}

/**
 * Calculate recommended quantity based on store size and expected performance
 */
function calculateRecommendedQuantity(
  store: StorePerformanceMetrics,
  campaign: CampaignCreativePerformance,
  score: number,
  multiplier: number
): number {
  // Base quantity calculation
  let baseQuantity = 300; // Default for stores with no history

  if (store.total_recipients > 0) {
    // Use historical average as baseline
    const avgPerCampaign = store.total_recipients / Math.max(store.total_campaigns, 1);
    baseQuantity = Math.round(avgPerCampaign);
  }

  // Adjust based on score
  const scoreMultiplier = 0.7 + score * 0.6; // Range: 0.7 to 1.3
  let adjustedQuantity = Math.round(baseQuantity * scoreMultiplier * multiplier);

  // Round to nearest 50 for easier printing
  adjustedQuantity = Math.round(adjustedQuantity / 50) * 50;

  // Apply min/max constraints
  return Math.max(100, Math.min(adjustedQuantity, 2000));
}

/**
 * Generate human-readable reasoning for the recommendation
 */
function generateReasoning(
  store: StorePerformanceMetrics,
  campaign: CampaignCreativePerformance,
  scores: {
    storeScore: number;
    creativeScore: number;
    geoScore: number;
    timingScore: number;
  },
  overallScore: number
): string[] {
  const reasons: string[] = [];

  // Store performance insights
  if (scores.storeScore >= 0.8) {
    reasons.push(
      `Store has excellent historical performance (${(store.avg_conversion_rate * 100).toFixed(1)}% conversion rate)`
    );
  } else if (scores.storeScore >= 0.6) {
    reasons.push(`Store shows good performance potential`);
  } else if (store.total_campaigns === 0) {
    reasons.push(`New store - recommendation based on similar stores in ${store.region}`);
  }

  // Creative performance insights
  if (scores.creativeScore >= 0.8) {
    reasons.push(
      `Campaign proven successful (${(campaign.overall_conversion_rate * 100).toFixed(1)}% conversion across ${campaign.total_stores} stores)`
    );
  } else if (scores.creativeScore >= 0.6) {
    reasons.push(`Campaign shows promising results`);
  }

  // Geographic fit insights
  if (scores.geoScore >= 0.8) {
    const regionPerf = campaign.top_performing_regions.find(
      (r) => r.region === store.region
    );
    if (regionPerf) {
      reasons.push(
        `Strong regional fit - this campaign achieved ${(regionPerf.conversion_rate * 100).toFixed(1)}% in ${store.region}`
      );
    }
  } else if (scores.geoScore >= 0.6) {
    reasons.push(`Campaign aligns well with ${store.state} demographics`);
  }

  // Timing insights
  if (scores.timingScore >= 0.8) {
    reasons.push(
      `Optimal timing alignment (avg. ${Math.round(campaign.avg_time_to_conversion_hours)}hr to conversion)`
    );
  }

  // Add caution if score is moderate
  if (overallScore < 0.7 && overallScore >= 0.5) {
    reasons.push(`Consider as secondary option - monitor performance closely`);
  }

  return reasons.length > 0
    ? reasons
    : [`Recommended based on overall market performance`];
}

/**
 * Identify potential risk factors
 */
function identifyRiskFactors(
  store: StorePerformanceMetrics,
  campaign: CampaignCreativePerformance,
  score: number
): string[] {
  const risks: string[] = [];

  // Insufficient data
  if (store.total_campaigns < 2) {
    risks.push(`Limited store history (only ${store.total_campaigns} past campaigns)`);
  }

  if (campaign.total_recipients < 100) {
    risks.push(`New campaign with limited performance data`);
  }

  // Declining performance
  if (
    store.recent_campaigns >= 2 &&
    store.recent_conversion_rate < store.avg_conversion_rate * 0.8
  ) {
    risks.push(`Store performance declining (recent: ${(store.recent_conversion_rate * 100).toFixed(1)}% vs avg: ${(store.avg_conversion_rate * 100).toFixed(1)}%)`);
  }

  // Low overall score
  if (score < 0.6) {
    risks.push(`Moderate confidence - consider alternatives`);
  }

  return risks;
}

/**
 * Predict expected conversion rate for this store-campaign pairing
 */
function predictConversionRate(
  store: StorePerformanceMetrics,
  campaign: CampaignCreativePerformance,
  score: number
): number {
  // Weighted average of store and campaign historical rates
  const storeRate = store.avg_conversion_rate || 0;
  const campaignRate = campaign.overall_conversion_rate || 0;

  // Weight based on data quality
  const storeWeight = Math.min(store.total_campaigns / 5, 0.6); // Max 60% weight
  const campaignWeight = 1 - storeWeight;

  const baseRate = storeRate * storeWeight + campaignRate * campaignWeight;

  // Adjust based on overall score
  const scoreAdjustment = 0.9 + score * 0.2; // Range: 0.9 to 1.1

  return Math.min(baseRate * scoreAdjustment, 0.5); // Cap at 50%
}

/**
 * Batch generate recommendations for all stores
 */
export function generateBatchRecommendations(
  stores: StorePerformanceMetrics[],
  campaigns: CampaignCreativePerformance[],
  geographicPatterns: GeographicPattern[],
  config: RecommendationConfig = DEFAULT_CONFIG
): Map<string, CampaignRecommendation[]> {
  const recommendations = new Map<string, CampaignRecommendation[]>();

  stores.forEach((store) => {
    const storeRecs = generateStoreRecommendations(
      store,
      campaigns,
      geographicPatterns,
      config
    );
    recommendations.set(store.store_id, storeRecs);
  });

  return recommendations;
}
