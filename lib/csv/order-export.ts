import { CampaignOrder, OrderItemWithDetails } from '@/lib/database/order-queries';

/**
 * Generate CSV content from order and items
 */
export function generateOrderCSV(order: CampaignOrder, items: OrderItemWithDetails[]): string {
  // CSV header
  const headers = [
    'Order Number',
    'Order Date',
    'Status',
    'Store Number',
    'Store Name',
    'City',
    'State',
    'Campaign',
    'Quantity',
    'Unit Cost',
    'Total Cost',
    'Notes',
  ];

  // CSV rows
  const rows = items.map((item) => [
    order.order_number,
    new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    order.status,
    item.store_number || 'N/A',
    item.store_name || 'Unknown Store',
    item.city || '',
    item.state || '',
    item.campaign_name || 'Unknown Campaign',
    item.approved_quantity.toString(),
    `$${item.unit_cost.toFixed(2)}`,
    `$${item.total_cost.toFixed(2)}`,
    item.notes || '',
  ]);

  // Add summary row
  rows.push([]);
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL:',
    order.total_quantity.toString(),
    '',
    `$${order.estimated_cost.toFixed(2)}`,
    '',
  ]);

  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          // Escape cells that contain commas, quotes, or newlines
          const cellStr = cell.toString();
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    ),
  ].join('\n');

  return csvContent;
}

/**
 * Generate filename for CSV export
 */
export function getOrderCSVFilename(orderNumber: string): string {
  return `order-${orderNumber}.csv`;
}
