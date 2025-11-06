/**
 * Data Axle Audience Targeting - Public API
 *
 * Clean exports for all audience targeting functionality
 */

// Main client
export { DataAxleClient, getDataAxleClient } from './data-axle-client'

// Utilities
export { RateLimiter } from './rate-limiter'

// Types
export type {
  AudienceFilters,
  AudienceCountResponse,
  DataAxleContact,
  DataAxleFilterDSL,
  DataAxleClientConfig,
  SavedAudience,
  ContactPurchaseRecord,
  PurchaseOptions,
  PurchaseResponse,
  RateLimiterConfig,
  CacheEntry,
} from './types'

export { DataAxleError } from './types'
