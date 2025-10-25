/**
 * Planning AI Scorer - Bridge between Retail Optimizer and Planning Workspace
 *
 * Converts GPT-4o recommendations into visual KPIs for user understanding
 *
 * User sees: 4 colored progress bars, confidence badges, reasoning bullets
 * Under the hood: Real analytics + AI optimization
 */

import { optimizeCampaignDeployment } from './retail-optimizer';
import type { StoreRecommendation } from './retail-optimizer';
import {
  getStorePerformanceClusters,
  getTopPerformers,
  getRegionalPerformance,
  getTimeBasedPatterns,
} from '../database/retail-analytics';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PlanningAIScore {
  store_id: string;
  store_number: string;
  store_name: string;

  // Campaign details
  campaign_id: string;
  campaign_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;

  // Overall AI confidence (from optimizer)
  ai_confidence: number; // 0-100
  ai_confidence_level: 'high' | 'medium' | 'low';

  // 4-Factor Breakdown (VISUAL KPIs - users see these as colored bars)
  ai_score_store_performance: number; // 0-100
  ai_score_creative_performance: number; // 0-100
  ai_score_geographic_fit: number; // 0-100
  ai_score_timing_alignment: number; // 0-100

  // Reasoning & Risks (VISUAL - users see these as bullet points)
  ai_reasoning: string[]; // Array of bullet points
  ai_risk_factors: string[] | null; // Array of warnings

  // Predictions (VISUAL - users see these as KPI numbers)
  ai_expected_conversion_rate: number; // e.g., 3.5%
  ai_expected_conversions: number; // e.g., 8.7 conversions

  // Auto-approval flag
  ai_auto_approved: boolean; // true if confidence >= 75%
}

export interface GeneratePlanRequest {
  planName: string;
  planDescription?: string;
  campaignId: string;
  campaignName: string;
  campaignMessage: string;
  storeIds?: string[]; // Optional: specific stores to include
  desiredStoreCount?: number; // Optional: how many stores to recommend
}

export interface GeneratePlanResult {
  planData: {
    name: string;
    description: string;
    status: 'draft';
  };
  recommendations: PlanningAIScore[];
  insights: string[];
  warnings: string[];
}

// ============================================================================
// CORE AI SCORING FUNCTION
// ============================================================================

/**
 * Generate AI-powered planning recommendations
 *
 * Simple for users: Just provide campaign details
 * Complex under the hood: Analytics + GPT-4o + scoring algorithms
 */
export async function generatePlanningRecommendations(
  request: GeneratePlanRequest
): Promise<GeneratePlanResult> {

  try {
    // STEP 1: Get AI recommendations from existing optimizer (GPT-4o)
    console.log('🤖 Calling AI optimizer for campaign:', request.campaignName);

    const optimization = await optimizeCampaignDeployment({
      campaignName: request.campaignName,
      message: request.campaignMessage,
      desiredStoreCount: request.desiredStoreCount || 10,
    });

    // STEP 2: Get analytics data for 4-factor scoring
    const perfClusters = getStorePerformanceClusters();
    const topPerformers = getTopPerformers(50, 'conversion_rate');
    const regionalPerf = getRegionalPerformance();
    const currentMonth = new Date().getMonth();

    // STEP 3: Convert optimizer output to Planning format
    const recommendations: PlanningAIScore[] = optimization.recommendedStores.map((rec) => {

      // Calculate 4-factor breakdown (VISUAL KPIs)
      const factorScores = calculate4FactorScores(
        rec,
        perfClusters,
        topPerformers,
        regionalPerf,
        currentMonth
      );

      // Generate reasoning bullets (VISUAL)
      const reasoning = generateReasoningBullets(
        rec,
        factorScores,
        optimization.insights
      );

      // Identify risks (VISUAL warnings)
      const risks = identifyRisks(rec.confidenceScore, factorScores, rec.reasoning);

      // Determine confidence level (VISUAL badge color)
      const confidenceLevel =
        rec.confidenceScore >= 75 ? 'high' :
        rec.confidenceScore >= 50 ? 'medium' : 'low';

      // Calculate quantity and cost (simple for now)
      const quantity = 100; // Can be adjusted based on budget
      const unitCost = 0.05; // Standard DM cost
      const totalCost = quantity * unitCost;

      return {
        store_id: rec.storeId,
        store_number: rec.storeNumber,
        store_name: rec.storeName,

        campaign_id: request.campaignId,
        campaign_name: request.campaignName,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,

        ai_confidence: rec.confidenceScore,
        ai_confidence_level: confidenceLevel,

        ai_score_store_performance: factorScores.storePerformance,
        ai_score_creative_performance: factorScores.creativePerformance,
        ai_score_geographic_fit: factorScores.geographicFit,
        ai_score_timing_alignment: factorScores.timingAlignment,

        ai_reasoning: reasoning,
        ai_risk_factors: risks.length > 0 ? risks : null,

        ai_expected_conversion_rate: rec.predictedConversionRate,
        ai_expected_conversions: rec.estimatedConversions,

        ai_auto_approved: rec.confidenceScore >= 75,
      };
    });

    console.log(`✅ Generated ${recommendations.length} AI-powered recommendations`);

    return {
      planData: {
        name: request.planName,
        description: request.planDescription || `AI-optimized plan for ${request.campaignName}`,
        status: 'draft',
      },
      recommendations,
      insights: optimization.insights,
      warnings: optimization.warnings,
    };

  } catch (error) {
    console.error('❌ Error generating AI recommendations:', error);
    throw new Error(`Failed to generate AI recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// 4-FACTOR SCORING (Visual KPI Breakdown)
// ============================================================================

interface FactorScores {
  storePerformance: number;
  creativePerformance: number;
  geographicFit: number;
  timingAlignment: number;
}

/**
 * Calculate 4-factor scores from analytics data
 * These become the visual progress bars users see
 */
function calculate4FactorScores(
  rec: StoreRecommendation,
  perfClusters: any[],
  topPerformers: any[],
  regionalPerf: any[],
  currentMonth: number
): FactorScores {

  // 1. STORE PERFORMANCE (from historical conversion rates)
  const storeRank = topPerformers.findIndex(s => s.id === rec.storeId);
  const storePerformance = storeRank >= 0
    ? Math.max(40, 100 - (storeRank / topPerformers.length) * 60) // Top stores = 90-100, bottom = 40-50
    : 60; // Default if not found

  // 2. CREATIVE PERFORMANCE (based on overall confidence)
  // In Phase 3, we'll calculate this from campaign history
  // For now, derive from optimizer's confidence
  const creativePerformance = Math.max(50, rec.confidenceScore - 10); // Slightly lower than overall

  // 3. GEOGRAPHIC FIT (from regional performance)
  const storeRegion = rec.state;
  const regionData = regionalPerf.find(r => r.region === storeRegion);
  const topRegionRate = regionalPerf[0]?.conversionRate || 5;
  const storeRegionRate = regionData?.conversionRate || 3;
  const geographicFit = Math.min(100, (storeRegionRate / topRegionRate) * 100);

  // 4. TIMING ALIGNMENT (seasonal)
  // In Phase 3, we'll use getTimeBasedPatterns
  // For now, use a simple seasonal heuristic
  const peakMonths = [2, 3, 4, 9, 10, 11]; // Spring and Fall
  const timingAlignment = peakMonths.includes(currentMonth)
    ? Math.min(95, rec.confidenceScore + 10)
    : Math.max(60, rec.confidenceScore - 15);

  return {
    storePerformance: Math.round(storePerformance),
    creativePerformance: Math.round(creativePerformance),
    geographicFit: Math.round(geographicFit),
    timingAlignment: Math.round(timingAlignment),
  };
}

// ============================================================================
// REASONING GENERATION (Visual Bullet Points)
// ============================================================================

/**
 * Convert AI reasoning into user-friendly bullet points
 * Users see these explaining WHY the recommendation was made
 */
function generateReasoningBullets(
  rec: StoreRecommendation,
  factorScores: FactorScores,
  insights: string[]
): string[] {
  const bullets: string[] = [];

  // Use AI-generated reasoning as primary bullet
  if (rec.reasoning) {
    bullets.push(rec.reasoning);
  }

  // Add factor-specific insights
  if (factorScores.storePerformance >= 80) {
    bullets.push(`Strong historical performance at this location`);
  }

  if (factorScores.geographicFit >= 75) {
    bullets.push(`${rec.state} region shows strong fit for this campaign type`);
  }

  if (factorScores.timingAlignment >= 80) {
    bullets.push(`Seasonal timing aligns well with campaign message`);
  }

  // Add relevant overall insights
  if (insights.length > 0 && bullets.length < 4) {
    bullets.push(insights[0]);
  }

  // Ensure we have at least 2 bullets
  if (bullets.length < 2) {
    bullets.push(`Campaign expected to perform well at this store`);
  }

  return bullets.slice(0, 4); // Max 4 bullets for readability
}

// ============================================================================
// RISK DETECTION (Visual Warnings)
// ============================================================================

/**
 * Identify potential risks based on low scores
 * Users see these as warning badges
 */
function identifyRisks(
  confidence: number,
  factorScores: FactorScores,
  aiReasoning: string
): string[] {
  const risks: string[] = [];

  // Low overall confidence = general warning
  if (confidence < 60) {
    risks.push('Moderate confidence - review AI recommendation carefully');
  }

  // Low store performance
  if (factorScores.storePerformance < 50) {
    risks.push('Limited historical performance data for this store');
  }

  // Low geographic fit
  if (factorScores.geographicFit < 50) {
    risks.push('Geographic region shows lower performance for this campaign type');
  }

  // Low timing
  if (factorScores.timingAlignment < 60) {
    risks.push('Seasonal timing may not be optimal - consider adjusting schedule');
  }

  // Check AI reasoning for specific warnings
  if (aiReasoning.toLowerCase().includes('new') || aiReasoning.toLowerCase().includes('limited data')) {
    if (!risks.some(r => r.includes('Limited'))) {
      risks.push('New store with limited campaign history');
    }
  }

  return risks;
}

// ============================================================================
// HELPER: Normalize scores
// ============================================================================

/**
 * Normalize a value to 0-100 scale based on percentile
 */
function normalizeToPercentile(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 100);
}
