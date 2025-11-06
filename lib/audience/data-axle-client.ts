/**
 * Data Axle API Client
 *
 * Production-ready client for Data Axle People API with:
 * - Rate limiting (150 req/10sec)
 * - Retry logic with exponential backoff
 * - In-memory caching for count requests
 * - Filter DSL conversion
 * - Comprehensive error handling
 *
 * @see https://api.data-axle.com/v1/people/docs
 */

import { RateLimiter } from './rate-limiter'
import type {
  AudienceFilters,
  AudienceCountResponse,
  DataAxleContact,
  DataAxleFilterDSL,
  DataAxleClientConfig,
  DataAxleError,
  CacheEntry,
} from './types'

/**
 * Main Data Axle Client Class
 */
export class DataAxleClient {
  private readonly apiKey: string
  private readonly baseURL: string
  private readonly costPerContact: number
  private readonly userCostPerContact: number
  private readonly rateLimiter: RateLimiter
  private readonly enableCache: boolean
  private readonly cacheTTL: number
  private readonly cache: Map<string, CacheEntry<AudienceCountResponse>>

  constructor(config: DataAxleClientConfig) {
    // Validation
    if (!config.apiKey) {
      throw new Error('Data Axle API key is required')
    }

    this.apiKey = config.apiKey
    this.baseURL = config.baseURL || 'https://api.data-axle.com/v1/people'
    this.costPerContact = config.costPerContact || 0.15 // Our cost from Data Axle
    this.userCostPerContact = config.userCostPerContact || 0.25 // What we charge user
    this.enableCache = config.enableCache !== false // Default: true
    this.cacheTTL = config.cacheTTL || 300 // Default: 5 minutes

    // Initialize rate limiter (150 requests per 10 seconds per Data Axle spec)
    const rateLimiterConfig = config.rateLimiter || { maxRequests: 150, windowMs: 10000 }
    this.rateLimiter = new RateLimiter(
      rateLimiterConfig.maxRequests,
      rateLimiterConfig.windowMs
    )

    // Initialize in-memory cache
    this.cache = new Map()

    console.log('✅ Data Axle client initialized', {
      baseURL: this.baseURL,
      costPerContact: this.costPerContact,
      userCostPerContact: this.userCostPerContact,
      cacheEnabled: this.enableCache,
      cacheTTL: this.cacheTTL,
    })
  }

  /**
   * Get count of contacts matching filters (FREE - Insights API)
   *
   * @param filters - User-friendly filter criteria
   * @param options - Caching options
   * @returns Count and cost estimates
   */
  async getCount(
    filters: AudienceFilters,
    options?: { useCache?: boolean }
  ): Promise<AudienceCountResponse> {
    // Check cache first (if enabled)
    const useCache = options?.useCache !== false && this.enableCache
    const cacheKey = this.getCacheKey(filters)

    if (useCache) {
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        console.log('✅ Cache hit for count request')
        return cached
      }
    }

    // Rate limit
    await this.rateLimiter.acquire()

    // Build Data Axle Filter DSL
    const filterDSL = this.buildFilterDSL(filters)

    console.log('📊 Fetching count from Data Axle...', { filters })

    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/insights`, {
        method: 'POST', // Changed to POST for body
        headers: {
          'X-AUTH-TOKEN': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: filterDSL,
          insights: {
            field: 'state', // Any field works; we just need top-level count
            calculations: ['fill_count'],
          },
        }),
      })

      const data = await response.json()

      // Extract count from response
      const count = data.count || 0

      // Calculate costs
      const estimatedCost = count * this.costPerContact
      const userCharge = count * this.userCostPerContact
      const margin = userCharge - estimatedCost

      const result: AudienceCountResponse = {
        count,
        estimatedCost,
        userCharge,
        margin,
        costPerContact: this.costPerContact,
        userCostPerContact: this.userCostPerContact,
      }

      // Cache result
      if (useCache) {
        this.setToCache(cacheKey, result)
      }

      console.log('✅ Count received:', result)

      return result
    } catch (error) {
      console.error('❌ Data Axle count error:', error)
      throw this.handleError('Failed to get audience count', error)
    }
  }

  /**
   * Purchase contacts matching filters (PAID - Search API)
   *
   * @param filters - Filter criteria
   * @param maxContacts - Maximum contacts to purchase (1-10,000)
   * @param onProgress - Progress callback
   * @returns Array of purchased contacts
   */
  async purchaseContacts(
    filters: AudienceFilters,
    maxContacts: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<DataAxleContact[]> {
    // Validation
    if (maxContacts < 1 || maxContacts > 10000) {
      throw new Error('maxContacts must be between 1 and 10,000')
    }

    console.log(`💰 Purchasing up to ${maxContacts} contacts...`)

    const allContacts: DataAxleContact[] = []
    const filterDSL = this.buildFilterDSL(filters)

    // Data Axle limits: 400 contacts per request
    const pageSize = 400
    const totalPages = Math.ceil(maxContacts / pageSize)

    for (let page = 0; page < totalPages; page++) {
      const offset = page * pageSize
      const limit = Math.min(pageSize, maxContacts - allContacts.length)

      if (limit <= 0) break

      // Rate limit
      await this.rateLimiter.acquire()

      try {
        const response = await this.fetchWithRetry(`${this.baseURL}/search`, {
          method: 'POST',
          headers: {
            'X-AUTH-TOKEN': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: filterDSL,
            fields: this.getDefaultFields(),
            limit,
            offset,
          }),
        })

        const data = await response.json()
        const contacts = data.documents || []

        allContacts.push(...contacts)

        // Progress callback
        if (onProgress) {
          onProgress(allContacts.length, maxContacts)
        }

        console.log(`✅ Fetched page ${page + 1}/${totalPages}: ${contacts.length} contacts`)

        // Stop if we've retrieved all available records
        if (contacts.length < limit) {
          console.log('✅ All available contacts retrieved')
          break
        }
      } catch (error) {
        console.error(`❌ Error fetching page ${page + 1}:`, error)

        // If we have some contacts, return partial results
        if (allContacts.length > 0) {
          console.warn(`⚠️ Returning ${allContacts.length} contacts (partial success)`)
          break
        }

        throw this.handleError('Failed to purchase contacts', error)
      }
    }

    console.log(`✅ Purchase complete: ${allContacts.length} contacts`)

    return allContacts
  }

  /**
   * Build Data Axle Filter DSL from user-friendly filters
   *
   * Converts UI-friendly filters to Data Axle API format
   *
   * @param filters - User-friendly filters
   * @returns Data Axle Filter DSL
   */
  private buildFilterDSL(filters: AudienceFilters): DataAxleFilterDSL | null {
    // If user provided raw DSL, use it directly
    if (filters.rawFilterDSL) {
      return filters.rawFilterDSL as DataAxleFilterDSL
    }

    const propositions: any[] = []

    // Geographic filters
    if (filters.state) {
      propositions.push({
        relation: 'equals',
        attribute: 'state',
        value: filters.state,
      })
    }

    if (filters.city) {
      propositions.push({
        relation: 'equals',
        attribute: 'city',
        value: filters.city,
      })
    }

    if (filters.zip) {
      propositions.push({
        relation: 'equals',
        attribute: 'zip',
        value: filters.zip,
      })
    }

    if (filters.county) {
      propositions.push({
        relation: 'equals',
        attribute: 'county',
        value: filters.county,
      })
    }

    if (filters.geoDistance) {
      propositions.push({
        geo: 'distance',
        lat: filters.geoDistance.lat,
        lon: filters.geoDistance.lon,
        distance: filters.geoDistance.distance,
      })
    }

    // Demographic filters
    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      propositions.push({
        relation: 'between',
        attribute: 'age',
        value: [filters.ageMin || 18, filters.ageMax || 100],
      })
    }

    if (filters.gender) {
      propositions.push({
        relation: 'equals',
        attribute: 'gender',
        value: filters.gender,
      })
    }

    if (filters.maritalStatus) {
      propositions.push({
        relation: 'equals',
        attribute: 'marital_status',
        value: filters.maritalStatus,
      })
    }

    // Financial filters
    if (filters.incomeMin !== undefined || filters.incomeMax !== undefined) {
      propositions.push({
        relation: 'between',
        attribute: 'family.estimated_income',
        value: [filters.incomeMin || 0, filters.incomeMax || 1000000],
      })
    }

    if (filters.homeowner !== undefined) {
      propositions.push({
        relation: 'equals',
        attribute: 'homeowner',
        value: filters.homeowner,
      })
    }

    if (filters.homeValueMin !== undefined || filters.homeValueMax !== undefined) {
      propositions.push({
        relation: 'between',
        attribute: 'home_value',
        value: [filters.homeValueMin || 0, filters.homeValueMax || 10000000],
      })
    }

    if (filters.netWorthMin !== undefined || filters.netWorthMax !== undefined) {
      propositions.push({
        relation: 'between',
        attribute: 'net_worth',
        value: [filters.netWorthMin || 0, filters.netWorthMax || 50000000],
      })
    }

    // Lifestyle filters
    if (filters.interests && filters.interests.length > 0) {
      propositions.push({
        relation: 'in',
        attribute: 'family.behaviors',
        value: filters.interests,
      })
    }

    if (filters.behaviors && filters.behaviors.length > 0) {
      propositions.push({
        relation: 'in',
        attribute: 'family.behaviors',
        value: filters.behaviors,
      })
    }

    // Return combined filter
    if (propositions.length === 0) {
      return null // No filters = all records (BE CAREFUL!)
    }

    if (propositions.length === 1) {
      return propositions[0] // Single filter doesn't need connective
    }

    return {
      connective: 'and',
      propositions,
    }
  }

  /**
   * Get default fields to request from Data Axle
   */
  private getDefaultFields(): string[] {
    return [
      'person_id',
      'first_name',
      'last_name',
      'middle_name',
      'name_suffix',
      'street',
      'city',
      'state',
      'zip',
      'zip4',
      'county',
      'email',
      'phone',
      'mobile_phone',
      'age',
      'gender',
      'marital_status',
      'family.estimated_income',
      'homeowner',
      'home_value',
      'net_worth',
      'family.behaviors',
    ]
  }

  /**
   * Fetch with exponential backoff retry logic
   *
   * Retries on:
   * - Server errors (500+)
   * - Rate limit errors (429)
   * - Network errors
   *
   * Does NOT retry on:
   * - Client errors (400-499, except 429)
   *
   * @param url - API endpoint
   * @param options - Fetch options
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns Response
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options)

        // Success
        if (response.ok) {
          return response
        }

        // Don't retry client errors (except rate limits)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        // Retry on server errors (500+) and rate limits (429)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
          console.warn(`⚠️ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
          await this.sleep(delay)
          continue
        }

        // Max retries exceeded
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      } catch (error) {
        // Network error or fetch failure
        if (attempt === maxRetries) {
          throw error
        }

        const delay = Math.pow(2, attempt) * 1000
        console.warn(`⚠️ Network error, retry ${attempt + 1}/${maxRetries} after ${delay}ms`)
        await this.sleep(delay)
      }
    }

    throw new Error('Max retries exceeded')
  }

  /**
   * Cache management
   */
  private getCacheKey(filters: AudienceFilters): string {
    return JSON.stringify(filters)
  }

  private getFromCache(key: string): AudienceCountResponse | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private setToCache(key: string, data: AudienceCountResponse): void {
    const expiry = Date.now() + this.cacheTTL * 1000
    this.cache.set(key, { data, expiry })

    // Simple cache cleanup: remove expired entries every 100 sets
    if (this.cache.size % 100 === 0) {
      this.cleanupCache()
    }
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Error handling
   */
  private handleError(message: string, error: any): Error {
    // Extract meaningful error info
    const statusCode = error?.response?.status || error?.statusCode
    const errorCode = error?.code || 'UNKNOWN'
    const originalMessage = error?.message || String(error)

    // Create custom error
    const customError = new Error(`${message}: ${originalMessage}`)
    ;(customError as any).statusCode = statusCode
    ;(customError as any).code = errorCode
    ;(customError as any).originalError = error

    return customError
  }

  /**
   * Utility: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get rate limiter status (for monitoring)
   */
  getRateLimiterStatus() {
    return this.rateLimiter.getStatus()
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * Singleton instance factory
 *
 * Creates a single instance per API key to share rate limiter across application
 */
const clients: Map<string, DataAxleClient> = new Map()

export function getDataAxleClient(config: DataAxleClientConfig): DataAxleClient {
  const key = config.apiKey

  if (!clients.has(key)) {
    clients.set(key, new DataAxleClient(config))
  }

  return clients.get(key)!
}
