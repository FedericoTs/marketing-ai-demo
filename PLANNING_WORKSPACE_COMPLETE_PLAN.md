# Planning Workspace - Complete Implementation Plan
**Goal**: Fully functional AI-powered campaign planning with REAL recommendations

---

## 🎯 Current Status Assessment

### ✅ ALREADY BUILT (Discovered!)

Your platform already has a **sophisticated AI recommendation engine**:

**1. Data Infrastructure**:
- ✅ `retail_store_performance_aggregates` - Pre-calculated performance metrics
- ✅ `retail_recommendations` - Recommendation storage
- ✅ `conversions` - Real conversion tracking
- ✅ `retail_campaign_deployments` - Deployment history

**2. Analytics Engine** (`lib/database/retail-analytics.ts`):
- ✅ `getStorePerformanceClusters()` - ML-style store segmentation
- ✅ `getTopPerformers()` - Historical performance ranking
- ✅ `getRegionalPerformance()` - Geographic analysis
- ✅ `getCorrelationAnalysis()` - Pattern detection
- ✅ `getTimeBasedPatterns()` - Seasonal/temporal trends

**3. AI Optimization** (`lib/ai/retail-optimizer.ts`):
- ✅ GPT-4o-powered campaign optimization
- ✅ Confidence scoring (0-100)
- ✅ Reasoning generation
- ✅ Predicted conversion rates
- ✅ Priority classification (high/medium/low)
- ✅ Insights and warnings

**4. Planning Workspace UI** (just built):
- ✅ Visual AI reasoning panel with 4-factor scores
- ✅ Color-coded confidence badges
- ✅ Risk warnings display
- ✅ Plan approval/execution workflow
- ✅ Complete backend API

### ⚠️ GAP IDENTIFIED

**The Planning Workspace and Retail Optimizer are NOT connected!**

The Planning Workspace uses **simulated seed data**, while the Retail Optimizer generates **real AI recommendations**. We need to bridge them.

---

## 📊 Architecture Map

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER (✅ EXISTS)                    │
├─────────────────────────────────────────────────────────────┤
│  • retail_store_performance_aggregates (conversion rates)   │
│  • conversions (actual conversion tracking)                 │
│  • retail_campaign_deployments (deployment history)         │
│  • campaigns, recipients, landing_pages                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              ANALYTICS ENGINE (✅ EXISTS)                    │
├─────────────────────────────────────────────────────────────┤
│  lib/database/retail-analytics.ts:                         │
│  • getStorePerformanceClusters() → Store segmentation      │
│  • getTopPerformers() → Best stores                        │
│  • getRegionalPerformance() → Geographic insights          │
│  • getCorrelationAnalysis() → Pattern detection            │
│  • getTimeBasedPatterns() → Seasonal trends                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               AI OPTIMIZER (✅ EXISTS)                       │
├─────────────────────────────────────────────────────────────┤
│  lib/ai/retail-optimizer.ts:                               │
│  • optimizeCampaignDeployment() → GPT-4o recommendations   │
│  • Returns: confidence, reasoning, predictions, priority   │
│  • Cost-optimized: $2.50/1M tokens (GPT-4o)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
                     ⚠️ GAP HERE ⚠️
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          PLANNING WORKSPACE (✅ UI, ⚠️ NO REAL DATA)       │
├─────────────────────────────────────────────────────────────┤
│  Currently: Uses simulated seed data                        │
│  Needed: Connect to AI optimizer                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Complete Implementation Plan

### **PHASE 2B: Core Integration** (Next Step!)

#### **Task 1: Create AI Scoring Adapter** (30 min)
**File**: `lib/ai/planning-ai-scorer.ts`

Bridge the Retail Optimizer output to Planning Workspace format:

```typescript
/**
 * Converts Retail Optimizer recommendations to Planning AI scores
 */
export async function generatePlanningRecommendations(
  campaignId: string,
  stores: Store[],
  campaignDetails: { name: string; message: string }
): Promise<PlanningRecommendation[]> {

  // 1. Get AI recommendations from existing optimizer
  const optimization = await optimizeCampaignDeployment({
    campaignName: campaignDetails.name,
    message: campaignDetails.message,
    desiredStoreCount: stores.length,
  });

  // 2. Map to Planning Workspace format
  return optimization.recommendedStores.map(rec => ({
    store_id: rec.storeId,
    campaign_id: campaignId,

    // Map confidence → AI scores
    ai_confidence: rec.confidenceScore,
    ai_confidence_level: rec.priority === 'high' ? 'high' :
                        rec.priority === 'medium' ? 'medium' : 'low',

    // Generate 4-factor breakdown from confidence
    ai_score_store_performance: calculateStoreScore(rec.storeId),
    ai_score_creative_performance: calculateCreativeScore(campaignId),
    ai_score_geographic_fit: calculateGeoScore(rec.storeId),
    ai_score_timing_alignment: calculateTimingScore(),

    // Use AI-generated reasoning
    ai_reasoning: [rec.reasoning],
    ai_risk_factors: extractRisks(rec.confidenceScore, rec.reasoning),

    // Use AI predictions
    ai_expected_conversion_rate: rec.predictedConversionRate,
    ai_expected_conversions: rec.estimatedConversions,
  }));
}
```

**Key Functions**:
- `calculateStoreScore()` - Uses `getTopPerformers()` data
- `calculateCreativeScore()` - Uses campaign historical performance
- `calculateGeoScore()` - Uses `getRegionalPerformance()` data
- `calculateTimingScore()` - Uses `getTimeBasedPatterns()` data

#### **Task 2: Add "Create Plan" API Endpoint** (20 min)
**File**: `app/api/campaigns/plans/generate/route.ts`

```typescript
POST /api/campaigns/plans/generate
Body: { campaignId, storeIds?, campaignName, message }

Flow:
1. Call generatePlanningRecommendations()
2. Create campaign_plans record
3. Bulk insert plan_items with AI scores
4. Return plan ID
```

#### **Task 3: Add Navigation Link** (5 min)
**File**: `components/sidebar.tsx`

Add "Planning" link to sidebar:
```tsx
<NavLink href="/campaigns/planning" icon={LayoutDashboard}>
  Planning
</NavLink>
```

#### **Task 4: Performance Matrix Integration** (40 min)
**File**: `components/campaigns/performance-matrix-grid.tsx`

Add "Create Plan from Selection" button:
- User selects stores in performance matrix
- Click "Create Plan" → Calls `/api/campaigns/plans/generate`
- Auto-populates with real AI recommendations
- Redirects to plan editor

---

### **PHASE 3: Enhanced AI Scoring** (Future - Complete the 4 factors)

#### **Task 1: Store Performance Score** (Real Calculation)
```typescript
function calculateStoreScore(storeId: string): number {
  const perf = getStorePerformanceData(storeId);

  // Normalize conversion rate to 0-100 scale
  // Top 10% stores = 90-100
  // Average stores = 50-70
  // Bottom 10% = 0-40

  return normalizeToPercentile(perf.conversionRate, allStores);
}
```

**Data Source**: `retail_store_performance_aggregates.conversion_rate`

#### **Task 2: Creative Performance Score** (Campaign History)
```typescript
function calculateCreativeScore(campaignId: string): number {
  const campaignHistory = getCampaignPerformanceAcrossStores(campaignId);

  // Average conversion rate across all deployments
  // Compare to platform average
  // Higher = better creative

  return normalizeAgainstAverage(
    campaignHistory.avgConversion,
    platformAverage
  );
}
```

**Data Source**: `retail_campaign_deployments` + `conversions`

#### **Task 3: Geographic Fit Score** (Regional Matching)
```typescript
function calculateGeoScore(storeId: string, campaignId: string): number {
  const store = getStore(storeId);
  const regionalPerf = getRegionalPerformance();

  // Find best-performing region for this campaign type
  // Compare store's region to that

  const storeRegionPerf = regionalPerf.find(r => r.region === store.state);
  const topRegionPerf = regionalPerf[0];

  return (storeRegionPerf.conversionRate / topRegionPerf.conversionRate) * 100;
}
```

**Data Source**: `getRegionalPerformance()` + store location

#### **Task 4: Timing Alignment Score** (Seasonal Patterns)
```typescript
function calculateTimingScore(currentDate: Date, campaignId: string): number {
  const patterns = getTimeBasedPatterns(campaignId);

  // Check if current month matches historical peak months
  // Higher score for peak season

  const currentMonth = currentDate.getMonth();
  const monthPerf = patterns.find(p => p.month === currentMonth);
  const bestMonth = patterns[0];

  return (monthPerf.avgConversion / bestMonth.avgConversion) * 100;
}
```

**Data Source**: `getTimeBasedPatterns()`

#### **Task 5: Dynamic Reasoning Generation** (LLM-Enhanced)
```typescript
async function generateDetailedReasoning(
  scores: AIScores,
  store: Store,
  campaign: Campaign
): Promise<string[]> {

  const prompt = `Generate 3-4 bullet points explaining why we recommend campaign "${campaign.name}" for store "${store.name}".

  Scores:
  - Store Performance: ${scores.store}/100
  - Creative Performance: ${scores.creative}/100
  - Geographic Fit: ${scores.geo}/100
  - Timing: ${scores.timing}/100

  Historical data:
  - Store conversion rate: ${store.avgConversion}%
  - Regional average: ${store.regionalAvg}%
  - Campaign success rate: ${campaign.successRate}%

  Format as brief, actionable bullet points.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Cheap for reasoning text
    messages: [{ role: 'user', content: prompt }],
  });

  return parseReasoningBullets(response);
}
```

#### **Task 6: Risk Detection** (Pattern-Based)
```typescript
function identifyRisks(scores: AIScores, store: Store, campaign: Campaign): string[] {
  const risks = [];

  if (scores.store < 50) {
    risks.push('Limited historical data for this store');
  }

  if (scores.creative < 50) {
    risks.push('Campaign has mixed results at similar stores');
  }

  if (scores.geo < 50) {
    risks.push('Geographic demographic mismatch with campaign target');
  }

  if (scores.timing < 60) {
    risks.push('Suboptimal seasonal timing - consider delaying to peak season');
  }

  if (store.deploymentCount < 3) {
    risks.push('New store with limited performance history');
  }

  return risks;
}
```

---

### **PHASE 4: Advanced Features** (Later)

#### **Auto-Refresh Recommendations**
- Recalculate AI scores when new conversion data arrives
- Update confidence levels based on latest performance
- Notify users of changing recommendations

#### **What-If Scenarios**
- "What if we delay by 1 month?" → Recalculate timing score
- "What if we double the quantity?" → Predict new conversions
- "What if we swap campaigns?" → Compare recommendations

#### **Learning Loop**
- Track plan execution results
- Compare predicted vs. actual conversions
- Tune scoring algorithms based on accuracy
- Store refinements in `retail_recommendations` table

#### **Confidence Intervals**
- Add uncertainty ranges to predictions
- "3.5 conversions (±1.2 with 95% confidence)"
- Visual error bars on charts

---

## 🎯 Implementation Priority

### **IMMEDIATE (This Session)**:
1. ✅ Add sidebar navigation link (5 min)
2. ✅ Create AI scoring adapter (30 min)
3. ✅ Add generate plan API (20 min)
4. ✅ Performance Matrix integration (40 min)

**Total**: ~2 hours to connect everything

### **NEXT SESSION (Complete the AI)**:
1. Real 4-factor score calculations (1 hour)
2. LLM-enhanced reasoning generation (30 min)
3. Risk detection logic (20 min)
4. Testing with real data (30 min)

**Total**: ~2 hours to make AI fully real

### **FUTURE** (Nice-to-have):
1. Auto-refresh recommendations
2. What-if scenarios
3. Learning loop
4. Advanced analytics

---

## 💰 Cost Analysis

**Current State**: $0.00 (simulated data)

**With Real AI**:
- Planning workspace generation: ~$0.05 per plan (GPT-4o)
- 20 plans/day × $0.05 = **$1.00/day** = **$30/month**
- Reasoning generation: ~$0.01 per store (GPT-4o-mini)
- 100 stores/day × $0.01 = **$1.00/day** = **$30/month**

**Total AI cost**: ~$60/month for full real-time AI recommendations

**Performance**:
- Plan generation: ~5-10 seconds (includes GPT-4o call)
- UI is instant (pre-calculated scores)

---

## ✅ Success Criteria

### **Phase 2B Complete When**:
- ✅ User can create plan from Performance Matrix
- ✅ Plan uses REAL AI recommendations (not simulated)
- ✅ Confidence scores based on actual performance data
- ✅ Reasoning references real metrics
- ✅ Navigation link added to sidebar

### **Phase 3 Complete When**:
- ✅ All 4 factor scores calculated from real data
- ✅ LLM generates contextual reasoning
- ✅ Risk detection uses pattern analysis
- ✅ Predictions match actual conversion rates (within 20%)

### **Phase 4 Complete When**:
- ✅ Auto-refresh works
- ✅ What-if scenarios functional
- ✅ Learning loop improves accuracy over time
- ✅ Confidence intervals displayed

---

## 📁 Files to Create/Modify

### **New Files**:
1. `lib/ai/planning-ai-scorer.ts` - AI scoring adapter
2. `app/api/campaigns/plans/generate/route.ts` - Plan generation endpoint

### **Modified Files**:
1. `components/sidebar.tsx` - Add navigation link
2. `components/campaigns/performance-matrix-grid.tsx` - Add create plan button
3. `lib/database/planning-queries.ts` - Add bulk insert helper (if needed)

### **Future Files** (Phase 3):
1. `lib/ai/score-calculators.ts` - Real score calculation functions
2. `lib/ai/reasoning-generator.ts` - LLM-enhanced reasoning
3. `lib/ai/risk-detector.ts` - Pattern-based risk analysis

---

## 🎉 Summary

**You already have 80% of a real AI recommendation engine!**

What's needed:
- ✅ Bridge the existing AI optimizer to Planning Workspace (Phase 2B)
- ✅ Refine 4-factor scoring with real calculations (Phase 3)
- ✅ Enhance reasoning with LLM (Phase 3)

The foundation is solid. We just need to connect the pieces and polish the AI.

**Next Action**: Implement Phase 2B tasks (2 hours) to make Planning Workspace fully functional with REAL AI.
