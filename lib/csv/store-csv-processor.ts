import Papa from 'papaparse';

export interface StoreCSVRow {
  storeNumber: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  region?: string;
  district?: string;
  sizeCategory?: string;
  medianAge?: string;
  incomeLevel?: string;
  lat?: string;
  lng?: string;
  timezone?: string;
}

export interface ParsedStore {
  storeNumber: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  region?: string;
  district?: string;
  sizeCategory?: string;
  demographicProfile?: {
    medianAge?: number;
    incomeLevel?: string;
  };
  lat?: number;
  lng?: number;
  timezone?: string;
}

export interface CSVValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface CSVParseResult {
  success: boolean;
  stores: ParsedStore[];
  errors: CSVValidationError[];
  totalRows: number;
  validRows: number;
}

/**
 * Validate a single store row
 */
function validateStoreRow(row: StoreCSVRow, rowIndex: number): CSVValidationError[] {
  const errors: CSVValidationError[] = [];

  // Required fields
  if (!row.storeNumber || row.storeNumber.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'storeNumber',
      message: 'Store number is required',
      value: row.storeNumber,
    });
  }

  if (!row.name || row.name.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'name',
      message: 'Store name is required',
      value: row.name,
    });
  }

  // Validate latitude/longitude if provided
  if (row.lat) {
    const lat = parseFloat(row.lat);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push({
        row: rowIndex,
        field: 'lat',
        message: 'Latitude must be between -90 and 90',
        value: row.lat,
      });
    }
  }

  if (row.lng) {
    const lng = parseFloat(row.lng);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push({
        row: rowIndex,
        field: 'lng',
        message: 'Longitude must be between -180 and 180',
        value: row.lng,
      });
    }
  }

  // Validate median age if provided
  if (row.medianAge) {
    const age = parseInt(row.medianAge, 10);
    if (isNaN(age) || age < 0 || age > 120) {
      errors.push({
        row: rowIndex,
        field: 'medianAge',
        message: 'Median age must be between 0 and 120',
        value: row.medianAge,
      });
    }
  }

  return errors;
}

/**
 * Transform CSV row to ParsedStore object
 */
function transformStoreRow(row: StoreCSVRow): ParsedStore {
  const demographicProfile: any = {};

  if (row.medianAge) {
    const age = parseInt(row.medianAge, 10);
    if (!isNaN(age)) {
      demographicProfile.medianAge = age;
    }
  }

  if (row.incomeLevel) {
    demographicProfile.incomeLevel = row.incomeLevel.trim();
  }

  const store: ParsedStore = {
    storeNumber: row.storeNumber.trim(),
    name: row.name.trim(),
  };

  // Optional fields
  if (row.address) store.address = row.address.trim();
  if (row.city) store.city = row.city.trim();
  if (row.state) store.state = row.state.trim();
  if (row.zip) store.zip = row.zip.trim();
  if (row.region) store.region = row.region.trim();
  if (row.district) store.district = row.district.trim();
  if (row.sizeCategory) store.sizeCategory = row.sizeCategory.trim();
  if (row.timezone) store.timezone = row.timezone.trim();

  // Demographics
  if (Object.keys(demographicProfile).length > 0) {
    store.demographicProfile = demographicProfile;
  }

  // Coordinates
  if (row.lat) {
    const lat = parseFloat(row.lat);
    if (!isNaN(lat)) store.lat = lat;
  }
  if (row.lng) {
    const lng = parseFloat(row.lng);
    if (!isNaN(lng)) store.lng = lng;
  }

  return store;
}

/**
 * Parse CSV file for store import
 * Handles unlimited number of stores efficiently
 */
export function parseStoreCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    const stores: ParsedStore[] = [];
    const errors: CSVValidationError[] = [];
    let totalRows = 0;
    let validRows = 0;

    Papa.parse<StoreCSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalize headers (case-insensitive, remove spaces)
        const normalized = header.trim().toLowerCase().replace(/\s+/g, '');

        // Map common variations to standard field names
        const headerMap: Record<string, string> = {
          'storenumber': 'storeNumber',
          'store_number': 'storeNumber',
          'storeno': 'storeNumber',
          'store#': 'storeNumber',
          '#': 'storeNumber',
          'number': 'storeNumber',

          'storename': 'name',
          'store_name': 'name',

          'streetaddress': 'address',
          'street': 'address',

          'cityname': 'city',

          'statecode': 'state',
          'stateabbr': 'state',

          'zipcode': 'zip',
          'postalcode': 'zip',

          'regionname': 'region',

          'districtname': 'district',

          'size': 'sizeCategory',
          'sizecategory': 'sizeCategory',
          'size_category': 'sizeCategory',
          'storesize': 'sizeCategory',

          'medianage': 'medianAge',
          'median_age': 'medianAge',
          'avgage': 'medianAge',

          'incomelevel': 'incomeLevel',
          'income_level': 'incomeLevel',
          'income': 'incomeLevel',

          'latitude': 'lat',

          'longitude': 'lng',
          'long': 'lng',

          'tz': 'timezone',
          'time_zone': 'timezone',
        };

        return headerMap[normalized] || header;
      },
      step: (results) => {
        if (results.errors.length > 0) {
          // Papa parse errors
          results.errors.forEach((error) => {
            errors.push({
              row: totalRows + 1,
              field: 'parse',
              message: error.message,
            });
          });
        } else if (results.data) {
          totalRows++;
          const rowErrors = validateStoreRow(results.data, totalRows);

          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else {
            stores.push(transformStoreRow(results.data));
            validRows++;
          }
        }
      },
      complete: () => {
        resolve({
          success: errors.length === 0,
          stores,
          errors,
          totalRows,
          validRows,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          stores: [],
          errors: [{
            row: 0,
            field: 'file',
            message: error.message,
          }],
          totalRows: 0,
          validRows: 0,
        });
      },
    });
  });
}

/**
 * Generate sample CSV template
 */
export function generateStoreCSVTemplate(): string {
  const headers = [
    'storeNumber',
    'name',
    'address',
    'city',
    'state',
    'zip',
    'region',
    'district',
    'sizeCategory',
    'medianAge',
    'incomeLevel',
    'lat',
    'lng',
    'timezone',
  ];

  const sampleData = [
    [
      '001',
      'Downtown Miami Store',
      '123 Main St',
      'Miami',
      'FL',
      '33101',
      'Southeast',
      'Miami-Dade',
      'Large',
      '68',
      'High',
      '25.7617',
      '-80.1918',
      'America/New_York',
    ],
    [
      '002',
      'Portland Central',
      '456 Oak Ave',
      'Portland',
      'OR',
      '97201',
      'Northwest',
      'Multnomah',
      'Medium',
      '65',
      'Medium',
      '45.5152',
      '-122.6784',
      'America/Los_Angeles',
    ],
    [
      '003',
      'Phoenix North',
      '789 Desert Blvd',
      'Phoenix',
      'AZ',
      '85001',
      'Southwest',
      'Maricopa',
      'Large',
      '72',
      'Medium',
      '33.4484',
      '-112.0740',
      'America/Phoenix',
    ],
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV template
 */
export function downloadStoreCSVTemplate() {
  const csv = generateStoreCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'store-import-template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
