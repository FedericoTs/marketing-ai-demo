/**
 * Data Axle Audience Targeting - Type Definitions
 *
 * Complete TypeScript interfaces for audience targeting,
 * matching database schema (Migration 008) and Data Axle API
 */

/**
 * User-friendly filters (UI → API conversion)
 */
export interface AudienceFilters {
  // Geographic filters
  state?: string
  city?: string
  zip?: string
  county?: string
  geoDistance?: {
    lat: number
    lon: number
    distance: number // miles
  }

  // Demographic filters
  ageMin?: number
  ageMax?: number
  gender?: 'M' | 'F' | 'U' // Male, Female, Unknown
  maritalStatus?: 'S' | 'M' | 'D' | 'W' // Single, Married, Divorced, Widowed

  // Financial filters
  incomeMin?: number
  incomeMax?: number
  homeowner?: boolean
  homeValueMin?: number
  homeValueMax?: number
  netWorthMin?: number
  netWorthMax?: number

  // Lifestyle filters
  interests?: string[]
  behaviors?: string[]

  // Optional: Direct filter DSL (for advanced users)
  rawFilterDSL?: Record<string, any>
}

/**
 * Data Axle Filter DSL (API format)
 * Based on Data Axle People API specification
 */
export interface DataAxleFilterDSL {
  connective?: 'and' | 'or' | 'not'
  propositions?: Array<{
    relation: 'equals' | 'between' | 'in' | 'contains' | 'greater_than' | 'less_than'
    attribute: string
    value: any
  } | {
    geo: 'distance'
    lat: number
    lon: number
    distance: number
  } | DataAxleFilterDSL> // Nested filters
}

/**
 * Contact from Data Axle (API response format)
 */
export interface DataAxleContact {
  // Core identification
  person_id: string

  // Name
  first_name: string
  last_name: string
  middle_name?: string
  name_suffix?: string

  // Address
  street: string
  city: string
  state: string
  zip: string
  zip4?: string
  county?: string

  // Contact methods
  email?: string
  phone?: string
  mobile_phone?: string

  // Demographics
  age?: number
  gender?: 'M' | 'F' | 'U'
  marital_status?: 'S' | 'M' | 'D' | 'W'

  // Financial
  estimated_income?: number
  home_value?: number
  homeowner?: boolean
  net_worth?: number

  // Lifestyle
  interests?: string[]
  behaviors?: string[]

  // Additional Data Axle fields (expandable)
  [key: string]: any
}

/**
 * Count API Response
 */
export interface AudienceCountResponse {
  count: number
  estimatedCost: number        // Total cost for ALL contacts (count × $0.15)
  userCharge: number           // What we charge user (count × $0.25)
  margin: number               // userCharge - estimatedCost
  costPerContact: number       // $0.15 (our cost from Data Axle)
  userCostPerContact: number   // $0.25 (what user pays)
}

/**
 * Purchase API Options
 */
export interface PurchaseOptions {
  maxContacts: number
  organizationId: string
  userId: string
  filters: AudienceFilters
  saveAs?: {
    name: string
    description?: string
    tags?: string[]
    isPublic?: boolean
  }
  onProgress?: (current: number, total: number) => void
}

/**
 * Purchase API Response
 */
export interface PurchaseResponse {
  contacts: DataAxleContact[]
  totalPurchased: number
  totalCost: number
  userCharge: number
  margin: number
  purchaseId: string
  savedAudienceId?: string
  recipientListId?: string
}

/**
 * Saved Audience (from database)
 */
export interface SavedAudience {
  id: string
  organization_id: string
  created_by: string
  name: string
  description?: string
  tags?: string[]
  filters: AudienceFilters
  last_count?: number
  last_count_updated_at?: string
  last_estimated_cost?: number
  total_campaigns_using: number
  avg_response_rate?: number
  avg_conversion_rate?: number
  is_public: boolean
  created_at: string
  updated_at?: string
}

/**
 * Contact Purchase Record (from database)
 */
export interface ContactPurchaseRecord {
  id: string
  organization_id: string
  purchased_by: string
  filters: AudienceFilters
  contact_count: number
  cost_per_contact: number
  total_cost: number
  user_charge_per_contact: number
  total_user_charge: number
  margin: number // Generated column
  audience_filter_id?: string
  provider: 'data_axle'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  purchased_at: string
}

/**
 * Rate Limiter Configuration
 */
export interface RateLimiterConfig {
  maxRequests: number    // e.g., 150
  windowMs: number        // e.g., 10000 (10 seconds)
}

/**
 * Data Axle Client Configuration
 */
export interface DataAxleClientConfig {
  apiKey: string
  baseURL?: string
  costPerContact?: number     // Our cost from Data Axle ($0.15)
  userCostPerContact?: number // What we charge user ($0.25)
  rateLimiter?: RateLimiterConfig
  enableCache?: boolean
  cacheTTL?: number // seconds
}

/**
 * Data Axle API Error
 */
export class DataAxleError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message)
    this.name = 'DataAxleError'
  }
}

/**
 * Cache Entry
 */
export interface CacheEntry<T> {
  data: T
  expiry: number // timestamp
}
