/**
 * Marketing Response Curve Modeling
 *
 * Implements scientifically rigorous response curves for direct mail campaigns
 * based on Marketing Mix Modeling (MMM) best practices.
 *
 * Key Concepts:
 * 1. DIMINISHING RETURNS: As quantity increases, conversion rate decreases
 * 2. MARKET SATURATION: Finite addressable market caps total conversions
 * 3. RESPONSE CURVES: Non-linear relationship between spend and response
 *
 * References:
 * - Marketing Mix Modeling (MMM) industry standards
 * - Adstock transformation with saturation
 * - Hill function (sigmoid curve)
 */

// ============================================================================
// RESPONSE CURVE MODELS
// ============================================================================

/**
 * Response Curve Configuration
 */
export interface ResponseCurveConfig {
  baseConversionRate: number; // Historical rate at "normal" quantity
  marketSize: number; // Estimated addressable market for this store
  saturationAlpha: number; // Shape parameter (0.5-2.0, typically ~1.0)
  halfSaturationPoint: number; // Quantity at which you get 50% of max response
}

/**
 * Response Curve Result
 */
export interface ResponseCurveResult {
  quantity: number;
  expectedConversions: number;
  effectiveConversionRate: number; // percentage
  saturationLevel: number; // 0-1, how saturated the market is
  efficiencyIndex: number; // 1.0 = baseline, <1.0 = diminishing returns
}

// ============================================================================
// MAIN RESPONSE CURVE FUNCTION
// ============================================================================

/**
 * Calculate expected performance using Hill Saturation Model
 *
 * This is the industry-standard approach used in Marketing Mix Modeling.
 *
 * Formula: response = max_response * (spend^alpha / (half_sat^alpha + spend^alpha))
 *
 * Characteristics:
 * - Concave curve (diminishing returns)
 * - Saturates at market cap
 * - Scientifically validated in marketing literature
 *
 * @param quantity - Number of direct mail pieces
 * @param config - Response curve configuration
 * @returns Response curve metrics
 */
export function calculateResponseCurve(
  quantity: number,
  config: ResponseCurveConfig
): ResponseCurveResult {
  const { baseConversionRate, marketSize, saturationAlpha, halfSaturationPoint } = config;

  // Hill Saturation Function
  // This models diminishing returns: first pieces are most effective
  const quantityPowAlpha = Math.pow(quantity, saturationAlpha);
  const halfSatPowAlpha = Math.pow(halfSaturationPoint, saturationAlpha);
  const saturationFactor = quantityPowAlpha / (halfSatPowAlpha + quantityPowAlpha);

  // Maximum possible conversions (market cap)
  const maxConversions = marketSize * (baseConversionRate / 100);

  // Expected conversions with saturation
  const expectedConversions = maxConversions * saturationFactor;

  // Effective conversion rate (declines as quantity increases)
  const effectiveConversionRate = (expectedConversions / quantity) * 100;

  // Efficiency index (how efficient vs. baseline)
  // 1.0 = as efficient as historical average
  // <1.0 = less efficient (diminishing returns)
  const efficiencyIndex = effectiveConversionRate / baseConversionRate;

  return {
    quantity,
    expectedConversions,
    effectiveConversionRate,
    saturationLevel: saturationFactor,
    efficiencyIndex,
  };
}

// ============================================================================
// CONFIGURATION ESTIMATION (when we don't have perfect data)
// ============================================================================

/**
 * Estimate response curve configuration from historical data
 *
 * Uses heuristics when we don't have enough data for curve fitting.
 */
export function estimateResponseConfig(
  storeHistoricalRate: number,
  storeHistoricalQuantity: number,
  storeRegion: string | null
): ResponseCurveConfig {
  // Base conversion rate from historical data
  const baseConversionRate = storeHistoricalRate;

  // Estimate market size based on historical quantity
  // Heuristic: Assume historical quantity reaches ~30-40% of market
  // This means doubling quantity won't double conversions
  const marketSizeMultiplier = 3.0; // Conservative estimate
  const marketSize = storeHistoricalQuantity * marketSizeMultiplier;

  // Saturation alpha (shape parameter)
  // Industry standard: 0.8-1.2
  // Lower = steeper curve (faster saturation)
  // Higher = gentler curve (slower saturation)
  const saturationAlpha = 1.0; // Moderate curve

  // Half-saturation point (diminishing returns start here)
  // Heuristic: 60% of estimated market size
  const halfSaturationPoint = marketSize * 0.6;

  return {
    baseConversionRate,
    marketSize,
    saturationAlpha,
    halfSaturationPoint,
  };
}

// ============================================================================
// ADVANCED: EMPIRICAL CURVE FITTING (for future ML integration)
// ============================================================================

/**
 * Fit response curve to historical campaign data
 *
 * Uses actual performance data to estimate curve parameters instead of heuristics.
 * Requires at least 3 campaigns at different quantity levels for meaningful fitting.
 *
 * Algorithm:
 * 1. Check if data has sufficient variation in quantities
 * 2. Estimate max_response from highest performing campaigns
 * 3. Estimate alpha (curve steepness) from rate of decline
 * 4. Estimate half_saturation from midpoint of quantity range
 * 5. Validate parameters are realistic
 *
 * @param historicalCampaigns - Array of {quantity, conversions} from past campaigns
 * @returns Fitted response curve configuration
 */
export function fitResponseCurveFromData(
  historicalCampaigns: Array<{ quantity: number; conversions: number }>
): ResponseCurveConfig {
  // Need at least 3 data points with varying quantities for fitting
  if (historicalCampaigns.length < 3) {
    // Fallback to heuristics
    if (historicalCampaigns.length === 0) {
      return {
        baseConversionRate: 3.0,
        marketSize: 10000,
        saturationAlpha: 1.0,
        halfSaturationPoint: 6000,
      };
    }

    const avgQuantity =
      historicalCampaigns.reduce((sum, c) => sum + c.quantity, 0) / historicalCampaigns.length;
    const avgConversions =
      historicalCampaigns.reduce((sum, c) => sum + c.conversions, 0) / historicalCampaigns.length;
    const avgRate = (avgConversions / avgQuantity) * 100;

    return estimateResponseConfig(avgRate, avgQuantity, null);
  }

  // Sort by quantity to analyze curve shape
  const sorted = [...historicalCampaigns].sort((a, b) => a.quantity - b.quantity);

  // Calculate conversion rates for each campaign
  const dataPoints = sorted.map((c) => ({
    quantity: c.quantity,
    conversions: c.conversions,
    rate: (c.conversions / c.quantity) * 100,
  }));

  // Check if there's sufficient quantity variation (need at least 2x range)
  const minQty = dataPoints[0].quantity;
  const maxQty = dataPoints[dataPoints.length - 1].quantity;
  const quantityRange = maxQty / minQty;

  if (quantityRange < 1.5) {
    // Not enough variation - use heuristics
    const avgRate = dataPoints.reduce((sum, d) => sum + d.rate, 0) / dataPoints.length;
    const avgQty = dataPoints.reduce((sum, d) => sum + d.quantity, 0) / dataPoints.length;
    return estimateResponseConfig(avgRate, avgQty, null);
  }

  // === DATA-DRIVEN CURVE FITTING ===

  // 1. Estimate base conversion rate from LOW quantity campaigns (most efficient)
  const lowQuantityPoints = dataPoints.slice(0, Math.ceil(dataPoints.length / 3));
  const baseConversionRate =
    lowQuantityPoints.reduce((sum, d) => sum + d.rate, 0) / lowQuantityPoints.length;

  // 2. Estimate market cap from highest performing campaigns
  // Use the top 90th percentile of conversions as proxy for max response
  const maxObservedConversions = Math.max(...dataPoints.map((d) => d.conversions));
  const estimatedMaxResponse = maxObservedConversions * 1.2; // 20% headroom above observed max

  // 3. Estimate market size from max response and base rate
  const marketSize = (estimatedMaxResponse / baseConversionRate) * 100;

  // 4. Estimate alpha (curve steepness) from rate of decline
  // Calculate how fast the rate drops as quantity increases
  let totalRateChange = 0;
  let totalQuantityChange = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    const rateChange = dataPoints[i - 1].rate - dataPoints[i].rate; // Positive if declining
    const qtyChange = dataPoints[i].quantity - dataPoints[i - 1].quantity;
    if (qtyChange > 0) {
      totalRateChange += rateChange;
      totalQuantityChange += qtyChange;
    }
  }

  const avgRateDeclinePerUnit = totalRateChange / totalQuantityChange;

  // Map rate decline to alpha parameter
  // Fast decline (steep curve) → low alpha (0.6-0.8)
  // Slow decline (gentle curve) → high alpha (1.2-1.5)
  let saturationAlpha;
  if (avgRateDeclinePerUnit > 0.002) {
    // Fast saturation
    saturationAlpha = 0.7;
  } else if (avgRateDeclinePerUnit > 0.001) {
    // Moderate saturation
    saturationAlpha = 1.0;
  } else if (avgRateDeclinePerUnit > 0.0005) {
    // Gentle saturation
    saturationAlpha = 1.3;
  } else {
    // Very gentle or no saturation yet
    saturationAlpha = 1.5;
  }

  // 5. Estimate half-saturation point
  // This is the quantity where we've reached ~50% of market cap
  // Use the midpoint of observed quantity range as starting estimate
  const midQuantity = (minQty + maxQty) / 2;
  const midConversions = dataPoints[Math.floor(dataPoints.length / 2)].conversions;
  const saturationLevelAtMid = midConversions / estimatedMaxResponse;

  // Adjust half-saturation based on observed saturation level
  let halfSaturationPoint;
  if (saturationLevelAtMid > 0.6) {
    // Already highly saturated at midpoint - half-sat must be lower
    halfSaturationPoint = midQuantity * 0.6;
  } else if (saturationLevelAtMid < 0.3) {
    // Not very saturated at midpoint - half-sat must be higher
    halfSaturationPoint = midQuantity * 1.5;
  } else {
    // Reasonable saturation at midpoint
    halfSaturationPoint = midQuantity;
  }

  // Validate parameters are within realistic bounds
  const finalAlpha = Math.max(0.6, Math.min(1.8, saturationAlpha));
  const finalMarketSize = Math.max(maxQty * 1.5, Math.min(maxQty * 10, marketSize));
  const finalHalfSat = Math.max(minQty * 0.5, Math.min(maxQty * 2, halfSaturationPoint));

  return {
    baseConversionRate: Math.max(0.5, Math.min(15, baseConversionRate)), // Clamp to realistic range
    marketSize: finalMarketSize,
    saturationAlpha: finalAlpha,
    halfSaturationPoint: finalHalfSat,
  };
}

// ============================================================================
// VALIDATION: COMPARE MODELS
// ============================================================================

/**
 * Compare linear model (WRONG) vs. response curve model (CORRECT)
 *
 * This demonstrates why linear scaling is incorrect.
 */
export function compareModels(quantity: number, baseRate: number) {
  // LINEAR MODEL (current, WRONG)
  const linearConversions = (quantity * baseRate) / 100;
  const linearRate = baseRate; // Never changes!

  // RESPONSE CURVE MODEL (correct)
  const config = estimateResponseConfig(baseRate, 1000, null);
  const curveResult = calculateResponseCurve(quantity, config);

  return {
    quantity,
    linear: {
      conversions: linearConversions,
      rate: linearRate,
      warning: 'INCORRECT: Assumes unlimited market, no saturation',
    },
    responseCurve: {
      conversions: curveResult.expectedConversions,
      rate: curveResult.effectiveConversionRate,
      saturation: `${(curveResult.saturationLevel * 100).toFixed(1)}% of market`,
      efficiency: `${(curveResult.efficiencyIndex * 100).toFixed(0)}% efficient`,
    },
  };
}
