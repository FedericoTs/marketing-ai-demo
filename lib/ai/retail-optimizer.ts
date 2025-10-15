import OpenAI from 'openai';
import {
  getStorePerformanceClusters,
  getCorrelationAnalysis,
  getTimeBasedPatterns,
  getTopPerformers,
  getRegionalPerformance,
} from '../database/retail-analytics';

/**
 * AI-Powered Retail Campaign Optimization
 * Smart model selection for cost optimization:
 * - Simple insights: GPT-4o-mini ($0.15/1M tokens)
 * - Campaign optimization: GPT-4o ($2.50/1M tokens)
 * - Critical decisions: GPT-4 ($30/1M tokens)
 */

// ==================== TYPE DEFINITIONS ====================

export interface CampaignOptimizationRequest {
  campaignName: string;
  message: string;
  targetAudience?: string;
  budget?: number;
  desiredStoreCount?: number;
}

export interface StoreRecommendation {
  storeId: string;
  storeNumber: string;
  storeName: string;
  city: string;
  state: string;
  confidenceScore: number; // 0-100
  reasoning: string;
  predictedConversionRate: number;
  estimatedConversions: number;
  priority: 'high' | 'medium' | 'low';
}

export interface OptimizationResult {
  recommendedStores: StoreRecommendation[];
  expectedTotalConversions: number;
  expectedConversionRate: number;
  budgetAllocation?: Array<{
    storeId: string;
    allocatedBudget: number;
    recipientCount: number;
  }>;
  insights: string[];
  warnings: string[];
}

export interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'recommendation';
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
}

// ==================== AI CLIENT ====================

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({ apiKey });
}

// ==================== CAMPAIGN OPTIMIZATION ====================

/**
 * Optimize campaign deployment across stores
 * Uses GPT-4o for balanced cost/quality
 */
export async function optimizeCampaignDeployment(
  request: CampaignOptimizationRequest
): Promise<OptimizationResult> {
  try {
    // Get statistical data (no AI cost)
    const clusters = getStorePerformanceClusters();
    const topPerformers = getTopPerformers(20, 'conversion_rate');
    const regionalPerf = getRegionalPerformance();
    const correlations = getCorrelationAnalysis();

    // Prepare context for AI
    const highPerformers = clusters.find((c) => c.cluster === 'high')?.stores || [];
    const storeCount = request.desiredStoreCount || 15;

    // Build analysis context
    const context = {
      highPerformingStores: highPerformers.slice(0, storeCount),
      topRegions: regionalPerf.slice(0, 3),
      keyInsights: correlations.map((c) => c.description),
      campaignInfo: {
        name: request.campaignName,
        message: request.message,
        audience: request.targetAudience || 'General',
      },
    };

    // Use GPT-4o for optimization (balanced cost/quality)
    const openai = getOpenAIClient();

    const prompt = `You are a retail marketing optimization expert. Analyze the following data and provide campaign deployment recommendations.

CAMPAIGN DETAILS:
- Name: ${request.campaignName}
- Message: ${request.message}
- Target Audience: ${request.targetAudience || 'General'}

AVAILABLE HIGH-PERFORMING STORES:
${topPerformers
  .slice(0, storeCount)
  .map(
    (s, i) =>
      `${i + 1}. ${s.name} (${s.city}, ${s.state}) - ${s.conversion_rate.toFixed(1)}% conversion rate, ${s.conversions} conversions from ${s.recipients} recipients`
  )
  .join('\n')}

TOP PERFORMING REGIONS:
${regionalPerf.slice(0, 3).map((r) => `- ${r.region}: ${r.conversionRate.toFixed(1)}% conversion rate`).join('\n')}

KEY INSIGHTS:
${correlations.map((c) => `- ${c.description}`).join('\n')}

TASK:
Select the top ${storeCount} stores for this campaign and provide:
1. A JSON array of recommended store IDs with confidence scores (0-100)
2. Brief reasoning for each recommendation (one sentence)
3. Predicted conversion rate for each store
4. Priority level (high/medium/low)

Format your response as JSON:
{
  "recommendations": [
    {
      "storeId": "store_id_here",
      "confidenceScore": 85,
      "reasoning": "Strong historical performance in target demographic",
      "predictedConversionRate": 12.5,
      "priority": "high"
    }
  ],
  "overallInsights": ["insight 1", "insight 2"],
  "warnings": ["warning 1 if any"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Balanced cost/quality
      messages: [
        {
          role: 'system',
          content:
            'You are a retail analytics expert. Provide data-driven recommendations in JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      response_format: { type: 'json_object' },
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}');

    // Map AI recommendations to our format
    const recommendations: StoreRecommendation[] = (aiResponse.recommendations || [])
      .map((rec: any) => {
        const store = topPerformers.find((s) => s.id === rec.storeId);
        if (!store) return null;

        return {
          storeId: store.id,
          storeNumber: store.store_number,
          storeName: store.name,
          city: store.city || '',
          state: store.state || '',
          confidenceScore: rec.confidenceScore || 70,
          reasoning: rec.reasoning || 'Strong historical performance',
          predictedConversionRate: rec.predictedConversionRate || store.conversion_rate,
          estimatedConversions: Math.round(
            (rec.predictedConversionRate || store.conversion_rate) * 0.5
          ), // Estimate: 50 recipients per store
          priority: rec.priority || 'medium',
        };
      })
      .filter(Boolean) as StoreRecommendation[];

    // Calculate expected totals
    const expectedConversions = recommendations.reduce(
      (sum, r) => sum + r.estimatedConversions,
      0
    );
    const expectedRate =
      recommendations.reduce((sum, r) => sum + r.predictedConversionRate, 0) /
      (recommendations.length || 1);

    // Budget allocation (if budget provided)
    let budgetAllocation;
    if (request.budget) {
      const budgetPerStore = request.budget / recommendations.length;
      budgetAllocation = recommendations.map((r) => ({
        storeId: r.storeId,
        allocatedBudget: budgetPerStore,
        recipientCount: Math.round(budgetPerStore / 2), // Assume $2 per recipient
      }));
    }

    return {
      recommendedStores: recommendations,
      expectedTotalConversions: expectedConversions,
      expectedConversionRate: expectedRate,
      budgetAllocation,
      insights: aiResponse.overallInsights || [],
      warnings: aiResponse.warnings || [],
    };
  } catch (error) {
    console.error('Campaign optimization error:', error);

    // Fallback: Return top performers without AI
    const topPerformers = getTopPerformers(request.desiredStoreCount || 15);

    return {
      recommendedStores: topPerformers.map((store) => ({
        storeId: store.id,
        storeNumber: store.store_number,
        storeName: store.name,
        city: store.city,
        state: store.state,
        confidenceScore: 75,
        reasoning: 'Top historical performer',
        predictedConversionRate: store.conversion_rate,
        estimatedConversions: Math.round(store.conversion_rate * 0.5),
        priority: 'medium' as const,
      })),
      expectedTotalConversions: 0,
      expectedConversionRate: 0,
      insights: ['Using fallback recommendations based on historical performance'],
      warnings: ['AI optimization unavailable - using statistical ranking'],
    };
  }
}

// ==================== GENERATE AI INSIGHTS ====================

/**
 * Generate AI-powered insights from retail data
 * Uses GPT-4o-mini for cost efficiency (simple task)
 */
export async function generateRetailInsights(): Promise<AIInsight[]> {
  try {
    // Get statistical data
    const summary = await import('../database/retail-analytics').then((m) =>
      m.getRetailAnalyticsSummary()
    );
    const clusters = getStorePerformanceClusters();
    const correlations = getCorrelationAnalysis();
    const timePatterns = getTimeBasedPatterns('dayofweek');

    const openai = getOpenAIClient();

    const prompt = `Analyze this retail campaign data and generate 3-5 actionable insights.

DATA:
- Total Stores: ${summary.totalStores}
- Overall Conversion Rate: ${summary.overallConversionRate.toFixed(1)}%
- Total Conversions: ${summary.totalConversions}
- High Performers: ${clusters.find((c) => c.cluster === 'high')?.storeCount || 0} stores
- Low Performers: ${clusters.find((c) => c.cluster === 'low')?.storeCount || 0} stores

CORRELATIONS:
${correlations.map((c) => `- ${c.description}`).join('\n')}

BEST DAY: ${timePatterns.sort((a, b) => b.conversionRate - a.conversionRate)[0]?.period}

Generate insights as JSON array:
[
  {
    "type": "success|warning|info|recommendation",
    "title": "Short title",
    "description": "Detailed insight",
    "actionable": true,
    "action": "What to do"
  }
]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cheapest model for simple insights
      messages: [
        {
          role: 'system',
          content: 'You are a retail analytics expert. Generate actionable insights in JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const response = JSON.parse(completion.choices[0].message.content || '{"insights":[]}');
    return response.insights || [];
  } catch (error) {
    console.error('Error generating insights:', error);

    // Fallback: Return basic statistical insights
    const summary = await import('../database/retail-analytics').then((m) =>
      m.getRetailAnalyticsSummary()
    );

    return [
      {
        type: 'info',
        title: 'Overall Performance',
        description: `Your campaigns have achieved ${summary.overallConversionRate.toFixed(1)}% conversion rate across ${summary.totalStores} stores.`,
        actionable: false,
      },
    ];
  }
}

// ==================== ANOMALY DETECTION ====================

export interface PerformanceAnomaly {
  storeId: string;
  storeName: string;
  anomalyType: 'sudden_drop' | 'sudden_spike' | 'zero_performance' | 'inconsistent';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
}

/**
 * Detect performance anomalies
 * Pure statistical analysis - no AI cost
 */
export async function detectAnomalies(): Promise<PerformanceAnomaly[]> {
  const anomalies: PerformanceAnomaly[] = [];

  // This would require historical performance tracking
  // For now, return empty (to be implemented with time-series data)

  return anomalies;
}
