/**
 * Rate Limiting Middleware Tests
 *
 * Tests for lightweight rate limiting system
 * Phase 4 - Rate Limiting Setup
 */

// Set environment variables before importing module
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_RATE_LIMITING_ENABLED = 'true';
process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS = '5'; // Low limit for testing
process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW_MS = '1000'; // 1 second window for testing

import {
  getRateLimitConfig,
  getIP,
  shouldSkipPath,
  isRateLimited,
  checkRateLimit,
  getRateLimitHeaders,
  clearRateLimitStore,
  getRequestCount,
  startCleanupInterval,
  stopCleanupInterval,
} from '../rate-limiter';

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    clearRateLimitStore();
  });

  afterAll(() => {
    // Stop cleanup interval after all tests
    stopCleanupInterval();
  });

  describe('Configuration', () => {
    it('should get configuration from environment', () => {
      const config = getRateLimitConfig();

      expect(config.enabled).toBe(true);
      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(1000);
      expect(config.message).toBeDefined();
      expect(config.skipIPs).toBeDefined();
      expect(config.skipPaths).toBeDefined();
    });

    it('should have default skip paths', () => {
      const config = getRateLimitConfig();

      expect(config.skipPaths).toContain('/api/health');
      expect(config.skipPaths).toContain('/_next/');
      expect(config.skipPaths).toContain('/favicon.ico');
    });

    it('should skip localhost in development', () => {
      process.env.NODE_ENV = 'development';
      const config = getRateLimitConfig();

      expect(config.skipIPs).toContain('127.0.0.1');
      expect(config.skipIPs).toContain('::1');
      expect(config.skipIPs).toContain('localhost');

      process.env.NODE_ENV = 'test'; // Reset
    });
  });

  describe('IP Extraction', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');

      const ip = getIP(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '192.168.1.100');

      const ip = getIP(headers);
      expect(ip).toBe('192.168.1.100');
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '192.168.1.1');
      headers.set('x-real-ip', '192.168.1.100');

      const ip = getIP(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should return unknown when no IP headers present', () => {
      const headers = new Headers();

      const ip = getIP(headers);
      expect(ip).toBe('unknown');
    });
  });

  describe('Path Skipping', () => {
    it('should skip health check paths', () => {
      const config = getRateLimitConfig();

      expect(shouldSkipPath('/api/health', config)).toBe(true);
      expect(shouldSkipPath('/api/ping', config)).toBe(true);
    });

    it('should skip static file paths', () => {
      const config = getRateLimitConfig();

      expect(shouldSkipPath('/_next/static/abc123', config)).toBe(true);
      expect(shouldSkipPath('/favicon.ico', config)).toBe(true);
      expect(shouldSkipPath('/images/logo.png', config)).toBe(true);
    });

    it('should not skip API routes', () => {
      const config = getRateLimitConfig();

      expect(shouldSkipPath('/api/campaigns', config)).toBe(false);
      expect(shouldSkipPath('/api/landing-pages', config)).toBe(false);
    });

    it('should not skip app routes', () => {
      const config = getRateLimitConfig();

      expect(shouldSkipPath('/dashboard', config)).toBe(false);
      expect(shouldSkipPath('/campaigns', config)).toBe(false);
    });
  });

  describe('Rate Limiting Logic', () => {
    it('should allow requests under limit', () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.1';

      // Make 4 requests (under limit of 5)
      for (let i = 0; i < 4; i++) {
        const result = isRateLimited(ip, config);
        expect(result.limited).toBe(false);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }
    });

    it('should rate limit when exceeding max requests', () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.2';

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        const result = isRateLimited(ip, config);
        expect(result.limited).toBe(false);
      }

      // 6th request should be rate limited
      const result = isRateLimited(ip, config);
      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should track remaining requests correctly', () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.3';

      const result1 = isRateLimited(ip, config);
      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(4); // 5 - 1

      const result2 = isRateLimited(ip, config);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(3); // 5 - 2

      const result3 = isRateLimited(ip, config);
      expect(result3.limited).toBe(false);
      expect(result3.remaining).toBe(2); // 5 - 3
    });

    it('should calculate reset time correctly', () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.4';
      const before = Date.now();

      const result = isRateLimited(ip, config);

      expect(result.resetAt).toBeGreaterThan(before);
      expect(result.resetAt).toBeLessThanOrEqual(before + config.windowMs + 100);
    });

    it('should use sliding window algorithm', async () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.5';

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        isRateLimited(ip, config);
      }

      // Should be rate limited
      let result = isRateLimited(ip, config);
      expect(result.limited).toBe(true);

      // Wait for window to pass
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be allowed again (sliding window reset)
      result = isRateLimited(ip, config);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(4);
    }, 10000); // Increase timeout for this test

    it('should track different IPs independently', () => {
      const config = getRateLimitConfig();

      // IP 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        isRateLimited('192.168.1.10', config);
      }

      // IP 2 should still be allowed
      const result = isRateLimited('192.168.1.11', config);
      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(4);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should generate correct headers for allowed request', () => {
      const config = getRateLimitConfig();
      const remaining = 3;
      const resetAt = Date.now() + 60000;

      const headers = getRateLimitHeaders(config, remaining, resetAt, false);

      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('3');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeUndefined();
    });

    it('should include Retry-After header when rate limited', () => {
      const config = getRateLimitConfig();
      const remaining = 0;
      const resetAt = Date.now() + 30000;

      const headers = getRateLimitHeaders(config, remaining, resetAt, true);

      expect(headers['X-RateLimit-Limit']).toBe('5');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['Retry-After']).toBeDefined();
      expect(parseInt(headers['Retry-After']!)).toBeGreaterThan(0);
    });

    it('should format reset time as Unix timestamp', () => {
      const config = getRateLimitConfig();
      const resetAt = 1700000000000; // Example timestamp

      const headers = getRateLimitHeaders(config, 5, resetAt, false);

      const resetSeconds = parseInt(headers['X-RateLimit-Reset']);
      expect(resetSeconds).toBe(Math.ceil(resetAt / 1000));
    });
  });

  describe('checkRateLimit Integration', () => {
    it('should allow request when rate limiting disabled', () => {
      process.env.NEXT_PUBLIC_RATE_LIMITING_ENABLED = 'false';

      const request = {
        headers: new Headers({ 'x-forwarded-for': '192.168.1.20' }),
        url: 'http://localhost:3000/api/campaigns',
      };

      const result = checkRateLimit(request);

      expect(result.limited).toBe(false);
      expect(result.headers['X-RateLimit-Limit']).toBeDefined();

      process.env.NEXT_PUBLIC_RATE_LIMITING_ENABLED = 'true'; // Reset
    });

    it('should skip health check paths', () => {
      const request = {
        headers: new Headers({ 'x-forwarded-for': '192.168.1.21' }),
        url: 'http://localhost:3000/api/health',
      };

      // Make many requests to health endpoint
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(request);
        expect(result.limited).toBe(false);
      }
    });

    it('should skip localhost IP', () => {
      process.env.NODE_ENV = 'development';

      const request = {
        headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
        url: 'http://localhost:3000/api/campaigns',
      };

      // Make many requests from localhost
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(request);
        expect(result.limited).toBe(false);
      }

      process.env.NODE_ENV = 'test'; // Reset
    });

    it('should rate limit regular API requests', () => {
      const request = {
        headers: new Headers({ 'x-forwarded-for': '192.168.1.22' }),
        url: 'http://localhost:3000/api/campaigns',
      };

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(request);
        expect(result.limited).toBe(false);
      }

      // 6th request should be limited
      const result = checkRateLimit(request);
      expect(result.limited).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.headers['Retry-After']).toBeDefined();
    });

    it('should include rate limit headers in response', () => {
      const request = {
        headers: new Headers({ 'x-forwarded-for': '192.168.1.23' }),
        url: 'http://localhost:3000/api/landing-pages',
      };

      const result = checkRateLimit(request);

      expect(result.headers).toHaveProperty('X-RateLimit-Limit');
      expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
      expect(result.headers).toHaveProperty('X-RateLimit-Reset');
    });
  });

  describe('Store Management', () => {
    it('should track request count per IP', () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.30';

      expect(getRequestCount(ip)).toBe(0);

      isRateLimited(ip, config);
      expect(getRequestCount(ip)).toBe(1);

      isRateLimited(ip, config);
      expect(getRequestCount(ip)).toBe(2);

      isRateLimited(ip, config);
      expect(getRequestCount(ip)).toBe(3);
    });

    it('should clear all rate limit records', () => {
      const config = getRateLimitConfig();

      isRateLimited('192.168.1.40', config);
      isRateLimited('192.168.1.41', config);
      isRateLimited('192.168.1.42', config);

      expect(getRequestCount('192.168.1.40')).toBe(1);
      expect(getRequestCount('192.168.1.41')).toBe(1);
      expect(getRequestCount('192.168.1.42')).toBe(1);

      clearRateLimitStore();

      expect(getRequestCount('192.168.1.40')).toBe(0);
      expect(getRequestCount('192.168.1.41')).toBe(0);
      expect(getRequestCount('192.168.1.42')).toBe(0);
    });

    it('should start and stop cleanup interval', () => {
      stopCleanupInterval();
      expect(() => startCleanupInterval(1000)).not.toThrow();

      stopCleanupInterval();
      expect(() => stopCleanupInterval()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown IP address', () => {
      const request = {
        headers: new Headers(), // No IP headers
        url: 'http://localhost:3000/api/campaigns',
      };

      const result = checkRateLimit(request);

      // Should not crash, but should track 'unknown' IP
      expect(result.limited).toBeDefined();
      expect(result.headers).toBeDefined();
    });

    it('should handle malformed URLs gracefully', () => {
      const request = {
        headers: new Headers({ 'x-forwarded-for': '192.168.1.50' }),
        url: 'http://localhost:3000',
      };

      expect(() => checkRateLimit(request)).not.toThrow();
    });

    it('should handle very high request rates', () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.60';

      // Simulate burst of 100 requests
      let limitedCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = isRateLimited(ip, config);
        if (result.limited) {
          limitedCount++;
        }
      }

      // Should rate limit most requests after first 5
      expect(limitedCount).toBeGreaterThan(90);
    });

    it('should handle concurrent requests from same IP', async () => {
      const config = getRateLimitConfig();
      const ip = '192.168.1.70';

      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(isRateLimited(ip, config))
      );

      const results = await Promise.all(promises);

      // First 5 should be allowed, rest should be limited
      const allowed = results.filter((r) => !r.limited);
      const limited = results.filter((r) => r.limited);

      expect(allowed.length).toBe(5);
      expect(limited.length).toBe(5);
    });

    it('should handle zero or negative configuration values', () => {
      process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS = '0';

      const config = getRateLimitConfig();
      expect(config.maxRequests).toBe(0);

      const ip = '192.168.1.80';
      const result = isRateLimited(ip, config);

      // With max 0, should always be limited
      expect(result.limited).toBe(true);

      process.env.NEXT_PUBLIC_RATE_LIMIT_MAX_REQUESTS = '5'; // Reset
    });
  });

  describe('Performance', () => {
    it('should process rate limit check quickly', () => {
      const request = {
        headers: new Headers({ 'x-forwarded-for': '192.168.1.90' }),
        url: 'http://localhost:3000/api/campaigns',
      };

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        checkRateLimit(request);
      }

      const duration = performance.now() - start;

      // Should process 1000 checks in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
