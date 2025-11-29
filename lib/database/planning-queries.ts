/**
 * Planning Workspace Database Queries
 * STUBBED: SQLite tables not yet in Supabase
 */

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
} from '@/types/planning';

// ==================== CAMPAIGN PLANS (STUBBED) ====================

export function createPlan(input: CreatePlanInput): CampaignPlan {
  console.log('[planning-queries] createPlan stubbed');
  const now = new Date().toISOString();
  return {
    id: input.id || `plan_${nanoid(12)}`,
    name: input.name,
    description: input.description || null,
    status: 'draft',
    created_by: input.created_by || null,
    created_at: now,
    updated_at: now,
    total_stores: 0,
    total_quantity: 0,
    estimated_cost: 0,
    expected_conversions: 0,
    avg_confidence: 0,
    wave_summary: null,
    notes: input.notes || null,
    approved_at: null,
    executed_at: null,
  } as CampaignPlan;
}

export function getPlanById(id: string): CampaignPlan | null {
  console.log('[planning-queries] getPlanById stubbed');
  return null;
}

export function getAllPlans(filters?: { status?: PlanStatus }): CampaignPlan[] {
  console.log('[planning-queries] getAllPlans stubbed');
  return [];
}

export function updatePlan(id: string, input: UpdatePlanInput): CampaignPlan {
  console.log('[planning-queries] updatePlan stubbed');
  return createPlan({ name: input.name || 'Updated Plan' });
}

export function deletePlan(id: string): void {
  console.log('[planning-queries] deletePlan stubbed');
}

export function approvePlan(id: string): CampaignPlan {
  console.log('[planning-queries] approvePlan stubbed');
  return createPlan({ name: 'Approved Plan' });
}

export function executePlan(id: string): CampaignPlan {
  console.log('[planning-queries] executePlan stubbed');
  return createPlan({ name: 'Executed Plan' });
}

// ==================== PLAN ITEMS (STUBBED) ====================

export function createPlanItem(input: CreatePlanItemInput): PlanItem {
  console.log('[planning-queries] createPlanItem stubbed');
  const now = new Date().toISOString();
  return {
    id: `item_${nanoid(12)}`,
    plan_id: input.plan_id,
    store_id: input.store_id,
    store_number: input.store_number,
    store_name: input.store_name,
    campaign_id: input.campaign_id,
    campaign_name: input.campaign_name,
    quantity: input.quantity,
    unit_cost: input.unit_cost || 0.05,
    total_cost: input.quantity * (input.unit_cost || 0.05),
    wave: input.wave || null,
    wave_name: input.wave_name || null,
    is_included: true,
    exclude_reason: null,
    is_overridden: false,
    override_notes: null,
    created_at: now,
    updated_at: now,
  } as PlanItem;
}

export function getPlanItemById(id: string): PlanItem | null {
  console.log('[planning-queries] getPlanItemById stubbed');
  return null;
}

export function getPlanItems(planId: string): PlanItem[] {
  console.log('[planning-queries] getPlanItems stubbed');
  return [];
}

export function updatePlanItem(id: string, input: UpdatePlanItemInput): PlanItem {
  console.log('[planning-queries] updatePlanItem stubbed');
  return createPlanItem({
    plan_id: 'stub',
    store_id: 'stub',
    store_number: '001',
    store_name: 'Stub Store',
    campaign_id: 'stub',
    campaign_name: 'Stub Campaign',
    quantity: 100,
  });
}

export function deletePlanItem(id: string): void {
  console.log('[planning-queries] deletePlanItem stubbed');
}

export function bulkCreatePlanItems(items: CreatePlanItemInput[]): PlanItem[] {
  console.log('[planning-queries] bulkCreatePlanItems stubbed');
  return [];
}

// ==================== PLAN WAVES (STUBBED) ====================

export function createWave(input: CreateWaveInput): PlanWave {
  console.log('[planning-queries] createWave stubbed');
  const now = new Date().toISOString();
  return {
    id: `wave_${nanoid(12)}`,
    plan_id: input.plan_id,
    wave_code: input.wave_code,
    wave_name: input.wave_name,
    wave_description: input.wave_description || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    budget_allocated: input.budget_allocated || null,
    stores_count: 0,
    total_quantity: 0,
    total_cost: 0,
    display_order: input.display_order || 0,
    created_at: now,
    updated_at: now,
  } as PlanWave;
}

export function getWaveById(id: string): PlanWave | null {
  console.log('[planning-queries] getWaveById stubbed');
  return null;
}

export function getWaves(planId: string): PlanWave[] {
  console.log('[planning-queries] getWaves stubbed');
  return [];
}

export function updateWave(id: string, input: UpdateWaveInput): PlanWave {
  console.log('[planning-queries] updateWave stubbed');
  return createWave({
    plan_id: 'stub',
    wave_code: 'A',
    wave_name: 'Wave A',
    display_order: 1,
  });
}

export function deleteWave(id: string): void {
  console.log('[planning-queries] deleteWave stubbed');
}

// ==================== ACTIVITY LOG (STUBBED) ====================

export function logActivity(input: {
  plan_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  change_details?: string;
  user_id?: string;
  notes?: string;
}): void {
  console.log('[planning-queries] logActivity stubbed');
}

export function getActivityLog(planId: string): PlanActivityLog[] {
  console.log('[planning-queries] getActivityLog stubbed');
  return [];
}

// ==================== AGGREGATION & SUMMARY (STUBBED) ====================

export function getPlanSummary(planId: string): PlanSummary | null {
  console.log('[planning-queries] getPlanSummary stubbed');
  return null;
}

export function getAllPlanSummaries(filters?: { status?: PlanStatus }): PlanSummary[] {
  console.log('[planning-queries] getAllPlanSummaries stubbed');
  return [];
}

export function getPlanItemsWithStoreDetails(planId: string): PlanItemWithStoreDetails[] {
  console.log('[planning-queries] getPlanItemsWithStoreDetails stubbed');
  return [];
}

export function updatePlanAggregates(planId: string): void {
  console.log('[planning-queries] updatePlanAggregates stubbed');
}

export function updateWaveAggregates(waveId: string): void {
  console.log('[planning-queries] updateWaveAggregates stubbed');
}
