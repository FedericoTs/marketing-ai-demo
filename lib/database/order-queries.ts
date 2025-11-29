/**
 * Order Management Queries
 *
 * STUBBED: Order tables not yet migrated to Supabase
 * All functions return mock/empty values to allow build to pass
 */

import { nanoid } from 'nanoid';

// ==================== TYPES ====================

export interface CampaignOrder {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'sent' | 'printing' | 'shipped' | 'delivered' | 'cancelled';
  total_stores: number;
  total_quantity: number;
  estimated_cost: number;
  pdf_url: string | null;
  csv_url: string | null;
  notes: string | null;
  tracking_number: string | null;
  supplier_email: string | null;
  sent_at: string | null;
  delivered_at: string | null;
}

export interface CampaignOrderItem {
  id: string;
  order_id: string;
  store_id: string;
  campaign_id: string;
  recommended_quantity: number;
  approved_quantity: number;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
}

export interface OrderItemWithDetails extends CampaignOrderItem {
  store_number: string;
  store_name: string;
  city: string;
  state: string;
  campaign_name: string;
}

export interface CreateOrderParams {
  orderItems: Array<{
    storeId: string;
    campaignId: string;
    recommendedQuantity: number;
    approvedQuantity: number;
    notes?: string;
  }>;
  notes?: string;
  supplierEmail?: string;
}

// ==================== UTILITY FUNCTIONS (STUBBED) ====================

export function generateOrderNumber(): string {
  console.log('[order-queries] generateOrderNumber stubbed');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `ORD-${year}-${month}-001`;
}

// ==================== CREATE OPERATIONS (STUBBED) ====================

export function createOrder(params: CreateOrderParams): CampaignOrder {
  console.log('[order-queries] createOrder stubbed');
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    order_number: generateOrderNumber(),
    created_at: now,
    updated_at: now,
    status: 'draft',
    total_stores: params.orderItems.length,
    total_quantity: params.orderItems.reduce((sum, item) => sum + item.approvedQuantity, 0),
    estimated_cost: 0,
    pdf_url: null,
    csv_url: null,
    notes: params.notes || null,
    tracking_number: null,
    supplier_email: params.supplierEmail || null,
    sent_at: null,
    delivered_at: null,
  };
}

export function duplicateOrder(originalOrderId: string): CampaignOrder {
  console.log('[order-queries] duplicateOrder stubbed');
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    order_number: generateOrderNumber(),
    created_at: now,
    updated_at: now,
    status: 'draft',
    total_stores: 0,
    total_quantity: 0,
    estimated_cost: 0,
    pdf_url: null,
    csv_url: null,
    notes: `Rerun of ${originalOrderId}`,
    tracking_number: null,
    supplier_email: null,
    sent_at: null,
    delivered_at: null,
  };
}

// ==================== READ OPERATIONS (STUBBED) ====================

export function getOrderById(orderId: string): CampaignOrder | null {
  console.log('[order-queries] getOrderById stubbed');
  return null;
}

export function getOrderByNumber(orderNumber: string): CampaignOrder | null {
  console.log('[order-queries] getOrderByNumber stubbed');
  return null;
}

export function getAllOrders(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  searchQuery?: string;
}): CampaignOrder[] {
  console.log('[order-queries] getAllOrders stubbed');
  return [];
}

export function getOrdersCount(status?: string): number {
  console.log('[order-queries] getOrdersCount stubbed');
  return 0;
}

export function getOrderItems(orderId: string): OrderItemWithDetails[] {
  console.log('[order-queries] getOrderItems stubbed');
  return [];
}

// ==================== UPDATE OPERATIONS (STUBBED) ====================

export function updateOrderStatus(
  orderId: string,
  status: CampaignOrder['status'],
  additionalData?: {
    trackingNumber?: string;
    sentAt?: string;
    deliveredAt?: string;
  }
): boolean {
  console.log('[order-queries] updateOrderStatus stubbed');
  return false;
}

export function updateOrderFiles(
  orderId: string,
  pdfUrl?: string,
  csvUrl?: string
): boolean {
  console.log('[order-queries] updateOrderFiles stubbed');
  return false;
}

export function updateOrderDetails(
  orderId: string,
  details: {
    notes?: string;
    supplierEmail?: string;
  }
): boolean {
  console.log('[order-queries] updateOrderDetails stubbed');
  return false;
}

export function addOrderItem(
  orderId: string,
  item: {
    storeId: string;
    campaignId: string;
    recommendedQuantity: number;
    approvedQuantity: number;
    notes?: string;
  }
): CampaignOrderItem {
  console.log('[order-queries] addOrderItem stubbed');
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    order_id: orderId,
    store_id: item.storeId,
    campaign_id: item.campaignId,
    recommended_quantity: item.recommendedQuantity,
    approved_quantity: item.approvedQuantity,
    unit_cost: 0.25,
    total_cost: item.approvedQuantity * 0.25,
    notes: item.notes || null,
    created_at: now,
  };
}

export function updateOrderItem(
  itemId: string,
  updates: {
    approvedQuantity?: number;
    notes?: string;
  }
): boolean {
  console.log('[order-queries] updateOrderItem stubbed');
  return false;
}

export function recalculateOrderTotals(orderId: string): boolean {
  console.log('[order-queries] recalculateOrderTotals stubbed');
  return false;
}

// ==================== DELETE OPERATIONS (STUBBED) ====================

export function deleteOrder(orderId: string): boolean {
  console.log('[order-queries] deleteOrder stubbed');
  return false;
}

export function deleteOrderItem(itemId: string): boolean {
  console.log('[order-queries] deleteOrderItem stubbed');
  return false;
}

// ==================== STATISTICS (STUBBED) ====================

export function getOrderStatistics(): {
  totalOrders: number;
  totalStores: number;
  totalQuantity: number;
  totalCost: number;
  ordersByStatus: Record<string, number>;
} {
  console.log('[order-queries] getOrderStatistics stubbed');
  return {
    totalOrders: 0,
    totalStores: 0,
    totalQuantity: 0,
    totalCost: 0,
    ordersByStatus: {},
  };
}
