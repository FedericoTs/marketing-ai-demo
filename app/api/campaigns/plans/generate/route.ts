/**
 * AI-Powered Plan Generation API
 *
 * POST /api/campaigns/plans/generate
 *
 * User Experience:
 * - User clicks "Create Plan" button
 * - Sees loading: "AI is analyzing stores and campaigns..."
 * - Gets redirected to plan editor with beautiful visual AI reasoning
 *
 * Under the hood:
 * - Calls GPT-4o optimizer
 * - Calculates 4-factor scores
 * - Generates reasoning bullets
 * - Creates plan with all AI data
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { generatePlanningRecommendations } from '@/lib/ai/planning-ai-scorer';
import { createPlan, bulkCreatePlanItems, updatePlanAggregates } from '@/lib/database/planning-queries';
import type { CreatePlanInput, CreatePlanItemInput } from '@/types/planning';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      planName,
      planDescription,
      campaignId,
      campaignName,
      campaignMessage,
      storeIds,
      desiredStoreCount,
    } = body;

    // Validation
    if (!planName || !campaignId || !campaignName || !campaignMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: planName, campaignId, campaignName, campaignMessage',
        },
        { status: 400 }
      );
    }

    console.log('🤖 Generating AI-powered plan:', planName);

    // =================================================================
    // STEP 1: Generate AI Recommendations (GPT-4o + Analytics)
    // =================================================================

    const aiResult = await generatePlanningRecommendations({
      planName,
      planDescription,
      campaignId,
      campaignName,
      campaignMessage,
      storeIds,
      desiredStoreCount: desiredStoreCount || 10,
    });

    console.log(`✅ AI generated ${aiResult.recommendations.length} recommendations`);

    // =================================================================
    // STEP 2: Create Campaign Plan
    // =================================================================

    const planId = `plan_${nanoid(12)}`;

    const planInput: CreatePlanInput = {
      id: planId,
      name: aiResult.planData.name,
      description: aiResult.planData.description,
      status: 'draft',
      notes: `AI-generated plan. Insights: ${aiResult.insights.slice(0, 2).join('; ')}`,
    };

    const plan = createPlan(planInput);
    console.log(`✅ Created plan: ${plan.id}`);

    // =================================================================
    // STEP 3: Bulk Insert Plan Items with AI Scores
    // =================================================================

    console.log('[Plan Generation] Using planId:', planId);
    console.log('[Plan Generation] First recommendation:', aiResult.recommendations[0]);

    const planItems: CreatePlanItemInput[] = aiResult.recommendations.map((rec) => ({
      plan_id: planId,
      store_id: rec.store_id,
      store_number: rec.store_number,
      store_name: rec.store_name,

      campaign_id: rec.campaign_id,
      campaign_name: rec.campaign_name,
      quantity: rec.quantity,
      unit_cost: rec.unit_cost,
      total_cost: rec.total_cost,

      wave: null, // User can assign waves later
      wave_name: null,
      is_included: true,

      // AI Recommendation Data (same as recommended for Phase 2B)
      ai_recommended_campaign_id: rec.campaign_id,
      ai_recommended_campaign_name: rec.campaign_name,
      ai_recommended_quantity: rec.quantity,

      // AI Confidence & Scoring
      ai_confidence: rec.ai_confidence,
      ai_confidence_level: rec.ai_confidence_level,

      // 4-Factor Scores (VISUAL KPIs - users see colored bars)
      ai_score_store_performance: rec.ai_score_store_performance,
      ai_score_creative_performance: rec.ai_score_creative_performance,
      ai_score_geographic_fit: rec.ai_score_geographic_fit,
      ai_score_timing_alignment: rec.ai_score_timing_alignment,

      // Reasoning & Risks (VISUAL - users see bullets and warnings)
      ai_reasoning: rec.ai_reasoning,
      ai_risk_factors: rec.ai_risk_factors,

      // Predictions (VISUAL - users see KPI numbers)
      ai_expected_conversion_rate: rec.ai_expected_conversion_rate,
      ai_expected_conversions: rec.ai_expected_conversions,

      // Auto-approval
      ai_auto_approved: rec.ai_auto_approved,
      ai_status_reason: null, // Optional: reason for auto-approval status
    }));

    const createdItems = bulkCreatePlanItems(planItems);
    console.log(`✅ Created ${createdItems.length} plan items with AI scores`);

    // =================================================================
    // STEP 4: Update Plan Aggregates
    // =================================================================

    updatePlanAggregates(planId);
    console.log(`✅ Updated plan aggregates`);

    // =================================================================
    // STEP 5: Return Success with Plan ID
    // =================================================================

    return NextResponse.json({
      success: true,
      data: {
        planId: plan.id,
        planName: plan.name,
        itemCount: createdItems.length,
        insights: aiResult.insights,
        warnings: aiResult.warnings,
      },
      message: `AI-powered plan created with ${createdItems.length} recommendations`,
    });

  } catch (error: any) {
    console.error('❌ Error generating AI-powered plan:', error);

    // User-friendly error messages
    let errorMessage = 'Failed to generate AI-powered plan';

    if (error.message?.includes('OpenAI API key')) {
      errorMessage = 'AI service not configured. Please add OpenAI API key to settings.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'AI service is busy. Please try again in a moment.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
