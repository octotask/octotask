/**
 * Request deduplication cache
 * Prevents duplicate concurrent API requests by caching pending promises
 */
export class RequestDeduplicationCache {
  private _cache = new Map<string, Promise<any>>();
  private _ttlMap = new Map<string, number>();
  private readonly DEFAULT_TTL_MS = 5000; // 5 seconds

  /**
   * Get or execute a request with deduplication
   * If an identical request is already pending, returns the same promise
   */
  async get<T>(key: string, executor: () => Promise<T>, ttlMs: number = this.DEFAULT_TTL_MS): Promise<T> {
    // Return cached result if still valid
    if (this._cache.has(key)) {
      const cachedPromise = this._cache.get(key)!;
      const ttl = this._ttlMap.get(key) ?? 0;

      if (Date.now() < ttl) {
        return cachedPromise;
      } else {
        // Cache expired, remove it
        this._cache.delete(key);
        this._ttlMap.delete(key);
      }
    }

    // Execute and cache the promise
    const promise = executor().catch((error) => {
      // Remove failed requests from cache so they can be retried
      this._cache.delete(key);
      this._ttlMap.delete(key);
      throw error;
    });

    this._cache.set(key, promise);
    this._ttlMap.set(key, Date.now() + ttlMs);

    return promise;
  }

  /**
   * Clear a specific cache entry
   */
  clear(key: string): void {
    this._cache.delete(key);
    this._ttlMap.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this._cache.clear();
    this._ttlMap.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this._cache.size,
      keys: Array.from(this._cache.keys()),
    };
  }
}

/**
 * Global request deduplication cache instance
 */
export const requestCache = new RequestDeduplicationCache();

/**
 * Helper to create cache keys from request parameters
 */
export function createCacheKey(operation: string, params?: Record<string, any>): string {
  if (!params) {
    return operation;
  }

  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params[key];
        return acc;
      },
      {} as Record<string, any>,
    );

  return `${operation}:${JSON.stringify(sortedParams)}`;
}

/**
 * Execute a deduped API call
 */
export async function dedupedApiCall<T>(
  operation: string,
  executor: () => Promise<T>,
  params?: Record<string, any>,
  ttlMs?: number,
): Promise<T> {
  const cacheKey = createCacheKey(operation, params);
  return requestCache.get(cacheKey, executor, ttlMs);
}
