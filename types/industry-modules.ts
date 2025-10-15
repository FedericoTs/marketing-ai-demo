// Industry Module Configuration Types

export type IndustryModuleType = 'retail' | 'healthcare' | 'realestate' | 'automotive' | null;

export interface RetailModuleConfig {
  enableMultiStore: boolean;
  enableAgeTargeting: boolean;
  enableCreativeVariants: boolean;
  enableAIRecommendations: boolean;
  enablePatternRecognition: boolean;
  enableAutoOptimization: boolean;
}

export interface HealthcareModuleConfig {
  enableMultiPractice: boolean;
  enableConditionTargeting: boolean;
  enableTreatmentTracking: boolean;
  enablePatientSegments: boolean;
}

export interface RealEstateModuleConfig {
  enablePropertyListings: boolean;
  enableAgentAssignment: boolean;
  enablePriceTiering: boolean;
  enableOpenHouseTracking: boolean;
}

export interface IndustryModuleSettings {
  enabled: boolean;
  type: IndustryModuleType;

  // Module-specific configs
  retail?: RetailModuleConfig;
  healthcare?: HealthcareModuleConfig;
  realestate?: RealEstateModuleConfig;
}

export const defaultRetailConfig: RetailModuleConfig = {
  enableMultiStore: true,
  enableAgeTargeting: true,
  enableCreativeVariants: true,
  enableAIRecommendations: true, // ✅ Now implemented
  enablePatternRecognition: true, // ✅ Now implemented
  enableAutoOptimization: true, // ✅ Now implemented
};

export const defaultHealthcareConfig: HealthcareModuleConfig = {
  enableMultiPractice: true,
  enableConditionTargeting: true,
  enableTreatmentTracking: true,
  enablePatientSegments: true,
};

export const defaultRealEstateConfig: RealEstateModuleConfig = {
  enablePropertyListings: true,
  enableAgentAssignment: true,
  enablePriceTiering: true,
  enableOpenHouseTracking: true,
};

export const defaultIndustryModuleSettings: IndustryModuleSettings = {
  enabled: false,
  type: null,
};

// Industry Module Metadata
export interface IndustryModuleMetadata {
  id: IndustryModuleType;
  name: string;
  description: string;
  icon: string;
  bestFor: string[];
  features: string[];
  comingSoon?: boolean;
}

export const industryModules: IndustryModuleMetadata[] = [
  {
    id: 'retail',
    name: 'Retail / Multi-Store',
    description: 'Optimize campaigns across multiple store locations with AI-powered recommendations',
    icon: '🏪',
    bestFor: ['Retail chains', 'Franchises', 'Multi-location businesses'],
    features: [
      'Multi-store campaign deployment',
      'Age group targeting',
      'Creative variant testing',
      'AI-powered recommendations',
      'Pattern recognition & optimization',
      'Geographic performance analytics',
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare / Multi-Practice',
    description: 'Manage campaigns across multiple medical practices and specialties',
    icon: '🏥',
    bestFor: ['Medical practices', 'Clinics', 'Healthcare networks'],
    features: [
      'Multi-practice deployment',
      'Condition-based targeting',
      'Treatment conversion tracking',
      'Patient segment analytics',
    ],
    comingSoon: true,
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    description: 'Connect campaigns to properties and track open house conversions',
    icon: '🏡',
    bestFor: ['Real estate agencies', 'Property management', 'Brokerages'],
    features: [
      'Property listing integration',
      'Agent assignment',
      'Price tier targeting',
      'Open house tracking',
    ],
    comingSoon: true,
  },
];
