/**
 * Module loader with caching to prevent repeated imports
 * Useful for dynamic imports that should be loaded once and reused
 */

interface CachedModule<T = any> {
  module: T | null;
  loading: Promise<T> | null;
  error: Error | null;
}

export class ModuleLoader {
  private _modules = new Map<string, CachedModule>();

  /**
   * Load a module dynamically, caching the result
   * If already loading, returns the same promise
   */
  async load<T = any>(moduleId: string, importFn: () => Promise<T>): Promise<T | null> {
    let cached = this._modules.get(moduleId);

    if (!cached) {
      cached = {
        module: null,
        loading: null,
        error: null,
      };
      this._modules.set(moduleId, cached);
    }

    // Return cached module if already loaded
    if (cached.module) {
      return cached.module;
    }

    // If already loading, return the same promise
    if (cached.loading) {
      return cached.loading;
    }

    // Start loading
    cached.loading = importFn()
      .then((module) => {
        cached!.module = module;
        cached!.loading = null;

        return module;
      })
      .catch((error) => {
        cached!.error = error;
        cached!.loading = null;
        console.warn(`Failed to load module ${moduleId}:`, error);

        return null as T | null;
      });

    return cached.loading;
  }

  /**
   * Get cached module without loading
   */
  getCached<T = any>(moduleId: string): T | null {
    return this._modules.get(moduleId)?.module ?? null;
  }

  /**
   * Clear cache
   */
  clear(moduleId?: string): void {
    if (moduleId) {
      this._modules.delete(moduleId);
    } else {
      this._modules.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    total: number;
    loaded: number;
    loading: number;
    failed: number;
  } {
    let loaded = 0;
    let loading = 0;
    let failed = 0;

    for (const cached of this._modules.values()) {
      if (cached.module) {
        loaded++;
      }

      if (cached.loading) {
        loading++;
      }

      if (cached.error) {
        failed++;
      }
    }

    return {
      total: this._modules.size,
      loaded,
      loading,
      failed,
    };
  }
}

/**
 * Global module loader instance
 */
export const moduleLoader = new ModuleLoader();

/**
 * Pre-load modules that are commonly used
 * Call this at app startup to warm up the cache
 */
export async function preloadCommonModules(): Promise<void> {
  // Pre-load debug logger if available
  if (typeof window !== 'undefined') {
    try {
      await moduleLoader.load('debugLogger', () => import('~/utils/debugLogger'));
    } catch {
      // Ignore
    }
  }
}
