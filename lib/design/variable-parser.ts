/**
 * Variable Parser for Automatic {variable} Detection
 *
 * Detects {variableName} patterns in text and auto-marks as VDP variables
 * Similar to Mailchimp, SendGrid, and other email marketing platforms
 */

export interface DetectedVariable {
  fieldName: string;       // e.g., "firstName" from {firstName}
  fullMatch: string;       // e.g., "{firstName}"
  startIndex: number;
  endIndex: number;
}

/**
 * Regex pattern to match {variableName} or {{variableName}}
 * Supports: letters, numbers, underscores
 * Examples: {firstName}, {{firstName}}, {last_name}, {{age123}}
 *
 * Pattern breakdown:
 * - \{?\{ - matches { or {{
 * - ([a-zA-Z0-9_]+) - captures variable name
 * - \}\}? - matches } or }}
 */
const VARIABLE_PATTERN = /\{?\{([a-zA-Z0-9_]+)\}\}?/g;

/**
 * Parse text and detect all {variable} patterns
 */
export function detectVariables(text: string): DetectedVariable[] {
  const variables: DetectedVariable[] = [];

  // Reset regex lastIndex to ensure fresh search
  VARIABLE_PATTERN.lastIndex = 0;

  let match;
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    variables.push({
      fieldName: match[1],           // Captured group (variable name without braces)
      fullMatch: match[0],           // Full match including braces
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return variables;
}

/**
 * Check if text contains any variables
 */
export function hasVariables(text: string): boolean {
  VARIABLE_PATTERN.lastIndex = 0;
  return VARIABLE_PATTERN.test(text);
}

/**
 * Extract unique field names from text
 * Example: "Hello {firstName} {lastName}, welcome to {city}!"
 * Returns: ["firstName", "lastName", "city"]
 */
export function extractFieldNames(text: string): string[] {
  const variables = detectVariables(text);
  const uniqueFields = new Set(variables.map(v => v.fieldName));
  return Array.from(uniqueFields);
}

/**
 * Replace variables with actual data
 * Used during batch processing with CSV data
 */
export function replaceVariables(
  text: string,
  data: Record<string, string>
): string {
  return text.replace(VARIABLE_PATTERN, (match, fieldName) => {
    return data[fieldName] || match; // Keep original if field not found
  });
}

/**
 * Validate variable name (alphanumeric + underscore only)
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

/**
 * Format field name for display
 * Example: "first_name" -> "First Name"
 */
export function formatFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Apply chip-style highlighting to variables in Fabric.js text object
 * Applies purple text color and light purple background to {variable} ranges
 */
export function applyVariableChipStyling(
  textObj: any,
  options: {
    textColor?: string;
    backgroundColor?: string;
  } = {}
): void {
  const text = textObj.text || '';
  const variables = detectVariables(text);

  if (variables.length === 0) return;

  const textColor = options.textColor || '#9333ea'; // Purple-600
  const backgroundColor = options.backgroundColor || 'rgba(147, 51, 234, 0.15)'; // Purple-600 with 15% opacity
  const defaultFill = textObj.fill || '#000000';
  const defaultFontFamily = textObj.fontFamily || 'Inter';
  const defaultFontWeight = textObj.fontWeight || 400;

  // CRITICAL: Reset ALL selection styles first to prevent style bleeding
  // This ensures only the variable ranges get chip styling
  // Also explicitly set font properties to prevent font switching in edit mode
  if (text.length > 0) {
    textObj.setSelectionStyles(
      {
        fill: defaultFill,
        textBackgroundColor: '',
        fontFamily: defaultFontFamily,
        fontWeight: defaultFontWeight,
      },
      0,
      text.length
    );
  }

  // Apply chip styles ONLY to individual variable ranges
  // Preserve font properties while applying chip styling
  variables.forEach((variable) => {
    textObj.setSelectionStyles(
      {
        fill: textColor,
        textBackgroundColor: backgroundColor,
        fontFamily: defaultFontFamily,
        fontWeight: defaultFontWeight,
      },
      variable.startIndex,
      variable.endIndex
    );
  });
}

/**
 * Remove chip styling from variables (for preview/export mode)
 * Restores original text color and removes background
 */
export function removeVariableChipStyling(
  textObj: any,
  originalColor?: string
): void {
  const text = textObj.text || '';
  const variables = detectVariables(text);

  if (variables.length === 0) return;

  const defaultColor = originalColor || textObj.fill || '#000000';
  const defaultFontFamily = textObj.fontFamily || 'Inter';
  const defaultFontWeight = textObj.fontWeight || 400;

  // Remove styles from each variable range
  // Preserve font properties to prevent font switching
  variables.forEach((variable) => {
    textObj.setSelectionStyles(
      {
        fill: defaultColor,
        textBackgroundColor: '',
        fontFamily: defaultFontFamily,
        fontWeight: defaultFontWeight,
      },
      variable.startIndex,
      variable.endIndex
    );
  });
}
