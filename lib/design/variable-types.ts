/**
 * Variable Types for VDP (Variable Data Printing)
 *
 * These define the types of dynamic data that can be substituted
 * into canvas objects during batch personalization.
 */

export type VariableType =
  | 'none'
  | 'recipientName'
  | 'recipientAddress'
  | 'phoneNumber'
  | 'qrCode'
  | 'logo'
  | 'message'
  | 'custom';

export interface VariableMarker {
  variableType: VariableType;
  isReusable: boolean; // If true, same value used for all recipients (e.g., logo)
  customFieldName?: string; // For 'custom' type
}

export const VARIABLE_TYPES: Array<{
  value: VariableType;
  label: string;
  description: string;
  isReusable: boolean;
  icon: string;
}> = [
  {
    value: 'none',
    label: 'None',
    description: 'Regular object (not a variable)',
    isReusable: false,
    icon: '○',
  },
  {
    value: 'recipientName',
    label: 'Recipient Name',
    description: 'Personalized name for each recipient',
    isReusable: false,
    icon: '👤',
  },
  {
    value: 'recipientAddress',
    label: 'Recipient Address',
    description: 'Personalized address for each recipient',
    isReusable: false,
    icon: '📍',
  },
  {
    value: 'phoneNumber',
    label: 'Phone Number',
    description: 'Personalized phone number',
    isReusable: false,
    icon: '📞',
  },
  {
    value: 'qrCode',
    label: 'QR Code',
    description: 'Unique QR code for tracking',
    isReusable: false,
    icon: '◻️',
  },
  {
    value: 'logo',
    label: 'Logo',
    description: 'Company logo (reused for all)',
    isReusable: true,
    icon: '🏢',
  },
  {
    value: 'message',
    label: 'Marketing Message',
    description: 'Campaign message (reused for all)',
    isReusable: true,
    icon: '💬',
  },
  {
    value: 'custom',
    label: 'Custom Field',
    description: 'Custom data field from CSV',
    isReusable: false,
    icon: '⚙️',
  },
];

/**
 * Get variable type configuration by value
 */
export function getVariableTypeConfig(type: VariableType) {
  return VARIABLE_TYPES.find(v => v.value === type) || VARIABLE_TYPES[0];
}

/**
 * Visual styling for variable markers
 */
export const VARIABLE_MARKER_STYLES = {
  borderColor: '#9333ea', // Purple-600
  borderWidth: 3,
  borderDashArray: [5, 5],
  cornerColor: '#9333ea',
  cornerSize: 8,
  transparentCorners: false,
};
