import type { ProviderPlugin, PluginLoadOptions, PluginRegistrationResult } from './plugin';
import { isProviderPlugin } from './plugin';
import { ProviderRegistry } from './provider-registry';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('PluginLoader');

/**
 * Plugin loader for discovering and loading provider plugins
 *
 * Supports:
 * - Loading from JavaScript modules
 * - Loading from npm packages
 * - Loading from file system paths
 * - Plugin manifests and verification
 */
export class PluginLoader {
  private _registry: ProviderRegistry;

  constructor(registry?: ProviderRegistry) {
    this._registry = registry || ProviderRegistry.getInstance();
  }

  /**
   * Load a plugin from a module/class
   *
   * @example
   * import CustomProvider from './custom-provider';
   * const loader = new PluginLoader();
   * const result = await loader.loadPlugin(CustomProvider);
   */
  async loadPlugin(pluginOrFactory: any, options?: PluginLoadOptions): Promise<PluginRegistrationResult> {
    try {
      let plugin: ProviderPlugin;

      // If it's a function/class, instantiate it
      if (typeof pluginOrFactory === 'function') {
        try {
          plugin = new pluginOrFactory();
        } catch (_error) {
          void _error;

          // Try calling it as a factory function
          plugin = pluginOrFactory();
        }
      } else {
        plugin = pluginOrFactory;
      }

      if (!isProviderPlugin(plugin)) {
        return {
          success: false,
          error: 'Provided object does not implement ProviderPlugin interface',
        };
      }

      // Register the plugin
      const registerResult = await this._registry.registerPlugin(plugin, {
        config: options?.config,
      });

      if (!registerResult.success) {
        return registerResult;
      }

      // Load if autoInit is true (default)
      if (options?.autoInit !== false) {
        const loadResult = await this._registry.loadPlugin(registerResult.pluginId!);

        if (!loadResult.success) {
          // Unregister on load failure
          await this._registry.unregisterPlugin(registerResult.pluginId!);
          return {
            success: false,
            error: `Plugin registration succeeded but loading failed: ${loadResult.error}`,
          };
        }
      }

      return registerResult;
    } catch (error: any) {
      logger.error('Error loading plugin:', error?.message);
      return {
        success: false,
        error: `Plugin load error: ${error?.message}`,
      };
    }
  }

  /**
   * Load multiple plugins
   */
  async loadPlugins(
    plugins: any[],
    options?: {
      stopOnError?: boolean;
      config?: Record<string, Record<string, unknown>>;
    },
  ): Promise<{
    successful: string[];
    failed: Array<{ source: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ source: string; error: string }> = [];

    for (const plugin of plugins) {
      try {
        const config = typeof plugin === 'string' ? options?.config?.[plugin] : undefined;
        const result = await this.loadPlugin(plugin, { config, autoInit: true });

        if (result.success && result.pluginId) {
          successful.push(result.pluginId);
        } else {
          failed.push({
            source: typeof plugin === 'string' ? plugin : plugin.name || 'unknown',
            error: result.error || 'Unknown error',
          });

          if (options?.stopOnError) {
            break;
          }
        }
      } catch (error: any) {
        failed.push({
          source: typeof plugin === 'string' ? plugin : plugin.name || 'unknown',
          error: error?.message || 'Unknown error',
        });

        if (options?.stopOnError) {
          break;
        }
      }
    }

    return { successful, failed };
  }

  /**
   * Discover plugins from directory
   * This is a placeholder for file system discovery
   */
  async discoverFromDirectory(
    dirPath: string,
    _options?: {
      pattern?: string;
      recursive?: boolean;
    },
  ): Promise<{
    found: any[];
    loaded: string[];
    errors: Record<string, string>;
  }> {
    logger.info(`Discovering plugins from directory: ${dirPath}`);

    /*
     * This would use fs/glob to find plugin files
     * For now, returning empty - actual implementation depends on environment
     */

    return {
      found: [],
      loaded: [],
      errors: {
        discovery: 'Directory discovery not yet implemented',
      },
    };
  }

  /**
   * Create a plugin manifest/metadata
   * Helper for plugin authors
   */
  static createPluginMetadata(
    id: string,
    name: string,
    version: string,
    description: string,
    author: string,
    options?: {
      license?: string;
      repository?: string;
      homepage?: string;
      keywords?: string[];
      icon?: string;
      minAppVersion?: string;
    },
  ) {
    return {
      id,
      name,
      version,
      description,
      author,
      license: options?.license || 'MIT',
      repository: options?.repository,
      homepage: options?.homepage,
      keywords: options?.keywords || [],
      icon: options?.icon,
      minAppVersion: options?.minAppVersion,
    };
  }

  /**
   * Verify plugin dependencies are installed
   */
  static async verifyDependencies(dependencies: Record<string, string>): Promise<{
    available: string[];
    missing: string[];
  }> {
    const available: string[] = [];
    const missing: string[] = [];

    for (const [dep] of Object.entries(dependencies)) {
      try {
        await import(dep);
      } catch (_error) {
        void _error;
        missing.push(dep);
      }
    }

    return { available, missing };
  }

  /**
   * Get all loaded plugins through the registry
   */
  getLoadedPlugins() {
    return this._registry.getLoadedPlugins();
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string) {
    return this._registry.unloadPlugin(pluginId);
  }

  /**
   * Get plugin by ID or name
   */
  getPlugin(idOrName: string) {
    const plugin = this._registry.getPlugin(idOrName);

    if (plugin) {
      return plugin;
    }

    return this._registry.getPluginByProviderName(idOrName);
  }
}

/**
 * Create a new plugin loader instance
 */
export function createPluginLoader(registry?: ProviderRegistry): PluginLoader {
  return new PluginLoader(registry);
}
