/**
 * PostGrid API Client
 *
 * Production-grade direct mail printing service integration
 *
 * Features:
 * - Postcard creation with PDF uploads
 * - Address verification (CASS-certified)
 * - Batch processing (up to 200k addresses)
 * - Cost estimation
 * - Real-time status tracking
 *
 * Documentation: https://docs.postgrid.com
 */

// ==================== TYPES ====================

export type PostGridEnvironment = 'test' | 'live'

export interface PostGridConfig {
  apiKey: string
  environment?: PostGridEnvironment
  baseUrl?: string
}

export interface PostcardSize {
  width: number // inches
  height: number // inches
  format: string // PostGrid format identifier
}

export interface Address {
  firstName?: string
  lastName?: string
  addressLine1: string
  addressLine2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  countryCode?: string // Default: 'US'
}

export interface PostcardRequest {
  to: Address
  from?: Address // Return address (optional)
  size: '6x4' | '6x9' | '6x11' // PostGrid format: width x height
  pdf: Buffer | string // PDF file buffer or base64
  mailType?: 'usps_first_class' | 'usps_standard'
  description?: string
  mergeVariables?: Record<string, string> // For PostGrid's built-in variable replacement
}

export interface BatchPostcardRequest {
  postcards: PostcardRequest[]
  batchDescription?: string
}

export interface PostcardResponse {
  id: string // PostGrid postcard ID
  object: 'postcard'
  live: boolean
  to: Address & { id: string }
  from?: Address & { id: string }
  url: string // PDF URL
  size: string
  mailType: string
  status: PostcardStatus
  createdAt: string
  updatedAt: string
  sendDate?: string
  expectedDeliveryDate?: string
  cost?: number
}

export type PostcardStatus =
  | 'draft'
  | 'ready'
  | 'processed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'failed'

export interface BatchResponse {
  id: string
  object: 'batch'
  status: 'processing' | 'completed' | 'failed'
  totalCount: number
  successCount: number
  failedCount: number
  postcards: PostcardResponse[]
  createdAt: string
  updatedAt: string
}

export interface AddressVerificationResponse {
  id: string
  status: 'verified' | 'unverifiable' | 'error'
  line1: string
  line2?: string
  city: string
  provinceOrState: string
  postalOrZip: string
  country: string
  errors?: string[]
}

export interface CostEstimate {
  costPerPiece: number
  totalCost: number
  currency: 'USD'
  breakdown: {
    printing: number
    postage: number
    addressVerification: number
  }
}

export interface PostGridError {
  type: string
  message: string
  code?: string
  statusCode: number
}

// ==================== CLIENT ====================

export class PostGridClient {
  private apiKey: string
  private baseUrl: string
  private environment: PostGridEnvironment

  constructor(config: PostGridConfig) {
    this.apiKey = config.apiKey
    this.environment = config.environment || 'test'
    this.baseUrl =
      config.baseUrl ||
      (this.environment === 'live'
        ? 'https://api.postgrid.com/print-mail/v1'
        : 'https://api.postgrid.com/print-mail/v1') // PostGrid uses same URL, differentiates by API key
  }

  // ==================== POSTCARDS ====================

  /**
   * Create a single postcard
   */
  async createPostcard(request: PostcardRequest): Promise<PostcardResponse> {
    const formData = new FormData()

    // Address fields
    formData.append('to[firstName]', request.to.firstName || '')
    formData.append('to[lastName]', request.to.lastName || '')
    formData.append('to[addressLine1]', request.to.addressLine1)
    if (request.to.addressLine2) formData.append('to[addressLine2]', request.to.addressLine2)
    formData.append('to[city]', request.to.city)
    formData.append('to[provinceOrState]', request.to.provinceOrState)
    formData.append('to[postalOrZip]', request.to.postalOrZip)
    formData.append('to[countryCode]', request.to.countryCode || 'US')

    // Return address (optional)
    if (request.from) {
      formData.append('from[firstName]', request.from.firstName || '')
      formData.append('from[lastName]', request.from.lastName || '')
      formData.append('from[addressLine1]', request.from.addressLine1)
      if (request.from.addressLine2) formData.append('from[addressLine2]', request.from.addressLine2)
      formData.append('from[city]', request.from.city)
      formData.append('from[provinceOrState]', request.from.provinceOrState)
      formData.append('from[postalOrZip]', request.from.postalOrZip)
      formData.append('from[countryCode]', request.from.countryCode || 'US')
    }

    // PDF file
    const pdfBlob = Buffer.isBuffer(request.pdf)
      ? new Blob([request.pdf], { type: 'application/pdf' })
      : new Blob([Buffer.from(request.pdf, 'base64')], { type: 'application/pdf' })

    formData.append('pdf', pdfBlob, 'postcard.pdf')

    // Configuration
    formData.append('size', request.size)
    if (request.mailType) formData.append('mailType', request.mailType)
    if (request.description) formData.append('description', request.description)

    // Merge variables (if using PostGrid's template system)
    if (request.mergeVariables) {
      Object.entries(request.mergeVariables).forEach(([key, value]) => {
        formData.append(`mergeVariables[${key}]`, value)
      })
    }

    return this.request<PostcardResponse>('/postcards', {
      method: 'POST',
      body: formData,
    })
  }

  /**
   * Create multiple postcards in batch
   * More efficient for large campaigns (reduces API calls)
   */
  async createBatch(request: BatchPostcardRequest): Promise<BatchResponse> {
    // Note: PostGrid batch API may require CSV upload or different endpoint
    // This is a simplified implementation - check PostGrid docs for actual batch format
    const promises = request.postcards.map((postcard) => this.createPostcard(postcard))

    const results = await Promise.allSettled(promises)

    const postcards: PostcardResponse[] = []
    let successCount = 0
    let failedCount = 0

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        postcards.push(result.value)
        successCount++
      } else {
        failedCount++
      }
    })

    return {
      id: `batch_${Date.now()}`,
      object: 'batch',
      status: failedCount === 0 ? 'completed' : failedCount === results.length ? 'failed' : 'completed',
      totalCount: request.postcards.length,
      successCount,
      failedCount,
      postcards,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Get postcard status
   */
  async getPostcard(postcardId: string): Promise<PostcardResponse> {
    return this.request<PostcardResponse>(`/postcards/${postcardId}`, {
      method: 'GET',
    })
  }

  /**
   * Cancel a postcard (only if not yet in production)
   */
  async cancelPostcard(postcardId: string): Promise<PostcardResponse> {
    return this.request<PostcardResponse>(`/postcards/${postcardId}`, {
      method: 'DELETE',
    })
  }

  // ==================== ADDRESS VERIFICATION ====================

  /**
   * Verify address before printing (CASS-certified)
   * Helps reduce failed deliveries
   */
  async verifyAddress(address: Address): Promise<AddressVerificationResponse> {
    return this.request<AddressVerificationResponse>('/addver/verifications', {
      method: 'POST',
      body: JSON.stringify({
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        provinceOrState: address.provinceOrState,
        postalOrZip: address.postalOrZip,
        countryCode: address.countryCode || 'US',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  // ==================== COST ESTIMATION ====================

  /**
   * Estimate printing costs before submission
   * Based on size, mail type, and quantity
   */
  async estimateCost(
    size: '6x4' | '6x9' | '6x11',
    quantity: number,
    mailType: 'usps_first_class' | 'usps_standard' = 'usps_first_class'
  ): Promise<CostEstimate> {
    // PostGrid pricing (approximate, check current pricing)
    // These are example rates - you should fetch from PostGrid's pricing API if available
    const rates: Record<string, Record<string, number>> = {
      '6x4': {  // 4x6 postcard in PostGrid's width x height format
        usps_first_class: 0.85,
        usps_standard: 0.65,
      },
      '6x9': {
        usps_first_class: 1.25,
        usps_standard: 0.95,
      },
      '6x11': {
        usps_first_class: 1.45,
        usps_standard: 1.15,
      },
    }

    const costPerPiece = rates[size]?.[mailType] || 1.0

    // Breakdown (approximate split)
    const printing = costPerPiece * 0.35
    const postage = costPerPiece * 0.6
    const addressVerification = costPerPiece * 0.05

    return {
      costPerPiece,
      totalCost: parseFloat((costPerPiece * quantity).toFixed(2)),
      currency: 'USD',
      breakdown: {
        printing: parseFloat(printing.toFixed(4)),
        postage: parseFloat(postage.toFixed(4)),
        addressVerification: parseFloat(addressVerification.toFixed(4)),
      },
    }
  }

  // ==================== WEBHOOKS ====================

  /**
   * Verify webhook signature for security
   * PostGrid signs webhooks with HMAC
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Implementation depends on PostGrid's webhook signature algorithm
    // Typically HMAC-SHA256
    const crypto = require('crypto')
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    return signature === expectedSignature
  }

  // ==================== HELPERS ====================

  /**
   * Generic request handler with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit & { headers?: Record<string, string> } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      ...options.headers,
    }

    // Remove Content-Type if FormData (browser sets it automatically with boundary)
    if (options.body instanceof FormData) {
      delete headers['Content-Type']
    }

    try {
      console.log(`[PostGrid] ${options.method || 'GET'} ${endpoint}`)

      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        console.error('[PostGrid] Full error response:', JSON.stringify(errorData, null, 2))
        throw this.createError(errorData, response.status)
      }

      const data = await response.json()
      return data as T
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error // Already a PostGridError
      }

      // Network or other errors
      throw this.createError(
        {
          type: 'network_error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        0
      )
    }
  }

  /**
   * Create standardized error object
   */
  private createError(errorData: any, statusCode: number): PostGridError {
    const error: PostGridError = {
      type: errorData.type || 'api_error',
      message: errorData.message || 'An error occurred',
      code: errorData.code,
      statusCode,
    }

    console.error('[PostGrid] Error:', error)
    return error
  }
}

// ==================== FACTORY ====================

/**
 * Create PostGrid client with environment-specific API key
 */
export function createPostGridClient(environment: PostGridEnvironment = 'test'): PostGridClient {
  const apiKey =
    environment === 'live'
      ? process.env.POSTGRID_API_KEY_LIVE || ''
      : process.env.POSTGRID_API_KEY_TEST || ''

  if (!apiKey) {
    throw new Error(`PostGrid API key not found for environment: ${environment}`)
  }

  return new PostGridClient({ apiKey, environment })
}
