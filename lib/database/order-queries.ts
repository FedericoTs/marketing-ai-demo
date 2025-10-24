import { getDatabase } from './connection';
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

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate unique order number in format: ORD-YYYY-MM-NNN
 * Example: ORD-2025-10-001
 */
export function generateOrderNumber(): string {
  const db = getDatabase();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `ORD-${year}-${month}-`;

  // Get count of orders this month
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM campaign_orders
    WHERE order_number LIKE ?
  `).get(`${prefix}%`) as { count: number };

  const sequence = String(result.count + 1).padStart(3, '0');
  return `${prefix}${sequence}`;
}

// ==================== CREATE OPERATIONS ====================

/**
 * Create a new campaign order with items
 */
export function createOrder(params: CreateOrderParams): CampaignOrder {
  const db = getDatabase();
  const orderId = nanoid();
  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();

  // Calculate totals
  const totalStores = params.orderItems.length;
  const totalQuantity = params.orderItems.reduce((sum, item) => sum + item.approvedQuantity, 0);
  const estimatedCost = totalQuantity * 0.25; // $0.25 per piece

  // Begin transaction
  const insertOrder = db.prepare(`
    INSERT INTO campaign_orders (
      id, order_number, created_at, updated_at, status,
      total_stores, total_quantity, estimated_cost,
      notes, supplier_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO campaign_order_items (
      id, order_id, store_id, campaign_id,
      recommended_quantity, approved_quantity,
      unit_cost, total_cost, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    // Insert order
    insertOrder.run(
      orderId,
      orderNumber,
      now,
      now,
      'draft',
      totalStores,
      totalQuantity,
      estimatedCost,
      params.notes || null,
      params.supplierEmail || null
    );

    // Insert order items
    for (const item of params.orderItems) {
      const itemId = nanoid();
      const itemCost = item.approvedQuantity * 0.25;

      insertItem.run(
        itemId,
        orderId,
        item.storeId,
        item.campaignId,
        item.recommendedQuantity,
        item.approvedQuantity,
        0.25, // unit_cost
        itemCost,
        item.notes || null,
        now
      );
    }
  });

  transaction();

  return getOrderById(orderId)!;
}

// ==================== READ OPERATIONS ====================

/**
 * Get order by ID
 */
export function getOrderById(orderId: string): CampaignOrder | null {
  const db = getDatabase();

  const order = db.prepare(`
    SELECT * FROM campaign_orders WHERE id = ?
  `).get(orderId) as CampaignOrder | undefined;

  return order || null;
}

/**
 * Get order by order number
 */
export function getOrderByNumber(orderNumber: string): CampaignOrder | null {
  const db = getDatabase();

  const order = db.prepare(`
    SELECT * FROM campaign_orders WHERE order_number = ?
  `).get(orderNumber) as CampaignOrder | undefined;

  return order || null;
}

/**
 * Get all orders (with pagination and filtering)
 */
export function getAllOrders(options?: {
  limit?: number;
  offset?: number;
  status?: string;
  searchQuery?: string;
}): CampaignOrder[] {
  const db = getDatabase();
  const { limit = 50, offset = 0, status, searchQuery } = options || {};

  let query = 'SELECT * FROM campaign_orders';
  const conditions: string[] = [];
  const params: any[] = [];

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (searchQuery) {
    conditions.push('order_number LIKE ?');
    params.push(`%${searchQuery}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params) as CampaignOrder[];
}

/**
 * Get total count of orders (for pagination)
 */
export function getOrdersCount(status?: string): number {
  const db = getDatabase();

  let query = 'SELECT COUNT(*) as count FROM campaign_orders';
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ' WHERE status = ?';
    params.push(status);
  }

  const result = db.prepare(query).get(...params) as { count: number };
  return result.count;
}

/**
 * Get order items for a specific order
 */
export function getOrderItems(orderId: string): OrderItemWithDetails[] {
  const db = getDatabase();

  const items = db.prepare(`
    SELECT
      oi.*,
      rs.store_number,
      rs.store_name,
      rs.city,
      rs.state,
      c.name as campaign_name
    FROM campaign_order_items oi
    LEFT JOIN retail_stores rs ON rs.id = oi.store_id
    LEFT JOIN campaigns c ON c.id = oi.campaign_id
    WHERE oi.order_id = ?
    ORDER BY rs.store_number
  `).all(orderId) as OrderItemWithDetails[];

  return items;
}

// ==================== UPDATE OPERATIONS ====================

/**
 * Update order status
 */
export function updateOrderStatus(
  orderId: string,
  status: CampaignOrder['status'],
  additionalData?: {
    trackingNumber?: string;
    sentAt?: string;
    deliveredAt?: string;
  }
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = ['status = ?', 'updated_at = ?'];
  const params: any[] = [status, now];

  if (additionalData?.trackingNumber) {
    updates.push('tracking_number = ?');
    params.push(additionalData.trackingNumber);
  }

  if (additionalData?.sentAt) {
    updates.push('sent_at = ?');
    params.push(additionalData.sentAt);
  }

  if (additionalData?.deliveredAt) {
    updates.push('delivered_at = ?');
    params.push(additionalData.deliveredAt);
  }

  params.push(orderId);

  const result = db.prepare(`
    UPDATE campaign_orders
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...params);

  return result.changes > 0;
}

/**
 * Update order file URLs (PDF and CSV)
 */
export function updateOrderFiles(
  orderId: string,
  pdfUrl?: string,
  csvUrl?: string
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const params: any[] = [now];

  if (pdfUrl !== undefined) {
    updates.push('pdf_url = ?');
    params.push(pdfUrl);
  }

  if (csvUrl !== undefined) {
    updates.push('csv_url = ?');
    params.push(csvUrl);
  }

  params.push(orderId);

  const result = db.prepare(`
    UPDATE campaign_orders
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...params);

  return result.changes > 0;
}

/**
 * Update order details (notes, supplier email)
 */
export function updateOrderDetails(
  orderId: string,
  details: {
    notes?: string;
    supplierEmail?: string;
  }
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const params: any[] = [now];

  if (details.notes !== undefined) {
    updates.push('notes = ?');
    params.push(details.notes);
  }

  if (details.supplierEmail !== undefined) {
    updates.push('supplier_email = ?');
    params.push(details.supplierEmail);
  }

  params.push(orderId);

  const result = db.prepare(`
    UPDATE campaign_orders
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...params);

  return result.changes > 0;
}

/**
 * Add a new item to an order
 */
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
  const db = getDatabase();
  const itemId = nanoid();
  const now = new Date().toISOString();
  const totalCost = item.approvedQuantity * 0.25;

  const result = db.prepare(`
    INSERT INTO campaign_order_items (
      id, order_id, store_id, campaign_id,
      recommended_quantity, approved_quantity,
      unit_cost, total_cost, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    itemId,
    orderId,
    item.storeId,
    item.campaignId,
    item.recommendedQuantity,
    item.approvedQuantity,
    0.25,
    totalCost,
    item.notes || null,
    now
  );

  // Recalculate order totals
  recalculateOrderTotals(orderId);

  // Return the created item
  const createdItem = db.prepare(`
    SELECT * FROM campaign_order_items WHERE id = ?
  `).get(itemId) as CampaignOrderItem;

  return createdItem;
}

/**
 * Update an order item
 */
export function updateOrderItem(
  itemId: string,
  updates: {
    approvedQuantity?: number;
    notes?: string;
  }
): boolean {
  const db = getDatabase();

  const updateFields: string[] = [];
  const params: any[] = [];

  if (updates.approvedQuantity !== undefined) {
    updateFields.push('approved_quantity = ?');
    params.push(updates.approvedQuantity);

    // Recalculate total cost
    updateFields.push('total_cost = ?');
    params.push(updates.approvedQuantity * 0.25);
  }

  if (updates.notes !== undefined) {
    updateFields.push('notes = ?');
    params.push(updates.notes);
  }

  params.push(itemId);

  const result = db.prepare(`
    UPDATE campaign_order_items
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).run(...params);

  // Get the order ID and recalculate totals
  const item = db.prepare(`
    SELECT order_id FROM campaign_order_items WHERE id = ?
  `).get(itemId) as { order_id: string } | undefined;

  if (item) {
    recalculateOrderTotals(item.order_id);
  }

  return result.changes > 0;
}

/**
 * Recalculate order totals based on current items
 */
export function recalculateOrderTotals(orderId: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Calculate totals from items
  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_stores,
      COALESCE(SUM(approved_quantity), 0) as total_quantity,
      COALESCE(SUM(total_cost), 0) as estimated_cost
    FROM campaign_order_items
    WHERE order_id = ?
  `).get(orderId) as {
    total_stores: number;
    total_quantity: number;
    estimated_cost: number;
  };

  // Update order
  const result = db.prepare(`
    UPDATE campaign_orders
    SET
      total_stores = ?,
      total_quantity = ?,
      estimated_cost = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    totals.total_stores,
    totals.total_quantity,
    totals.estimated_cost,
    now,
    orderId
  );

  return result.changes > 0;
}

// ==================== DELETE OPERATIONS ====================

/**
 * Delete an order (and all its items via CASCADE)
 */
export function deleteOrder(orderId: string): boolean {
  const db = getDatabase();

  const result = db.prepare(`
    DELETE FROM campaign_orders WHERE id = ?
  `).run(orderId);

  return result.changes > 0;
}

/**
 * Delete an order item
 */
export function deleteOrderItem(itemId: string): boolean {
  const db = getDatabase();

  // Get the order ID before deleting
  const item = db.prepare(`
    SELECT order_id FROM campaign_order_items WHERE id = ?
  `).get(itemId) as { order_id: string } | undefined;

  if (!item) {
    return false;
  }

  // Delete the item
  const result = db.prepare(`
    DELETE FROM campaign_order_items WHERE id = ?
  `).run(itemId);

  // Recalculate order totals
  if (result.changes > 0) {
    recalculateOrderTotals(item.order_id);
  }

  return result.changes > 0;
}

// ==================== STATISTICS ====================

/**
 * Get order statistics
 */
export function getOrderStatistics(): {
  totalOrders: number;
  totalStores: number;
  totalQuantity: number;
  totalCost: number;
  ordersByStatus: Record<string, number>;
} {
  const db = getDatabase();

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_stores), 0) as total_stores,
      COALESCE(SUM(total_quantity), 0) as total_quantity,
      COALESCE(SUM(estimated_cost), 0) as total_cost
    FROM campaign_orders
  `).get() as {
    total_orders: number;
    total_stores: number;
    total_quantity: number;
    total_cost: number;
  };

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM campaign_orders
    GROUP BY status
  `).all() as Array<{ status: string; count: number }>;

  const ordersByStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    ordersByStatus[row.status] = row.count;
  }

  return {
    totalOrders: totals.total_orders,
    totalStores: totals.total_stores,
    totalQuantity: totals.total_quantity,
    totalCost: totals.total_cost,
    ordersByStatus,
  };
}
