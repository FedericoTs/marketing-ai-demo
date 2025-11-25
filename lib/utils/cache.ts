/**
 * Browser-native caching utility using localStorage
 * Zero dependencies, fully reversible
 *
 * SAFETY: All data is stored in localStorage with timestamps
 * REVERSIBILITY: Simply delete this file and remove imports to revert
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in milliseconds
}

const CACHE_PREFIX = 'droplab_cache_';

/**
 * Get cached data if still valid
 * @param key Cache key
 * @returns Cached data or null if expired/missing
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - entry.timestamp < entry.ttl) {
      console.log(`[Cache] HIT: ${key} (age: ${Math.round((now - entry.timestamp) / 1000)}s)`);
      return entry.data;
    }

    // Cache expired, remove it
    console.log(`[Cache] EXPIRED: ${key}`);
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error(`[Cache] Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Store data in cache with TTL
 * @param key Cache key
 * @param data Data to cache
 * @param ttl Time-to-live in milliseconds (default: 30 seconds)
 */
export function setCachedData<T>(key: string, data: T, ttl: number = 30000): void {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
    console.log(`[Cache] SET: ${key} (ttl: ${ttl / 1000}s)`);
  } catch (error) {
    console.error(`[Cache] Error setting cache for ${key}:`, error);
    // Fail silently - caching is an optimization, not critical
  }
}

/**
 * Invalidate (clear) cached data
 * @param key Cache key
 */
export function invalidateCache(key: string): void {
  try {
    const cacheKey = CACHE_PREFIX + key;
    localStorage.removeItem(cacheKey);
    console.log(`[Cache] INVALIDATED: ${key}`);
  } catch (error) {
    console.error(`[Cache] Error invalidating cache for ${key}:`, error);
  }
}

/**
 * Clear all cache entries (useful for debugging)
 */
export function clearAllCache(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Cache] All cache cleared');
  } catch (error) {
    console.error('[Cache] Error clearing all cache:', error);
  }
}

/**
 * Cached fetch wrapper - automatically caches API responses
 * @param url API URL to fetch
 * @param options Fetch options
 * @param cacheKey Custom cache key (default: url)
 * @param ttl Time-to-live in milliseconds (default: 30 seconds)
 * @returns Fetch response data
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string,
  ttl: number = 30000
): Promise<T> {
  const key = cacheKey || url;

  // Try to get from cache first
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from server
  console.log(`[Cache] MISS: ${key} - fetching from server...`);
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the response
  setCachedData(key, data, ttl);

  return data;
}
