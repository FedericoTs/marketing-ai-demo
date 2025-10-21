/**
 * Template Validation System
 *
 * Validates templates and recipient data before batch processing
 * Catches errors early to prevent waste of resources
 */

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationError {
  field: string;
  message: string;
  severity: ValidationSeverity;
  recipientIndex?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

export interface RecipientData {
  name: string;
  lastname: string;
  address?: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
  trackingId?: string;
  [key: string]: any;
}

/**
 * Validate template against a single recipient's data
 */
export function validateTemplate(
  canvasJSON: any,
  variableMappings: any,
  recipientData: RecipientData
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  // Parse variable mappings if string
  let mappings = variableMappings;
  if (typeof variableMappings === 'string') {
    try {
      mappings = JSON.parse(variableMappings);
    } catch (e) {
      errors.push({
        field: 'variableMappings',
        message: 'Invalid variable mappings format',
        severity: 'error'
      });
      return { isValid: false, errors, warnings, info };
    }
  }

  // Check 1: Required variables exist in recipient data
  if (mappings && typeof mappings === 'object') {
    Object.entries(mappings).forEach(([idx, mapping]: [string, any]) => {
      const variableType = mapping.variableType;
      const isReusable = mapping.isReusable === true;

      // Skip reusable elements (logo, etc.)
      if (isReusable) return;

      // Validate required fields based on variable type
      switch (variableType) {
        case 'recipientName':
          if (!recipientData.name || !recipientData.name.trim()) {
            errors.push({
              field: 'name',
              message: 'Recipient name is required but missing',
              severity: 'error'
            });
          }
          if (!recipientData.lastname || !recipientData.lastname.trim()) {
            warnings.push({
              field: 'lastname',
              message: 'Recipient last name is missing',
              severity: 'warning'
            });
          }
          break;

        case 'recipientAddress':
          if (!recipientData.address || !recipientData.address.trim()) {
            warnings.push({
              field: 'address',
              message: 'Recipient address is missing',
              severity: 'warning'
            });
          }
          if (!recipientData.city) {
            info.push({
              field: 'city',
              message: 'Recipient city is missing',
              severity: 'info'
            });
          }
          if (!recipientData.zip) {
            info.push({
              field: 'zip',
              message: 'Recipient ZIP code is missing',
              severity: 'info'
            });
          }
          break;

        case 'phoneNumber':
          // Phone number is optional, but if provided, validate format
          if (recipientData.phone) {
            const phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
            if (!phoneRegex.test(recipientData.phone)) {
              warnings.push({
                field: 'phone',
                message: `Phone number format may be invalid: "${recipientData.phone}" (expected: XXX-XXX-XXXX or (XXX) XXX-XXXX)`,
                severity: 'warning'
              });
            }
          }
          break;

        case 'qrCode':
          // QR code requires tracking ID to generate URL
          if (!recipientData.trackingId) {
            warnings.push({
              field: 'trackingId',
              message: 'Tracking ID is missing - QR code will be auto-generated',
              severity: 'warning'
            });
          }
          break;
      }
    });
  }

  // Check 2: Canvas dimensions
  if (canvasJSON) {
    const canvas = typeof canvasJSON === 'string' ? JSON.parse(canvasJSON) : canvasJSON;

    if (canvas.width && canvas.height) {
      // Recommended size: 1024x1024 for high-quality printing
      if (canvas.width < 800 || canvas.height < 800) {
        warnings.push({
          field: 'dimensions',
          message: `Template size (${canvas.width}x${canvas.height}px) is smaller than recommended (1024x1024px) for optimal print quality`,
          severity: 'warning'
        });
      }

      // Warn if aspect ratio is unusual
      const aspectRatio = canvas.width / canvas.height;
      if (aspectRatio < 0.75 || aspectRatio > 1.33) {
        info.push({
          field: 'aspectRatio',
          message: `Template has unusual aspect ratio (${aspectRatio.toFixed(2)}:1) - may not fit standard postcard sizes`,
          severity: 'info'
        });
      }
    }
  }

  // Check 3: Email validation (if email field exists and is populated)
  if (recipientData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientData.email)) {
      warnings.push({
        field: 'email',
        message: `Email format may be invalid: "${recipientData.email}"`,
        severity: 'warning'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info
  };
}

/**
 * Validate entire batch of recipients
 */
export function validateBatch(
  canvasJSON: any,
  variableMappings: any,
  recipients: RecipientData[]
): {
  overallValid: boolean;
  recipientResults: Array<{
    index: number;
    name: string;
    validation: ValidationResult;
  }>;
  summary: {
    totalRecipients: number;
    validCount: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  criticalErrors: ValidationError[];
} {
  if (!recipients || recipients.length === 0) {
    return {
      overallValid: false,
      recipientResults: [],
      summary: {
        totalRecipients: 0,
        validCount: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0
      },
      criticalErrors: [{
        field: 'recipients',
        message: 'No recipients provided',
        severity: 'error'
      }]
    };
  }

  // Validate each recipient
  const recipientResults = recipients.map((recipient, index) => {
    const validation = validateTemplate(canvasJSON, variableMappings, recipient);

    // Add recipient index to all errors for better tracking
    const enrichedValidation = {
      ...validation,
      errors: validation.errors.map(e => ({ ...e, recipientIndex: index })),
      warnings: validation.warnings.map(w => ({ ...w, recipientIndex: index })),
      info: validation.info.map(i => ({ ...i, recipientIndex: index }))
    };

    return {
      index,
      name: `${recipient.name || 'Unknown'} ${recipient.lastname || ''}`.trim(),
      validation: enrichedValidation
    };
  });

  // Calculate summary stats
  const validCount = recipientResults.filter(r => r.validation.isValid).length;
  const errorCount = recipientResults.filter(r => !r.validation.isValid).length;
  const warningCount = recipientResults.reduce(
    (sum, r) => sum + r.validation.warnings.length,
    0
  );
  const infoCount = recipientResults.reduce(
    (sum, r) => sum + r.validation.info.length,
    0
  );

  // Collect critical errors (errors that appear in > 50% of recipients)
  const errorMap = new Map<string, number>();
  recipientResults.forEach(r => {
    r.validation.errors.forEach(e => {
      const key = `${e.field}:${e.message}`;
      errorMap.set(key, (errorMap.get(key) || 0) + 1);
    });
  });

  const criticalErrors: ValidationError[] = [];
  errorMap.forEach((count, key) => {
    if (count > recipients.length * 0.5) {
      const [field, message] = key.split(':');
      criticalErrors.push({
        field,
        message: `${message} (affects ${count}/${recipients.length} recipients)`,
        severity: 'error'
      });
    }
  });

  return {
    overallValid: errorCount === 0,
    recipientResults,
    summary: {
      totalRecipients: recipients.length,
      validCount,
      errorCount,
      warningCount,
      infoCount
    },
    criticalErrors
  };
}

/**
 * Get human-readable summary of validation results
 */
export function getValidationSummary(validation: ValidationResult): string {
  const parts: string[] = [];

  if (validation.isValid) {
    parts.push('✓ All validations passed');
  } else {
    parts.push(`✗ ${validation.errors.length} error(s) found`);
  }

  if (validation.warnings.length > 0) {
    parts.push(`${validation.warnings.length} warning(s)`);
  }

  if (validation.info.length > 0) {
    parts.push(`${validation.info.length} info message(s)`);
  }

  return parts.join(', ');
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(validation: ValidationResult): string[] {
  const messages: string[] = [];

  validation.errors.forEach(e => {
    messages.push(`❌ ${e.field}: ${e.message}`);
  });

  validation.warnings.forEach(w => {
    messages.push(`⚠️  ${w.field}: ${w.message}`);
  });

  validation.info.forEach(i => {
    messages.push(`ℹ️  ${i.field}: ${i.message}`);
  });

  return messages;
}
