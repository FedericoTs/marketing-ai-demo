# Adaptive Response Curve System - Data-Driven Performance Prediction

## Executive Summary

The system now **adapts to actual historical performance data** instead of relying purely on fixed heuristics. As you run more campaigns and collect real conversion data, the response curve parameters automatically adjust to reflect your actual market behavior.

---

## How It Works

### Phase 1: Initial State (< 3 campaigns)
**Data Available**: Limited or no historical campaigns
**Behavior**: Uses conservative heuristic estimates
- Base conversion rate: From aggregated historical data
- Curve shape (alpha): Fixed at 1.0 (moderate saturation)
- Market size: 3x historical quantity (conservative)
- Half-saturation: 60% of market size

**Console Output**:
```
⚠️ Insufficient historical data for store store123, using heuristic curve
```

### Phase 2: Learning Phase (≥ 3 campaigns with quantity variation)
**Data Available**: Multiple completed campaigns at different quantity levels
**Behavior**: Fits curve parameters to ACTUAL performance
- Base conversion rate: Calculated from low-quantity campaigns (most efficient)
- Curve shape (alpha): Estimated from rate of decline in actual data
  - Fast decline → steep curve (alpha = 0.7)
  - Slow decline → gentle curve (alpha = 1.5)
- Market size: Derived from highest performing campaigns
- Half-saturation: Estimated from midpoint saturation level

**Console Output**:
```
📊 Fitting response curve from 8 historical campaigns for store store123
```

---

## Example: How the System Learns

### Scenario: Store "Downtown Location"

**Month 1-2: Heuristic Mode**
- Campaign 1: 1000 pieces → 30 conversions (3.0%)
- Campaign 2: 1200 pieces → 34 conversions (2.83%)
- **System**: Uses fixed curve (alpha=1.0, market cap=3000)

**Month 3: Transition to Data-Driven**
- Campaign 3: 2000 pieces → 52 conversions (2.6%)
- **System**: Now has 3 campaigns with variation → FITS CURVE!

**Curve Fitting Analysis**:
```
Data points:
  1000 pieces → 3.00% rate
  1200 pieces → 2.83% rate (decline: 0.17% per 200 pieces)
  2000 pieces → 2.60% rate (decline: 0.23% per 800 pieces)

Average rate decline: 0.001 per piece

Fitted parameters:
  baseConversionRate: 3.00% (from low-quantity campaigns)
  saturationAlpha: 1.0 (moderate decline = moderate curve)
  marketSize: 7500 (max conversions * 1.2 / base rate)
  halfSaturationPoint: 4500 (based on midpoint saturation)
```

**Month 4-6: Continued Learning**
- Campaign 4: 5000 pieces → 100 conversions (2.0%)
- Campaign 5: 500 pieces → 17 conversions (3.4%)
- Campaign 6: 3000 pieces → 70 conversions (2.33%)

**Updated Curve Fitting**:
```
New data shows:
  - Higher efficiency at low quantities (3.4% at 500)
  - Faster decline than expected (2.0% at 5000)

Refitted parameters:
  baseConversionRate: 3.30% (updated from new low-qty data)
  saturationAlpha: 0.85 (faster decline = steeper curve)
  marketSize: 8200 (adjusted upward from new data)
  halfSaturationPoint: 3800 (adjusted based on actual saturation)
```

**Result**: Predictions now match THIS STORE's actual behavior, not a generic model!

---

## What Adapts Over Time

### 1. **Base Conversion Rate** ✅ ADAPTIVE
- **Initial**: Average of all historical data
- **After 3+ campaigns**: Average of LOW-quantity campaigns (most efficient)
- **Continually updates** as new campaigns are added

### 2. **Curve Steepness (Alpha)** ✅ ADAPTIVE
- **Initial**: Fixed at 1.0
- **After 3+ campaigns**: Calculated from actual rate of decline
  - Store shows fast saturation → alpha = 0.7 (steep curve)
  - Store shows slow saturation → alpha = 1.5 (gentle curve)
- **Example**:
  - If doubling quantity drops rate by 30% → steep curve (alpha ≈ 0.7)
  - If doubling quantity drops rate by 10% → gentle curve (alpha ≈ 1.3)

### 3. **Market Size** ✅ ADAPTIVE
- **Initial**: 3x historical quantity (heuristic)
- **After 3+ campaigns**: Based on highest observed conversions + 20% headroom
- **Updates** as you reach higher quantities and observe actual market cap

### 4. **Half-Saturation Point** ✅ ADAPTIVE
- **Initial**: 60% of estimated market size
- **After 3+ campaigns**: Estimated from midpoint saturation level in actual data
- **Adjusts** based on where diminishing returns actually begin

---

## Data Requirements for Adaptation

### Minimum Requirements
- **≥ 3 completed campaigns** for the same store
- **Quantity variation** of at least 1.5x (e.g., 1000, 1500, 2000)
- **Status**: Campaigns must be `completed` (not pending/active)

### Optimal Requirements
- **≥ 8-10 completed campaigns** for robust fitting
- **Quantity variation** spanning 3-5x range (e.g., 500 to 2500)
- **Mix of quantities**: Some low, some medium, some high
- **Recent data**: System uses last 20 campaigns (most recent data)

### Example of Good Data
```
Campaign 1: 500 pieces → 18 conversions (3.6%)
Campaign 2: 1000 pieces → 32 conversions (3.2%)
Campaign 3: 1500 pieces → 44 conversions (2.93%)
Campaign 4: 2000 pieces → 54 conversions (2.7%)
Campaign 5: 3000 pieces → 75 conversions (2.5%)
Campaign 6: 5000 pieces → 110 conversions (2.2%)
```
✅ **6 campaigns, 10x quantity range, clear saturation pattern**

### Example of Insufficient Data
```
Campaign 1: 1000 pieces → 30 conversions
Campaign 2: 1100 pieces → 32 conversions
Campaign 3: 1050 pieces → 31 conversions
```
❌ **Only 1.1x quantity range, not enough variation to detect curve shape**

---

## How to Verify Adaptation is Working

### 1. Check Console Logs
When you run a campaign plan with overrides, look for:
```bash
# Heuristic mode (not enough data):
⚠️ Insufficient historical data for store ABC123, using heuristic curve

# Adaptive mode (data-driven):
📊 Fitting response curve from 6 historical campaigns for store ABC123
```

### 2. Compare Predictions Over Time
**Early predictions** (heuristic mode):
- All stores use same curve shape (alpha=1.0)
- Generic market size estimates (3x historical quantity)

**Later predictions** (adaptive mode):
- Each store has unique curve shape based on ITS data
- Market size reflects actual observed performance
- Predictions more accurate as they're trained on real conversions

### 3. Database Query
Check how much historical data exists:
```sql
SELECT
  s.name,
  COUNT(DISTINCT d.id) as campaigns,
  MIN(rdr_count) as min_recipients,
  MAX(rdr_count) as max_recipients,
  ROUND(MAX(rdr_count) * 1.0 / MIN(rdr_count), 2) as quantity_range
FROM retail_stores s
JOIN retail_campaign_deployments d ON s.id = d.store_id
JOIN (
  SELECT deployment_id, COUNT(*) as rdr_count
  FROM retail_deployment_recipients
  GROUP BY deployment_id
) rdr ON d.id = rdr.deployment_id
WHERE d.status = 'completed'
GROUP BY s.id
HAVING campaigns >= 3 AND quantity_range >= 1.5
ORDER BY campaigns DESC;
```

This shows stores that have enough data for adaptive curve fitting.

---

## Comparison: Heuristic vs. Adaptive

### Store A: "Generic Heuristic Curve"
**Historical Data**: 2 campaigns (not enough)
**Curve Parameters**:
- Base rate: 3.2% (from average)
- Alpha: 1.0 (fixed heuristic)
- Market size: 3000 (3x heuristic)
- Half-saturation: 1800 (60% heuristic)

**Prediction for 5000 pieces**:
- Expected rate: 2.1% (based on generic curve)
- Expected conversions: 105

**Actual Result**: 95 conversions (1.9%)
❌ **10% prediction error** because curve doesn't match this store's behavior

---

### Store B: "Data-Driven Adaptive Curve"
**Historical Data**: 8 campaigns at varying quantities
**Curve Parameters**:
- Base rate: 3.8% (from actual low-qty performance)
- Alpha: 0.75 (steep curve - fitted from actual data)
- Market size: 8500 (from actual max conversions)
- Half-saturation: 3200 (from actual midpoint saturation)

**Prediction for 5000 pieces**:
- Expected rate: 2.25% (based on fitted curve)
- Expected conversions: 112

**Actual Result**: 115 conversions (2.3%)
✅ **3% prediction error** because curve learned from this store's behavior

---

## Benefits of Adaptive System

### 1. **Personalized to Each Store**
- High-performing stores: Curve reflects their superior conversion rates
- Saturating quickly: Steep curve warns against over-mailing
- Saturating slowly: Gentle curve allows higher quantities

### 2. **Improves Over Time**
- Month 1: Generic predictions (heuristic)
- Month 3: Basic adaptation (3 campaigns)
- Month 6: Accurate predictions (8+ campaigns)
- Month 12: Highly personalized (20+ campaigns)

### 3. **Self-Correcting**
- If predictions are off, new data automatically corrects the curve
- No manual intervention needed
- System learns from mistakes

### 4. **Maintains Scientific Rigor**
- Still uses Hill Saturation Function (industry standard)
- Parameters are data-driven, not arbitrary
- Validates parameters are within realistic bounds

---

## Limitations & Future Enhancements

### Current Limitations
1. **Simple parameter estimation**: Uses heuristics to map data to curve parameters
2. **No confidence intervals**: Doesn't quantify uncertainty in fitted parameters
3. **No outlier detection**: Anomalous campaigns can skew the fit
4. **No time decay**: All historical data weighted equally (old and new)

### Phase 3: Advanced ML Integration (Future)
When ready for more sophisticated modeling:

#### **Non-Linear Least Squares Regression**
```typescript
// Fit Hill function parameters using Levenberg-Marquardt algorithm
function fitHillCurveLSQ(data: Array<{qty: number, conv: number}>) {
  // Minimize: Σ(observed - predicted)²
  // Optimize: alpha, half_saturation, max_response
  // Returns: best-fit parameters with R² score
}
```

#### **Bayesian Hierarchical Modeling**
```typescript
// Pool data across similar stores with shrinkage estimation
function fitBayesianHierarchical(allStoresData) {
  // Stores with little data: shrink toward group average
  // Stores with lots of data: use their own estimates
  // Accounts for uncertainty in parameters
}
```

#### **Time-Series Aware**
```typescript
// Weight recent data more heavily than old data
function fitWithTimeDecay(campaigns, decayFactor = 0.9) {
  // Recent campaigns: full weight
  // 3-month-old campaigns: 0.9^3 = 0.73x weight
  // 6-month-old campaigns: 0.9^6 = 0.53x weight
}
```

---

## How to Populate More Data for Testing

If you want to test the adaptive system with synthetic data:

```sql
-- Create test campaigns with varying quantities
INSERT INTO retail_campaign_deployments (id, store_id, status, created_at)
VALUES
  ('test_camp_1', 'store123', 'completed', datetime('now', '-90 days')),
  ('test_camp_2', 'store123', 'completed', datetime('now', '-80 days')),
  ('test_camp_3', 'store123', 'completed', datetime('now', '-70 days')),
  ('test_camp_4', 'store123', 'completed', datetime('now', '-60 days')),
  ('test_camp_5', 'store123', 'completed', datetime('now', '-50 days'));

-- Add recipients (varying quantities)
-- Campaign 1: 500 recipients
-- Campaign 2: 1000 recipients
-- Campaign 3: 2000 recipients
-- Campaign 4: 3000 recipients
-- Campaign 5: 5000 recipients

-- Add conversions following a realistic saturation curve
-- Campaign 1: 18 conversions (3.6%)
-- Campaign 2: 32 conversions (3.2%)
-- Campaign 3: 54 conversions (2.7%)
-- Campaign 4: 75 conversions (2.5%)
-- Campaign 5: 110 conversions (2.2%)
```

---

## Conclusion

The system is now **fully adaptive** and will:
1. ✅ Use heuristics when data is limited (safe fallback)
2. ✅ Automatically detect when enough data exists (≥3 campaigns)
3. ✅ Fit curve parameters to actual performance data
4. ✅ Update predictions as new campaigns are completed
5. ✅ Provide more accurate forecasts over time

**Key Takeaway**: The more campaigns you run, the smarter the system gets. It learns YOUR market's actual response curve, not a generic theoretical model.

---

*Implementation Complete: 2025-10-25*
*Author: Claude (Anthropic)*
