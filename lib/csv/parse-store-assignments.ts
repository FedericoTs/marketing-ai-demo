import Papa from 'papaparse';

export interface StoreAssignment {
  storeNumber: string;
  campaignName: string;
  quantity: number;
  notes?: string;
}

export interface ParseResult {
  valid: StoreAssignment[];
  invalid: Array<{
    row: number;
    storeNumber?: string;
    reason: string;
    data?: any;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

/**
 * Parse CSV content for store assignments
 * Expected columns: Store Number, Campaign, Quantity, Notes (optional)
 */
export function parseStoreAssignments(csvContent: string): ParseResult {
  const valid: StoreAssignment[] = [];
  const invalid: Array<{
    row: number;
    storeNumber?: string;
    reason: string;
    data?: any;
  }> = [];

  try {
    // Parse CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize header names (case-insensitive, trim spaces)
        const normalized = header.toLowerCase().trim();
        if (normalized.includes('store') && normalized.includes('number')) return 'storeNumber';
        if (normalized.includes('campaign')) return 'campaignName';
        if (normalized.includes('quantity') || normalized.includes('qty')) return 'quantity';
        if (normalized.includes('note')) return 'notes';
        return header;
      },
    });

    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResult.errors);
    }

    // Validate each row
    parseResult.data.forEach((row: any, index: number) => {
      const rowNumber = index + 2; // +2 because index starts at 0 and header is row 1

      // Check for required fields
      if (!row.storeNumber) {
        invalid.push({
          row: rowNumber,
          reason: 'Missing store number',
          data: row,
        });
        return;
      }

      if (!row.campaignName) {
        invalid.push({
          row: rowNumber,
          storeNumber: row.storeNumber,
          reason: 'Missing campaign name',
          data: row,
        });
        return;
      }

      if (!row.quantity) {
        invalid.push({
          row: rowNumber,
          storeNumber: row.storeNumber,
          reason: 'Missing quantity',
          data: row,
        });
        return;
      }

      // Validate quantity is a number
      const quantity = parseInt(row.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        invalid.push({
          row: rowNumber,
          storeNumber: row.storeNumber,
          reason: `Invalid quantity: ${row.quantity} (must be a positive number)`,
          data: row,
        });
        return;
      }

      // Valid row
      valid.push({
        storeNumber: row.storeNumber.toString().trim(),
        campaignName: row.campaignName.toString().trim(),
        quantity,
        notes: row.notes ? row.notes.toString().trim() : undefined,
      });
    });

    return {
      valid,
      invalid,
      summary: {
        totalRows: parseResult.data.length,
        validRows: valid.length,
        invalidRows: invalid.length,
      },
    };
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error(
      `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate a sample CSV template for store assignments
 */
export function generateSampleCSV(): string {
  const rows = [
    ['Store Number', 'Campaign', 'Quantity', 'Notes'],
    ['101', 'Holiday Campaign', '150', 'Rush delivery'],
    ['102', 'Holiday Campaign', '200', ''],
    ['103', 'Spring Promo', '100', 'Standard delivery'],
    ['104', 'Holiday Campaign', '175', ''],
  ];

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
}

/**
 * Download CSV template
 */
export function downloadSampleCSV() {
  const csv = generateSampleCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'store-assignments-template.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
