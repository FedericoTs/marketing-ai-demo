/**
 * Planning Workspace Database Queries
 * Phase 1: CRUD operations for campaign planning system
 *
 * Design Principles:
 * - SIMPLICITY: Clear function names, straightforward logic
 * - TYPE SAFETY: Full TypeScript types from types/planning.ts
 * - PERFORMANCE: Optimized queries with proper indexing
 * - AUDITABILITY: Activity logging for all mutations
 */

import { getDatabase } from './connection';
import { nanoid } from 'nanoid';
import type {
  CampaignPlan,
  PlanItem,
  PlanWave,
  PlanActivityLog,
  CreatePlanInput,
  UpdatePlanInput,
  CreatePlanItemInput,
  UpdatePlanItemInput,
  CreateWaveInput,
  UpdateWaveInput,
  PlanSummary,
  PlanItemWithStoreDetails,
  PlanStatus,
  WaveCode,
} from '@/types/planning';

// ============================================================================
// CAMPAIGN PLANS - Master plan CRUD operations
// ============================================================================

/**
 * Create a new campaign plan
 * @param input Plan creation data
 * @returns Created plan with ID
 */
export function createPlan(input: CreatePlanInput): CampaignPlan {
  const db = getDatabase();
  const id = `plan_${nanoid(12)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO campaign_plans (
      id, name, description, status, created_by,
      created_at, updated_at,
      total_stores, total_quantity, estimated_cost, expected_conversions, avg_confidence,
      wave_summary, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.name,
    input.description || null,
    'draft', // Always start as draft
    input.created_by || null,
    now,
    now,
    0, // Will be updated when items added
    0,
    0,
    0,
    0,
    null, // Wave summary calculated later
    input.notes || null
  );

  // Log activity
  logActivity({
    plan_id: id,
    action: 'created',
    entity_type: 'plan',
    entity_id: id,
    notes: `Plan created: ${input.name}`,
  });

  return getPlanById(id)!;
}

/**
 * Get campaign plan by ID
 * @param id Plan ID
 * @returns Plan or null if not found
 */
export function getPlanById(id: string): CampaignPlan | null {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM campaign_plans WHERE id = ?
  `);

  const plan = stmt.get(id) as CampaignPlan | undefined;
  if (!plan) return null;

  // Parse JSON fields
  if (plan.wave_summary) {
    plan.wave_summary = JSON.parse(plan.wave_summary as unknown as string);
  }

  return plan;
}

/**
 * Get all campaign plans with optional filtering
 * @param filters Optional status filter
 * @returns Array of plans
 */
export function getAllPlans(filters?: { status?: PlanStatus }): CampaignPlan[] {
  const db = getDatabase();

  let query = 'SELECT * FROM campaign_plans';
  const params: any[] = [];

  if (filters?.status) {
    query += ' WHERE status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const plans = stmt.all(...params) as CampaignPlan[];

  // Parse JSON fields
  return plans.map(plan => {
    if (plan.wave_summary) {
      plan.wave_summary = JSON.parse(plan.wave_summary as unknown as string);
    }
    return plan;
  });
}

/**
 * Update campaign plan metadata
 * @param id Plan ID
 * @param input Update data
 * @returns Updated plan
 */
export function updatePlan(id: string, input: UpdatePlanInput): CampaignPlan {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description);
  }
  if (input.notes !== undefined) {
    updates.push('notes = ?');
    params.push(input.notes);
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`
    UPDATE campaign_plans
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...params);

  // Log activity
  logActivity({
    plan_id: id,
    action: 'edited',
    entity_type: 'plan',
    entity_id: id,
    change_details: JSON.stringify(input),
    notes: 'Plan metadata updated',
  });

  return getPlanById(id)!;
}

/**
 * Delete campaign plan (cascades to items, waves, logs)
 * @param id Plan ID
 */
export function deletePlan(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM campaign_plans WHERE id = ?');
  stmt.run(id);
}

/**
 * Approve plan (change status to approved)
 * @param id Plan ID
 * @returns Updated plan
 */
export function approvePlan(id: string): CampaignPlan {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE campaign_plans
    SET status = 'approved', approved_at = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(now, now, id);

  logActivity({
    plan_id: id,
    action: 'approved',
    entity_type: 'plan',
    entity_id: id,
    notes: 'Plan approved for execution',
  });

  return getPlanById(id)!;
}

/**
 * Execute plan (change status to executed, creates orders)
 * @param id Plan ID
 * @returns Updated plan
 */
export function executePlan(id: string): CampaignPlan {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE campaign_plans
    SET status = 'executed', executed_at = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(now, now, id);

  logActivity({
    plan_id: id,
    action: 'executed',
    entity_type: 'plan',
    entity_id: id,
    notes: 'Plan executed, orders created',
  });

  return getPlanById(id)!;
}

// ============================================================================
// PLAN ITEMS - Store-level planning CRUD operations
// ============================================================================

/**
 * Create a new plan item (add store to plan)
 * @param input Item creation data
 * @returns Created item with ID
 */
export function createPlanItem(input: CreatePlanItemInput): PlanItem {
  const db = getDatabase();
  const id = `item_${nanoid(12)}`;
  const now = new Date().toISOString();

  console.log(`[createPlanItem] Creating item for plan_id: ${input.plan_id}, store: ${input.store_name}`);

  const stmt = db.prepare(`
    INSERT INTO plan_items (
      id, plan_id, store_id, store_number, store_name,
      campaign_id, campaign_name, quantity, unit_cost, total_cost,
      wave, wave_name,
      is_included, exclude_reason,
      is_overridden, override_notes,
      ai_recommended_campaign_id, ai_recommended_campaign_name, ai_recommended_quantity,
      ai_confidence, ai_confidence_level,
      ai_score_store_performance, ai_score_creative_performance,
      ai_score_geographic_fit, ai_score_timing_alignment,
      ai_reasoning, ai_risk_factors,
      ai_expected_conversion_rate, ai_expected_conversions,
      ai_auto_approved, ai_status_reason,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?,
      ?, ?
    )
  `);

  stmt.run(
    id,
    input.plan_id,
    input.store_id,
    input.store_number,
    input.store_name,
    input.campaign_id,
    input.campaign_name,
    input.quantity,
    input.unit_cost || 0.05,
    input.quantity * (input.unit_cost || 0.05),
    input.wave || null,
    input.wave_name || null,
    input.is_included !== undefined ? (typeof input.is_included === 'boolean' ? (input.is_included ? 1 : 0) : input.is_included) : 1,
    input.exclude_reason || null,
    input.is_overridden !== undefined ? (typeof input.is_overridden === 'boolean' ? (input.is_overridden ? 1 : 0) : input.is_overridden) : 0,
    input.override_notes || null,
    input.ai_recommended_campaign_id || null,
    input.ai_recommended_campaign_name || null,
    input.ai_recommended_quantity || null,
    input.ai_confidence || null,
    input.ai_confidence_level || null,
    input.ai_score_store_performance || null,
    input.ai_score_creative_performance || null,
    input.ai_score_geographic_fit || null,
    input.ai_score_timing_alignment || null,
    input.ai_reasoning ? JSON.stringify(input.ai_reasoning) : null,
    input.ai_risk_factors ? JSON.stringify(input.ai_risk_factors) : null,
    input.ai_expected_conversion_rate || null,
    input.ai_expected_conversions || null,
    input.ai_auto_approved !== undefined ? (input.ai_auto_approved ? 1 : 0) : null,
    input.ai_status_reason || null,
    now,
    now
  );

  // Update plan aggregates
  updatePlanAggregates(input.plan_id);

  // Log activity
  logActivity({
    plan_id: input.plan_id,
    action: 'item_changed',
    entity_type: 'plan_item',
    entity_id: id,
    notes: `Store added: ${input.store_name}`,
  });

  return getPlanItemById(id)!;
}

/**
 * Get plan item by ID
 * @param id Item ID
 * @returns Item or null
 */
export function getPlanItemById(id: string): PlanItem | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM plan_items WHERE id = ?');
  const item = stmt.get(id) as PlanItem | undefined;

  if (!item) return null;

  // Parse JSON fields
  if (item.ai_reasoning) {
    item.ai_reasoning = JSON.parse(item.ai_reasoning as unknown as string);
  }
  if (item.ai_risk_factors) {
    item.ai_risk_factors = JSON.parse(item.ai_risk_factors as unknown as string);
  }

  return item;
}

/**
 * Get all plan items for a plan
 * @param planId Plan ID
 * @returns Array of items
 */
export function getPlanItems(planId: string): PlanItem[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM plan_items WHERE plan_id = ? ORDER BY store_number');
  const items = stmt.all(planId) as PlanItem[];

  // Parse JSON fields
  return items.map(item => {
    if (item.ai_reasoning) {
      item.ai_reasoning = JSON.parse(item.ai_reasoning as unknown as string);
    }
    if (item.ai_risk_factors) {
      item.ai_risk_factors = JSON.parse(item.ai_risk_factors as unknown as string);
    }
    return item;
  });
}

/**
 * Update plan item (user override, wave assignment, etc.)
 * @param id Item ID
 * @param input Update data
 * @returns Updated item
 */
export function updatePlanItem(id: string, input: UpdatePlanItemInput): PlanItem {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];

  if (input.campaign_id !== undefined) {
    updates.push('campaign_id = ?', 'campaign_name = ?');
    params.push(input.campaign_id, input.campaign_name!);
    updates.push('is_overridden = 1'); // Mark as overridden if campaign changed
  }
  if (input.quantity !== undefined) {
    updates.push('quantity = ?', 'total_cost = quantity * unit_cost');
    params.push(input.quantity);
  }
  if (input.wave !== undefined) {
    updates.push('wave = ?');
    params.push(input.wave);
  }
  if (input.wave_name !== undefined) {
    updates.push('wave_name = ?');
    params.push(input.wave_name);
  }
  if (input.is_included !== undefined) {
    updates.push('is_included = ?');
    params.push(input.is_included);
  }
  if (input.exclude_reason !== undefined) {
    updates.push('exclude_reason = ?');
    params.push(input.exclude_reason);
  }
  if (input.override_notes !== undefined) {
    updates.push('override_notes = ?');
    params.push(input.override_notes);
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`
    UPDATE plan_items
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...params);

  // Get plan_id for aggregate update
  const item = getPlanItemById(id)!;
  updatePlanAggregates(item.plan_id);

  // Log activity
  logActivity({
    plan_id: item.plan_id,
    action: 'item_changed',
    entity_type: 'plan_item',
    entity_id: id,
    change_details: JSON.stringify(input),
    notes: 'Plan item updated',
  });

  return getPlanItemById(id)!;
}

/**
 * Delete plan item
 * @param id Item ID
 */
export function deletePlanItem(id: string): void {
  const db = getDatabase();

  // Get plan_id before deleting
  const item = getPlanItemById(id);
  if (!item) return;

  const stmt = db.prepare('DELETE FROM plan_items WHERE id = ?');
  stmt.run(id);

  // Update aggregates
  updatePlanAggregates(item.plan_id);

  // Log activity
  logActivity({
    plan_id: item.plan_id,
    action: 'item_changed',
    entity_type: 'plan_item',
    entity_id: id,
    notes: `Store removed: ${item.store_name}`,
  });
}

/**
 * Bulk create plan items (for AI-generated recommendations)
 * @param items Array of items to create
 * @returns Array of created items
 */
export function bulkCreatePlanItems(items: CreatePlanItemInput[]): PlanItem[] {
  const db = getDatabase();

  // Use transaction for performance
  const insertMany = db.transaction((itemsToInsert: CreatePlanItemInput[]) => {
    const createdItems: PlanItem[] = [];
    for (const item of itemsToInsert) {
      createdItems.push(createPlanItem(item));
    }
    return createdItems;
  });

  const created = insertMany(items);

  // Update aggregates once at the end
  if (items.length > 0) {
    updatePlanAggregates(items[0].plan_id);
  }

  return created;
}

// ============================================================================
// PLAN WAVES - Wave management CRUD operations
// ============================================================================

/**
 * Create a new wave
 * @param input Wave creation data
 * @returns Created wave with ID
 */
export function createWave(input: CreateWaveInput): PlanWave {
  const db = getDatabase();
  const id = `wave_${nanoid(12)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO plan_waves (
      id, plan_id, wave_code, wave_name, wave_description,
      start_date, end_date, budget_allocated,
      stores_count, total_quantity, total_cost,
      display_order, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.plan_id,
    input.wave_code,
    input.wave_name,
    input.wave_description || null,
    input.start_date || null,
    input.end_date || null,
    input.budget_allocated || null,
    0, // Will be updated when items assigned
    0,
    0,
    input.display_order || 0,
    now,
    now
  );

  return getWaveById(id)!;
}

/**
 * Get wave by ID
 * @param id Wave ID
 * @returns Wave or null
 */
export function getWaveById(id: string): PlanWave | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM plan_waves WHERE id = ?');
  return stmt.get(id) as PlanWave | undefined || null;
}

/**
 * Get all waves for a plan
 * @param planId Plan ID
 * @returns Array of waves
 */
export function getWaves(planId: string): PlanWave[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM plan_waves WHERE plan_id = ? ORDER BY display_order');
  return stmt.all(planId) as PlanWave[];
}

/**
 * Update wave
 * @param id Wave ID
 * @param input Update data
 * @returns Updated wave
 */
export function updateWave(id: string, input: UpdateWaveInput): PlanWave {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const params: any[] = [];

  if (input.wave_name !== undefined) {
    updates.push('wave_name = ?');
    params.push(input.wave_name);
  }
  if (input.wave_description !== undefined) {
    updates.push('wave_description = ?');
    params.push(input.wave_description);
  }
  if (input.start_date !== undefined) {
    updates.push('start_date = ?');
    params.push(input.start_date);
  }
  if (input.end_date !== undefined) {
    updates.push('end_date = ?');
    params.push(input.end_date);
  }
  if (input.budget_allocated !== undefined) {
    updates.push('budget_allocated = ?');
    params.push(input.budget_allocated);
  }
  if (input.display_order !== undefined) {
    updates.push('display_order = ?');
    params.push(input.display_order);
  }

  updates.push('updated_at = ?');
  params.push(now);
  params.push(id);

  const stmt = db.prepare(`
    UPDATE plan_waves
    SET ${updates.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...params);

  return getWaveById(id)!;
}

/**
 * Delete wave
 * @param id Wave ID
 */
export function deleteWave(id: string): void {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM plan_waves WHERE id = ?');
  stmt.run(id);
}

// ============================================================================
// ACTIVITY LOG - Audit trail operations
// ============================================================================

/**
 * Log activity for audit trail
 * @param input Activity data
 */
export function logActivity(input: {
  plan_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  change_details?: string;
  user_id?: string;
  notes?: string;
}): void {
  const db = getDatabase();
  const id = `log_${nanoid(12)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO plan_activity_log (
      id, plan_id, action, entity_type, entity_id,
      change_details, user_id, created_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.plan_id,
    input.action,
    input.entity_type,
    input.entity_id || null,
    input.change_details || null,
    input.user_id || null,
    now,
    input.notes || null
  );
}

/**
 * Get activity log for a plan
 * @param planId Plan ID
 * @returns Array of activity entries
 */
export function getActivityLog(planId: string): PlanActivityLog[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM plan_activity_log WHERE plan_id = ? ORDER BY created_at DESC');
  return stmt.all(planId) as PlanActivityLog[];
}

// ============================================================================
// AGGREGATION & SUMMARY QUERIES - Performance-optimized views
// ============================================================================

/**
 * Get plan summary with all aggregated stats (uses plan_summary view)
 * @param planId Plan ID
 * @returns Plan summary with stats
 */
export function getPlanSummary(planId: string): PlanSummary | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM plan_summary WHERE id = ?');
  const summary = stmt.get(planId) as PlanSummary | undefined;

  if (!summary) return null;

  // Parse JSON fields
  if (summary.wave_summary) {
    summary.wave_summary = JSON.parse(summary.wave_summary as unknown as string);
  }

  return summary;
}

/**
 * Get all plan summaries with optional filtering
 * @param filters Optional status filter
 * @returns Array of plan summaries
 */
export function getAllPlanSummaries(filters?: { status?: PlanStatus }): PlanSummary[] {
  const db = getDatabase();

  let query = 'SELECT * FROM plan_summary';
  const params: any[] = [];

  if (filters?.status) {
    query += ' WHERE status = ?';
    params.push(filters.status);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = db.prepare(query);
  const summaries = stmt.all(...params) as PlanSummary[];

  // Parse JSON fields
  return summaries.map(summary => {
    if (summary.wave_summary) {
      summary.wave_summary = JSON.parse(summary.wave_summary as unknown as string);
    }
    return summary;
  });
}

/**
 * Get plan items with full store details (uses plan_item_with_store_details view)
 * @param planId Plan ID
 * @returns Array of items with store context
 */
export function getPlanItemsWithStoreDetails(planId: string): PlanItemWithStoreDetails[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM plan_item_with_store_details WHERE plan_id = ? ORDER BY store_number');
  const items = stmt.all(planId) as PlanItemWithStoreDetails[];

  // Parse JSON fields
  return items.map(item => {
    if (item.ai_reasoning) {
      item.ai_reasoning = JSON.parse(item.ai_reasoning as unknown as string);
    }
    if (item.ai_risk_factors) {
      item.ai_risk_factors = JSON.parse(item.ai_risk_factors as unknown as string);
    }
    return item;
  });
}

/**
 * Update plan aggregates (recalculate totals from plan items)
 * CRITICAL: Call this whenever plan items change
 * @param planId Plan ID
 */
export function updatePlanAggregates(planId: string): void {
  const db = getDatabase();

  // Aggregate plan_items data
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_stores,
      SUM(CASE WHEN is_included = 1 THEN quantity ELSE 0 END) as total_quantity,
      SUM(CASE WHEN is_included = 1 THEN total_cost ELSE 0 END) as estimated_cost,
      SUM(CASE WHEN is_included = 1 THEN ai_expected_conversions ELSE 0 END) as expected_conversions,
      AVG(CASE WHEN is_included = 1 THEN ai_confidence ELSE NULL END) as avg_confidence
    FROM plan_items
    WHERE plan_id = ?
  `).get(planId) as {
    total_stores: number;
    total_quantity: number;
    estimated_cost: number;
    expected_conversions: number;
    avg_confidence: number;
  };

  // Update campaign_plans with aggregated data
  db.prepare(`
    UPDATE campaign_plans
    SET
      total_stores = ?,
      total_quantity = ?,
      estimated_cost = ?,
      expected_conversions = ?,
      avg_confidence = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    stats.total_stores || 0,
    stats.total_quantity || 0,
    stats.estimated_cost || 0,
    stats.expected_conversions || 0,
    stats.avg_confidence || 0,
    planId
  );

  // Update wave_summary (breakdown by wave)
  const waveSummary = db.prepare(`
    SELECT
      wave,
      COUNT(*) as stores,
      SUM(quantity) as quantity,
      SUM(total_cost) as cost
    FROM plan_items
    WHERE plan_id = ? AND wave IS NOT NULL AND is_included = 1
    GROUP BY wave
    ORDER BY wave
  `).all(planId);

  db.prepare(`
    UPDATE campaign_plans
    SET wave_summary = ?
    WHERE id = ?
  `).run(
    waveSummary.length > 0 ? JSON.stringify(waveSummary) : null,
    planId
  );
}

/**
 * Update wave aggregates (recalculate wave totals from plan items)
 * @param waveId Wave ID
 */
export function updateWaveAggregates(waveId: string): void {
  const db = getDatabase();

  const wave = getWaveById(waveId);
  if (!wave) return;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as stores_count,
      SUM(quantity) as total_quantity,
      SUM(total_cost) as total_cost
    FROM plan_items
    WHERE plan_id = ? AND wave = ? AND is_included = 1
  `).get(wave.plan_id, wave.wave_code) as {
    stores_count: number;
    total_quantity: number;
    total_cost: number;
  };

  db.prepare(`
    UPDATE plan_waves
    SET
      stores_count = ?,
      total_quantity = ?,
      total_cost = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    stats.stores_count || 0,
    stats.total_quantity || 0,
    stats.total_cost || 0,
    waveId
  );
}
