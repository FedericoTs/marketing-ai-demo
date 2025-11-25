/**
 * Rate Limiting Middleware
 *
 * Lightweight in-memory rate limiter with sliding window algorithm
 * Phase 4 - Rate Limiting Setup
 *
 * Features:
 * - Zero external dependencies
 * - Feature-flagged via environment variables
 * - Very permissive defaults (1000 requests/minute)
 * - In-memory store with automatic cleanup
 * - Sliding window algorithm for accuracy
 * - IP-based tracking
 * - Customizable per-route limits
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Enable rate limiting
   * Default: false (disabled)
   */
  enabled: boolean;

  /**
   * Maximum requests allowed in the window
   * Default: 1000 (very permissive)
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   * Default: 60000 (1 minute)
   */
  windowMs: number;

  /**
   * Message to return when rate limited
   */
  message: string;

  /**
   * Skip rate limiting for certain IPs (e.g., localhost)
   */
  skipIPs: string[];

  /**
   * Skip rate limiting for certain paths
   */
  skipPaths: string[];
}

/**
 * Request record for tracking
 */
interface RequestRecord {
  timestamp: number;
  count: number;
}

/**
 * In-memory store for request records
 * Key: IP address
 * Value: Array of request timestamps
 */
const requestStore = new Map<string, number[]>();

/**
 * Cleanup interval ID for automatic cleanup
 */
let cleanupIntervalId: NodeJS.Timeout | null = null;

/**
 * Get rate limit configuration from environment
 */
export function getRateLimitConfig(): RateLimitConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Disabled by default - must opt-in
    enabled: process.env.NEXT_PUBLIC_RATE_LIMITING_ENABLED === 'true',

    // Very permissive default: 1000 requests per minute
    maxRequests: parseInt(
      process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS || '1000',
      10
    ),

    // Default: 1 minute window
    windowMs: parseInt(
      process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS || '60000',
      10
    ),

    // Message for rate-limited requests
    message:
      process.env.NEXT_PUBLIC_RATE_LIMIT_MESSAGE ||
      'Too many requests, please try again later.',

    // Skip localhost in development
    skipIPs: isDevelopment ? ['127.0.0.1', '::1', 'localhost'] : [],

    // Skip certain paths by default
    skipPaths: [
      '/api/health',
      '/api/ping',
      '/_next/',
      '/favicon.ico',
      '/images/',
    ],
  };
}

/**
 * Extract IP address from request headers
 */
export function getIP(headers: Headers): string {
  // Check common headers set by proxies
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to a default IP (shouldn't happen in real requests)
  return 'unknown';
}

/**
 * Check if IP should skip rate limiting
 */
function shouldSkipIP(ip: string, config: RateLimitConfig): boolean {
  return config.skipIPs.includes(ip);
}

/**
 * Check if path should skip rate limiting
 */
export function shouldSkipPath(path: string, config: RateLimitConfig): boolean {
  return config.skipPaths.some((skipPath) => path.startsWith(skipPath));
}

/**
 * Clean up old request records
 * Removes timestamps older than the window
 */
function cleanupOldRecords(windowMs: number): void {
  const now = Date.now();
  const cutoff = now - windowMs;

  for (const [ip, timestamps] of requestStore.entries()) {
    // Filter out old timestamps
    const recentTimestamps = timestamps.filter((ts) => ts > cutoff);

    if (recentTimestamps.length === 0) {
      // No recent requests, remove IP entirely
      requestStore.delete(ip);
    } else {
      // Update with only recent timestamps
      requestStore.set(ip, recentTimestamps);
    }
  }
}

/**
 * Start automatic cleanup interval
 * Runs every minute to clean up old records
 */
export function startCleanupInterval(windowMs: number = 60000): void {
  // Only start if not already running
  if (cleanupIntervalId !== null) {
    return;
  }

  cleanupIntervalId = setInterval(() => {
    cleanupOldRecords(windowMs);
  }, windowMs);

  // Cleanup interval should not prevent Node.js from exiting
  if (cleanupIntervalId.unref) {
    cleanupIntervalId.unref();
  }
}

/**
 * Stop automatic cleanup interval
 * Useful for testing or graceful shutdown
 */
export function stopCleanupInterval(): void {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Clear all rate limit records
 * Useful for testing
 */
export function clearRateLimitStore(): void {
  requestStore.clear();
}

/**
 * Get current request count for an IP
 * Used for testing and monitoring
 */
export function getRequestCount(ip: string): number {
  const timestamps = requestStore.get(ip);
  return timestamps ? timestamps.length : 0;
}

/**
 * Check if request should be rate limited
 *
 * Uses sliding window algorithm:
 * 1. Get all timestamps for this IP
 * 2. Filter to only recent timestamps (within window)
 * 3. If count < max, allow request and add timestamp
 * 4. If count >= max, deny request
 *
 * @param ip - IP address to check
 * @param config - Rate limit configuration
 * @returns true if rate limited, false if allowed
 */
export function isRateLimited(
  ip: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Get existing timestamps for this IP
  let timestamps = requestStore.get(ip) || [];

  // Filter to only recent timestamps (sliding window)
  timestamps = timestamps.filter((ts) => ts > cutoff);

  // Check if limit exceeded
  const currentCount = timestamps.length;
  const limited = currentCount >= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - currentCount - 1);

  // Calculate reset time (oldest timestamp + window)
  let resetAt = now + config.windowMs;
  if (timestamps.length > 0) {
    resetAt = timestamps[0] + config.windowMs;
  }

  // If not limited, add current timestamp
  if (!limited) {
    timestamps.push(now);
    requestStore.set(ip, timestamps);
  }

  return { limited, remaining, resetAt };
}

/**
 * Rate limit headers to include in response
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  config: RateLimitConfig,
  remaining: number,
  resetAt: number,
  limited: boolean
): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(), // Unix timestamp in seconds
  };

  if (limited) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
    headers['Retry-After'] = retryAfter.toString();
  }

  return headers;
}

/**
 * Main rate limiting function for middleware
 *
 * @param request - Next.js request object
 * @returns Object with isLimited flag and headers
 */
export function checkRateLimit(request: {
  headers: Headers;
  url: string;
}): {
  limited: boolean;
  headers: RateLimitHeaders;
  message?: string;
} {
  const config = getRateLimitConfig();

  // If rate limiting is disabled, allow all requests
  if (!config.enabled) {
    return {
      limited: false,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': config.maxRequests.toString(),
        'X-RateLimit-Reset': '0',
      },
    };
  }

  // Extract path from URL
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if path should be skipped
  if (shouldSkipPath(path, config)) {
    return {
      limited: false,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': config.maxRequests.toString(),
        'X-RateLimit-Reset': '0',
      },
    };
  }

  // Get IP address
  const ip = getIP(request.headers);

  // Check if IP should be skipped
  if (shouldSkipIP(ip, config)) {
    return {
      limited: false,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': config.maxRequests.toString(),
        'X-RateLimit-Reset': '0',
      },
    };
  }

  // Check rate limit
  const { limited, remaining, resetAt } = isRateLimited(ip, config);

  // Generate headers
  const headers = getRateLimitHeaders(config, remaining, resetAt, limited);

  return {
    limited,
    headers,
    message: limited ? config.message : undefined,
  };
}

// Start cleanup interval when module loads
if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RATE_LIMITING_ENABLED === 'true') {
  startCleanupInterval();
}
