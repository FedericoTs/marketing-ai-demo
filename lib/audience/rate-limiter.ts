/**
 * Rate Limiter - Sliding Window Algorithm
 *
 * Prevents exceeding API rate limits by controlling request frequency
 * Thread-safe for concurrent requests
 */

export class RateLimiter {
  private queue: number[] = []
  private readonly limit: number
  private readonly windowMs: number

  /**
   * @param limit - Maximum requests per window (e.g., 150)
   * @param windowMs - Time window in milliseconds (e.g., 10000 = 10 seconds)
   */
  constructor(limit: number, windowMs: number) {
    if (limit <= 0 || windowMs <= 0) {
      throw new Error('Rate limiter requires positive limit and windowMs')
    }
    this.limit = limit
    this.windowMs = windowMs
  }

  /**
   * Acquire permission to make a request
   * Waits if rate limit would be exceeded
   *
   * @returns Promise that resolves when request can proceed
   */
  async acquire(): Promise<void> {
    const now = Date.now()

    // Remove timestamps outside the sliding window
    this.queue = this.queue.filter((timestamp) => now - timestamp < this.windowMs)

    // Check if limit reached
    if (this.queue.length >= this.limit) {
      // Calculate wait time until oldest request exits window
      const oldestRequest = this.queue[0]
      const waitTime = this.windowMs - (now - oldestRequest) + 10 // +10ms buffer

      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached. Waiting ${waitTime}ms...`)
        await this.sleep(waitTime)
        return this.acquire() // Recursively try again
      }
    }

    // Add current request to queue
    this.queue.push(now)
  }

  /**
   * Get current queue status (for monitoring)
   */
  getStatus(): { current: number; limit: number; available: number } {
    const now = Date.now()
    this.queue = this.queue.filter((timestamp) => now - timestamp < this.windowMs)

    return {
      current: this.queue.length,
      limit: this.limit,
      available: this.limit - this.queue.length,
    }
  }

  /**
   * Reset the rate limiter (useful for testing)
   */
  reset(): void {
    this.queue = []
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
