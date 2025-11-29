/**
 * PLANNING WORKSPACE TYPE DEFINITIONS
 * ====================================
 * Ultra-simple, user-friendly types for campaign planning
 *
 * Design Principles:
 * 1. CLARITY: Types match database 1:1, no confusion
 * 2. VISUAL: All AI reasoning data exposed for UI
 * 3. TYPE SAFETY: Strict TypeScript for zero runtime errors
 * 4. SIMPLICITY: No complex unions, clear status enums
 */

// ============================================================================
// CORE ENUMS (Ultra-Simple: Minimal states)
// ============================================================================

/**
 * Plan workflow status
 * SIMPLICITY: Only 3 states, clear progression
 */
export type PlanStatus = 'draft' | 'approved' | 'executed';

/**
 * AI confidence level
 * VISUAL: Maps to colors (high=green, medium=yellow, low=red)
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Wave code (simple string tags)
 * Examples: 'W1', 'W2', 'W3', 'W4'
 */
export type WaveCode = string;

/**
 * Activity log actions (for audit trail)
 */
export type PlanActivityAction =
  | 'created'
  | 'edited'
  | 'approved'
  | 'executed'
  | 'item_changed'
  | 'item_added'
  | 'item_removed'
  | 'wave_created'
  | 'wave_updated';

// ============================================================================
// PRIMARY ENTITIES
// ============================================================================

/**
 * Campaign Plan (Master)
 * ----------------------
 * Represents one monthly DM deployment plan
 * User sees: "March 2025 DM Wave" with status "Draft"
 */
export interface CampaignPlan {
  // Identity
  id: string; // nanoid (e.g., 'plan_abc123')
  name: string; // User-friendly (e.g., "March 2025 DM Wave")
  description: string | null; // Optional explanation

  // Workflow
  status: PlanStatus; // draft | approved | executed
  created_by: string | null; // User ID/email (future: multi-user)

  // Timestamps
  created_at: string; // ISO 8601
  updated_at: string;
  approved_at: string | null; // When approved
  executed_at: string | null; // When orders created

  // Summary (VISUAL: Show in dashboard cards)
  total_stores: number; // How many stores total
  total_quantity: number; // Sum of all DM pieces
  estimated_cost: number; // Total cost in dollars
  expected_conversions: number; // AI-predicted conversions
  avg_confidence: number; // Average AI confidence (0-100)

  // Wave summary (JSON for flexibility)
  // Example: [{"wave": "W1", "stores": 25, "cost": 1500}]
  wave_summary: WaveSummaryItem[] | null;

  // Notes
  notes: string | null; // Free-form user notes
}

/**
 * Wave Summary Item (part of CampaignPlan.wave_summary)
 * VISUAL: Show in plan overview
 */
export interface WaveSummaryItem {
  wave: WaveCode; // 'W1', 'W2', etc.
  wave_name: string; // 'Week 1', 'Week 2'
  stores: number;
  quantity: number;
  cost: number;
  start_date?: string; // Optional
  end_date?: string; // Optional
}

/**
 * Plan Item (Store-Level Planning)
 * ---------------------------------
 * One row = One store's campaign assignment
 * User sees: "STR-001: Spring Sale, 100 pieces, Wave 1"
 */
export interface PlanItem {
  // Identity
  id: string; // nanoid
  plan_id: string; // FK to CampaignPlan

  // Store reference (DENORMALIZED for speed)
  store_id: string; // FK to retail_stores
  store_number: string; // e.g., "STR-001"
  store_name: string; // e.g., "San Francisco Downtown"

  // Current decision (what user chose)
  campaign_id: string; // FK to campaigns
  campaign_name: string; // Denormalized for display
  quantity: number; // How many DM pieces
  unit_cost: number; // Cost per piece (default $0.05)
  total_cost: number; // quantity * unit_cost

  // Wave assignment
  wave: WaveCode | null; // 'W1', 'W2', null=unassigned
  wave_name: string | null; // 'Week 1 (Mar 1-7)'

  // Inclusion status (SIMPLICITY: Boolean)
  is_included: boolean; // true=included, false=excluded
  exclude_reason: string | null; // If excluded, why?

  // Override tracking (AUDIT TRAIL)
  is_overridden: boolean; // Did user change AI recommendation?
  override_notes: string | null; // User's explanation

  // ========================================================================
  // AI RECOMMENDATION DATA (VISUAL REASONING)
  // ========================================================================
  // Original AI suggestion (preserved forever)

  ai_recommended_campaign_id: string | null;
  ai_recommended_campaign_name: string | null;
  ai_recommended_quantity: number | null;

  // Overall confidence (VISUAL: Show as percentage + badge)
  ai_confidence: number | null; // 0-100
  ai_confidence_level: ConfidenceLevel | null; // high | medium | low

  // Score breakdown (VISUAL: Show as 4 horizontal bars)
  // Each score 0-100
  ai_score_store_performance: number | null; // Historical conversions
  ai_score_creative_performance: number | null; // Creative fit
  ai_score_geographic_fit: number | null; // Regional alignment
  ai_score_timing_alignment: number | null; // Seasonal fit

  // Reasoning (VISUAL: Show as bullet list)
  // JSON array: ["Strong historical performance", "High regional fit"]
  ai_reasoning: string[] | null;

  // Risk factors (VISUAL: Show as warning badges)
  // JSON array: ["Low historical data", "Recent underperformance"]
  ai_risk_factors: string[] | null;

  // Expected outcome (VISUAL: Show as prediction)
  ai_expected_conversion_rate: number | null; // Percentage (e.g., 2.5)
  ai_expected_conversions: number | null; // Count (e.g., 2.5 conversions)

  // Auto-approval (VISUAL: Show as badge)
  ai_auto_approved: boolean | null; // Was this auto-approved?
  ai_status_reason: string | null; // Why auto-approved or needs review

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Plan Wave (Optional: Structured wave metadata)
 * -----------------------------------------------
 * Defines deployment waves with dates and budgets
 * User sees: "Week 1: Mar 1-7, 25 stores, $1,500"
 */
export interface PlanWave {
  // Identity
  id: string; // nanoid
  plan_id: string; // FK to CampaignPlan

  // Wave metadata
  wave_code: WaveCode; // 'W1', 'W2', etc.
  wave_name: string; // 'Week 1', 'Week 2'
  wave_description: string | null; // Optional explanation

  // Timing
  start_date: string | null; // ISO 8601 date
  end_date: string | null;

  // Budget (optional)
  budget_allocated: number | null;

  // Summary (DENORMALIZED - auto-calculated)
  stores_count: number;
  total_quantity: number;
  total_cost: number;

  // Ordering
  display_order: number; // Sort order (1, 2, 3...)

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Plan Activity Log (Audit Trail)
 * --------------------------------
 * Tracks all changes to plans
 * User sees: "Change History" timeline
 */
export interface PlanActivityLog {
  // Identity
  id: string; // nanoid
  plan_id: string; // FK to CampaignPlan

  // What happened?
  action: PlanActivityAction;
  entity_type: 'plan' | 'plan_item' | 'wave';
  entity_id: string | null; // ID of affected entity

  // Details (JSON for flexibility)
  // Example: {field: "campaign_id", old: "camp_123", new: "camp_456"}
  change_details: ChangeDetails | null;

  // Who & When
  user_id: string | null; // Who made the change
  created_at: string;

  // User note
  notes: string | null;
}

/**
 * Change Details (part of PlanActivityLog)
 */
export interface ChangeDetails {
  field?: string; // Which field changed
  old_value?: any; // Previous value
  new_value?: any; // New value
  reason?: string; // Why changed
  [key: string]: any; // Allow additional fields
}

// ============================================================================
// VIEW TYPES (For simplified queries)
// ============================================================================

/**
 * Plan Summary View
 * -----------------
 * Aggregated plan data for dashboard
 * PERFORMANCE: One query gets all summary stats
 */
export interface PlanSummaryView extends CampaignPlan {
  // Breakdown counts
  included_stores: number;
  excluded_stores: number;
  overridden_stores: number;
  auto_approved_stores: number;

  // Wave count
  waves_count: number;

  // Confidence distribution (VISUAL: Show pie chart)
  high_confidence_stores: number;
  medium_confidence_stores: number;
  low_confidence_stores: number;
}

/**
 * Alias for backwards compatibility
 */
export type PlanSummary = PlanSummaryView;

/**
 * Plan Item with Store Details View
 * ----------------------------------
 * Plan item + full store context
 * VISUAL: Show store location, region in grid
 */
export interface PlanItemWithStoreDetails extends PlanItem {
  // Store details (from retail_stores)
  city: string | null;
  state: string | null;
  region: string | null;
  address: string | null;

  // Computed field (VISUAL: Show as badge)
  recommendation_source: 'User Override' | 'Auto-Approved' | 'AI Recommended';
}

// ============================================================================
// REQUEST/RESPONSE TYPES (For API routes)
// ============================================================================

/**
 * Create Plan Request
 * User action: "Create Plan from Matrix"
 */
export interface CreatePlanRequest {
  name: string; // "March 2025 DM Wave"
  description?: string; // Optional
  items: CreatePlanItemRequest[]; // Store recommendations
  waves?: CreateWaveRequest[]; // Optional wave definitions
  notes?: string; // Optional user notes
}

/**
 * Create Plan Item Request (part of CreatePlanRequest)
 */
export interface CreatePlanItemRequest {
  store_id: string;
  store_number: string;
  store_name: string;
  campaign_id: string;
  campaign_name: string;
  quantity: number;
  wave?: WaveCode; // Optional wave assignment
  is_included?: boolean; // Default true

  // AI recommendation data (from Matrix)
  ai_data?: {
    recommended_campaign_id: string;
    recommended_campaign_name: string;
    recommended_quantity: number;
    confidence: number;
    confidence_level: ConfidenceLevel;
    score_breakdown: {
      store_performance: number;
      creative_performance: number;
      geographic_fit: number;
      timing_alignment: number;
    };
    reasoning: string[];
    risk_factors?: string[];
    expected_conversion_rate: number;
    expected_conversions: number;
    auto_approved: boolean;
    status_reason: string;
  };
}

/**
 * Create Wave Request (part of CreatePlanRequest)
 */
export interface CreateWaveRequest {
  wave_code: WaveCode;
  wave_name: string;
  wave_description?: string;
  start_date?: string;
  end_date?: string;
  budget_allocated?: number;
  display_order: number;
}

/**
 * Update Plan Request
 * User action: "Save Draft"
 */
export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  notes?: string;
  // Items and waves updated separately via dedicated endpoints
}

// ============================================================================
// DATABASE INPUT TYPES (For planning-queries.ts)
// ============================================================================

/**
 * Create Plan Input (for createPlan function)
 * Direct database insertion - minimal fields required
 */
export interface CreatePlanInput {
  id?: string; // Optional - will generate if not provided
  name: string;
  description?: string;
  status?: PlanStatus;
  created_by?: string;
  notes?: string;
}

/**
 * Update Plan Input (for updatePlan function)
 */
export interface UpdatePlanInput {
  name?: string;
  description?: string;
  notes?: string;
}

/**
 * Create Plan Item Input (for createPlanItem function)
 */
export interface CreatePlanItemInput {
  plan_id: string;
  store_id: string;
  store_number: string;
  store_name: string;
  campaign_id: string;
  campaign_name: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  wave?: WaveCode | null;
  wave_name?: string | null;
  is_included?: boolean;
  exclude_reason?: string | null;
  is_overridden?: boolean;
  override_notes?: string | null;

  // AI recommendation fields
  ai_recommended_campaign_id?: string | null;
  ai_recommended_campaign_name?: string | null;
  ai_recommended_quantity?: number | null;
  ai_confidence?: number | null;
  ai_confidence_level?: ConfidenceLevel | null;
  ai_score_store_performance?: number | null;
  ai_score_creative_performance?: number | null;
  ai_score_geographic_fit?: number | null;
  ai_score_timing_alignment?: number | null;
  ai_reasoning?: string[] | null;
  ai_risk_factors?: string[] | null;
  ai_expected_conversion_rate?: number | null;
  ai_expected_conversions?: number | null;
  ai_auto_approved?: boolean | null;
  ai_status_reason?: string | null;
}

/**
 * Update Plan Item Input (for updatePlanItem function)
 */
export interface UpdatePlanItemInput {
  campaign_id?: string;
  campaign_name?: string;
  quantity?: number;
  unit_cost?: number;
  wave?: WaveCode | null;
  wave_name?: string | null;
  is_included?: boolean;
  exclude_reason?: string;
  is_overridden?: boolean;
  override_notes?: string;
}

/**
 * Create Wave Input (for createWave function)
 */
export interface CreateWaveInput {
  plan_id: string;
  wave_code: WaveCode;
  wave_name: string;
  wave_description?: string;
  start_date?: string;
  end_date?: string;
  budget_allocated?: number;
  display_order: number;
}

/**
 * Update Wave Input (for updateWave function)
 */
export interface UpdateWaveInput {
  wave_name?: string;
  wave_description?: string;
  start_date?: string;
  end_date?: string;
  budget_allocated?: number;
  display_order?: number;
}

/**
 * Update Plan Item Request
 * User action: "Change campaign" or "Adjust quantity"
 */
export interface UpdatePlanItemRequest {
  campaign_id?: string;
  campaign_name?: string;
  quantity?: number;
  wave?: WaveCode | null;
  is_included?: boolean;
  exclude_reason?: string;
  override_notes?: string; // If user changed from AI recommendation
}

/**
 * Approve Plan Request
 * User action: "Approve Plan"
 */
export interface ApprovePlanRequest {
  notes?: string; // Optional approval notes
}

/**
 * Execute Plan Request
 * User action: "Create Orders from Plan"
 */
export interface ExecutePlanRequest {
  order_grouping: 'per_wave' | 'master' | 'per_campaign';
  // per_wave: Create one order for each wave
  // master: Create one order for all items
  // per_campaign: Create one order per campaign

  supplier_email?: string; // Email to send PDFs
  order_notes?: string; // Notes for all generated orders
}

/**
 * Execute Plan Response
 * Result: Order IDs created
 */
export interface ExecutePlanResponse {
  success: boolean;
  orders: Array<{
    order_id: string;
    order_number: string;
    wave?: WaveCode;
    campaign_id?: string;
    stores_count: number;
    total_quantity: number;
    total_cost: number;
    pdf_url?: string;
  }>;
}

// ============================================================================
// UI HELPER TYPES
// ============================================================================

/**
 * Plan Grid Row (for table display)
 * VISUAL: Simplified data for planning grid UI
 */
export interface PlanGridRow {
  id: string;
  store_number: string;
  store_name: string;
  location: string; // "San Francisco, CA"
  campaign_name: string;
  campaign_id: string;
  quantity: number;
  cost: number;
  wave: WaveCode | null;
  wave_name: string | null;
  is_included: boolean;
  is_overridden: boolean;

  // AI visual indicators
  ai_confidence: number | null;
  ai_confidence_level: ConfidenceLevel | null;
  ai_badge: 'auto-approved' | 'needs-review' | 'override' | null;

  // Actions available
  can_edit: boolean; // Based on plan status
  can_exclude: boolean;
}

/**
 * AI Reasoning Panel Data
 * VISUAL: Data for AI recommendation sidebar/modal
 */
export interface AIReasoningPanelData {
  store_name: string;
  store_number: string;

  // Recommended vs Selected
  recommended: {
    campaign_name: string;
    quantity: number;
  };
  selected: {
    campaign_name: string;
    quantity: number;
  };
  is_overridden: boolean;
  override_notes: string | null;

  // Confidence visualization
  confidence: number;
  confidence_level: ConfidenceLevel;
  confidence_color: 'green' | 'yellow' | 'red';

  // Score breakdown (for bar charts)
  scores: {
    store_performance: { value: number; label: string };
    creative_performance: { value: number; label: string };
    geographic_fit: { value: number; label: string };
    timing_alignment: { value: number; label: string };
  };

  // Reasoning bullets
  reasoning: string[];
  risk_factors: string[];

  // Prediction
  expected_conversion_rate: number;
  expected_conversions: number;
}

/**
 * Wave Board Column (for Kanban view)
 * VISUAL: Data for wave board UI
 */
export interface WaveBoardColumn {
  wave_code: WaveCode | 'unassigned';
  wave_name: string; // "Week 1 (Mar 1-7)" or "Unassigned"
  stores_count: number;
  total_quantity: number;
  total_cost: number;
  items: PlanGridRow[]; // Stores in this wave
}

// ============================================================================
// UTILITY FUNCTIONS (Type guards and helpers)
// ============================================================================

/**
 * Check if plan is editable
 */
export function isPlanEditable(plan: CampaignPlan): boolean {
  return plan.status === 'draft';
}

/**
 * Check if plan is locked (approved or executed)
 */
export function isPlanLocked(plan: CampaignPlan): boolean {
  return plan.status === 'approved' || plan.status === 'executed';
}

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 75) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

/**
 * Get confidence color for UI
 */
export function getConfidenceColor(level: ConfidenceLevel): 'green' | 'yellow' | 'red' {
  switch (level) {
    case 'high':
      return 'green';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'red';
  }
}

/**
 * Format location string
 */
export function formatLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return 'Unknown';
}

/**
 * Parse wave summary JSON safely
 */
export function parseWaveSummary(waveSummaryJson: string | null): WaveSummaryItem[] {
  if (!waveSummaryJson) return [];
  try {
    return JSON.parse(waveSummaryJson);
  } catch {
    return [];
  }
}

/**
 * Parse AI reasoning JSON safely
 */
export function parseAIReasoning(reasoningJson: string | null): string[] {
  if (!reasoningJson) return [];
  try {
    const parsed = JSON.parse(reasoningJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Parse AI risk factors JSON safely
 */
export function parseAIRiskFactors(riskFactorsJson: string | null): string[] {
  if (!riskFactorsJson) return [];
  try {
    const parsed = JSON.parse(riskFactorsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Calculate average confidence across plan items
 */
export function calculateAverageConfidence(items: PlanItem[]): number {
  const withConfidence = items.filter(item => item.ai_confidence !== null);
  if (withConfidence.length === 0) return 0;

  const sum = withConfidence.reduce((acc, item) => acc + (item.ai_confidence || 0), 0);
  return sum / withConfidence.length;
}

/**
 * Calculate total cost
 */
export function calculateTotalCost(items: PlanItem[]): number {
  return items
    .filter(item => item.is_included)
    .reduce((acc, item) => acc + item.total_cost, 0);
}

/**
 * Calculate total quantity
 */
export function calculateTotalQuantity(items: PlanItem[]): number {
  return items
    .filter(item => item.is_included)
    .reduce((acc, item) => acc + item.quantity, 0);
}

/**
 * Calculate expected conversions
 */
export function calculateExpectedConversions(items: PlanItem[]): number {
  return items
    .filter(item => item.is_included && item.ai_expected_conversions !== null)
    .reduce((acc, item) => acc + (item.ai_expected_conversions || 0), 0);
}
