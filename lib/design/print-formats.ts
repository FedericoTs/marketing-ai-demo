/**
 * Print Format Definitions for DropLab
 *
 * Defines standard direct mail formats with physical dimensions,
 * pixel dimensions at 300 DPI, and USPS compliance metadata.
 */

export interface PrintFormat {
  id: string;
  name: string;
  category: 'postcard' | 'letter' | 'self-mailer' | 'specialty';

  // Physical dimensions
  widthInches: number;
  heightInches: number;

  // Pixel dimensions at 300 DPI
  widthPixels: number;
  heightPixels: number;

  // Print specifications
  dpi: number;
  bleedInches: number;

  // USPS compliance
  uspsCompliant: boolean;
  postalClass: string[];

  // Display metadata
  description: string;
  popularityRank: number; // 1 = most popular
}

/**
 * Standard print formats for direct mail
 */
export const PRINT_FORMATS: Record<string, PrintFormat> = {
  postcard_4x6: {
    id: 'postcard_4x6',
    name: 'Postcard (4" × 6")',
    category: 'postcard',
    widthInches: 6,      // Trim size
    heightInches: 4,     // Trim size
    widthPixels: 1875,   // 6.25" * 300 DPI (includes 0.125" bleed on each side)
    heightPixels: 1275,  // 4.25" * 300 DPI (includes 0.125" bleed on each side)
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: true,
    postalClass: ['USPS First Class', 'USPS Marketing Mail'],
    description: 'Standard postcard size, most economical',
    popularityRank: 1
  },

  postcard_5x7: {
    id: 'postcard_5x7',
    name: 'Postcard (5" × 7")',
    category: 'postcard',
    widthInches: 7,      // Trim size
    heightInches: 5,     // Trim size
    widthPixels: 2175,   // 7.25" * 300 DPI (includes 0.125" bleed on each side)
    heightPixels: 1575,  // 5.25" * 300 DPI (includes 0.125" bleed on each side)
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: true,
    postalClass: ['USPS First Class', 'USPS Marketing Mail'],
    description: 'Premium postcard size, stands out in mailbox',
    popularityRank: 2
  },

  postcard_6x9: {
    id: 'postcard_6x9',
    name: 'Postcard (6" × 9")',
    category: 'postcard',
    widthInches: 9,      // Trim size
    heightInches: 6,     // Trim size
    widthPixels: 2775,   // 9.25" * 300 DPI (includes 0.125" bleed on each side)
    heightPixels: 1875,  // 6.25" * 300 DPI (includes 0.125" bleed on each side)
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: true,
    postalClass: ['USPS Marketing Mail'],
    description: 'Jumbo postcard, maximum impact',
    popularityRank: 3
  },

  postcard_6x11: {
    id: 'postcard_6x11',
    name: 'Postcard (6" × 11")',
    category: 'postcard',
    widthInches: 11,     // Trim size
    heightInches: 6,     // Trim size
    widthPixels: 3375,   // 11.25" * 300 DPI (includes 0.125" bleed on each side)
    heightPixels: 1875,  // 6.25" * 300 DPI (includes 0.125" bleed on each side)
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: true,
    postalClass: ['USPS Marketing Mail'],
    description: 'Oversized postcard, highly visible',
    popularityRank: 4
  },

  letter_8_5x11: {
    id: 'letter_8_5x11',
    name: 'Letter (8.5" × 11")',
    category: 'letter',
    widthInches: 8.5,
    heightInches: 11,
    widthPixels: 2550, // 8.5" * 300 DPI
    heightPixels: 3300, // 11" * 300 DPI
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: true,
    postalClass: ['USPS First Class'],
    description: 'Full page letter, ideal for detailed content',
    popularityRank: 5
  },

  self_mailer_11x17: {
    id: 'self_mailer_11x17',
    name: 'Self-Mailer (11" × 17")',
    category: 'self-mailer',
    widthInches: 11,
    heightInches: 17,
    widthPixels: 3300, // 11" * 300 DPI
    heightPixels: 5100, // 17" * 300 DPI
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: true,
    postalClass: ['USPS Marketing Mail'],
    description: 'Tri-fold self-mailer, premium presentation',
    popularityRank: 6
  },

  door_hanger_4x11: {
    id: 'door_hanger_4x11',
    name: 'Door Hanger (4" × 11")',
    category: 'specialty',
    widthInches: 4,
    heightInches: 11,
    widthPixels: 1200, // 4" * 300 DPI
    heightPixels: 3300, // 11" * 300 DPI
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: false,
    postalClass: [],
    description: 'Door hanger for local delivery',
    popularityRank: 7
  },

  flyer_8_5x11: {
    id: 'flyer_8_5x11',
    name: 'Flyer (8.5" × 11")',
    category: 'specialty',
    widthInches: 8.5,
    heightInches: 11,
    widthPixels: 2550, // 8.5" * 300 DPI
    heightPixels: 3300, // 11" * 300 DPI
    dpi: 300,
    bleedInches: 0.125,
    uspsCompliant: false,
    postalClass: [],
    description: 'Flyer for handouts or inserts',
    popularityRank: 8
  }
};

/**
 * Get a format by ID
 */
export function getFormat(formatId: string): PrintFormat {
  const format = PRINT_FORMATS[formatId];
  if (!format) {
    throw new Error(`Unknown format ID: ${formatId}`);
  }
  return format;
}

/**
 * Get all formats sorted by popularity
 */
export function getAllFormats(): PrintFormat[] {
  return Object.values(PRINT_FORMATS).sort((a, b) => a.popularityRank - b.popularityRank);
}

/**
 * Get formats by category
 */
export function getFormatsByCategory(category: PrintFormat['category']): PrintFormat[] {
  return Object.values(PRINT_FORMATS)
    .filter(f => f.category === category)
    .sort((a, b) => a.popularityRank - b.popularityRank);
}

/**
 * Get USPS compliant formats only
 */
export function getUSPSCompliantFormats(): PrintFormat[] {
  return Object.values(PRINT_FORMATS)
    .filter(f => f.uspsCompliant)
    .sort((a, b) => a.popularityRank - b.popularityRank);
}

/**
 * Calculate bleed dimensions
 */
export function getBleedDimensions(format: PrintFormat): {
  totalWidthPixels: number;
  totalHeightPixels: number;
  bleedPixels: number;
} {
  const bleedPixels = format.bleedInches * format.dpi;
  return {
    totalWidthPixels: format.widthPixels + (bleedPixels * 2),
    totalHeightPixels: format.heightPixels + (bleedPixels * 2),
    bleedPixels
  };
}

/**
 * Validate if dimensions match a standard format
 */
export function findFormatByDimensions(
  widthPixels: number,
  heightPixels: number,
  tolerance: number = 10
): PrintFormat | null {
  for (const format of Object.values(PRINT_FORMATS)) {
    const widthMatch = Math.abs(format.widthPixels - widthPixels) <= tolerance;
    const heightMatch = Math.abs(format.heightPixels - heightPixels) <= tolerance;

    if (widthMatch && heightMatch) {
      return format;
    }
  }
  return null;
}

/**
 * Default format (4x6 postcard)
 */
export const DEFAULT_FORMAT = PRINT_FORMATS.postcard_4x6;
