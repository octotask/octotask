import type { ProviderPlugin, PluginMetadata, PluginRegistrationResult, PluginHealthStatus } from './plugin';
import { isProviderPlugin, hasPluginLifecycle } from './plugin';
import type { ModelInfo } from './types';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ProviderRegistry');

/**
 * Plugin registration information
 */
interface PluginRegistry {
  plugin: ProviderPlugin;
  metadata: PluginMetadata;
  loaded: boolean;
  initialized: boolean;
  loadedAt: number;
  config: Record<string, unknown>;
  healthStatus?: PluginHealthStatus;
}

/**
 * ProviderRegistry manages the lifecycle of provider plugins
 *
 * Features:
 * - Dynamic plugin discovery and loading
 * - Plugin lifecycle management (load/unload/validate)
 * - Plugin health monitoring
 * - Plugin configuration management
 * - Safe plugin sandboxing and error isolation
 */
export class ProviderRegistry {
  private static _instance: ProviderRegistry;

  private _plugins: Map<string, PluginRegistry> = new Map();
  private _pluginsByProviderName: Map<string, string> = new Map(); // providerName -> pluginId
  private _loadedPlugins: Set<string> = new Set();
  private _initializingPlugins: Set<string> = new Set();
  private _pluginHooks: Map<string, Set<(plugin: ProviderPlugin) => void>> = new Map([
    ['onPluginLoaded', new Set()],
    ['onPluginUnloaded', new Set()],
    ['onPluginError', new Set()],
  ]);

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry._instance) {
      ProviderRegistry._instance = new ProviderRegistry();
    }

    return ProviderRegistry._instance;
  }

  /**
   * Register a plugin
   */
  async registerPlugin(
    plugin: ProviderPlugin,
    options?: { config?: Record<string, unknown> },
  ): Promise<PluginRegistrationResult> {
    try {
      if (!isProviderPlugin(plugin)) {
        return {
          success: false,
          error: 'Invalid plugin: does not implement ProviderPlugin interface',
        };
      }

      const metadata = plugin.pluginMetadata;
      const pluginId = metadata.id;

      // Check for duplicate
      if (this._plugins.has(pluginId)) {
        return {
          success: false,
          error: `Plugin with ID '${pluginId}' is already registered`,
        };
      }

      // Check for provider name conflict
      if (this._pluginsByProviderName.has(plugin.name)) {
        const conflictingId = this._pluginsByProviderName.get(plugin.name);
        logger.warn(
          `Plugin provider name '${plugin.name}' conflicts with plugin '${conflictingId}'. Allowing override.`,
        );
      }

      // Validate plugin
      const validation = await this._validatePlugin(plugin);

      if (!validation.valid) {
        return {
          success: false,
          error: 'Plugin validation failed',
          warnings: validation.errors,
        };
      }

      // Store registry entry
      const registry: PluginRegistry = {
        plugin,
        metadata,
        loaded: false,
        initialized: false,
        loadedAt: Date.now(),
        config: options?.config || {},
      };

      this._plugins.set(pluginId, registry);
      this._pluginsByProviderName.set(plugin.name, pluginId);

      logger.info(`Plugin registered: ${metadata.id} v${metadata.version} (${plugin.name})`);

      return { success: true, pluginId };
    } catch (error: any) {
      const message = error?.message || 'Unknown error during plugin registration';
      logger.error('Plugin registration failed:', message);

      return { success: false, error: message };
    }
  }

  /**
   * Load a plugin by ID
   */
  async loadPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const registry = this._plugins.get(pluginId);

      if (!registry) {
        return { success: false, error: `Plugin '${pluginId}' not found` };
      }

      if (registry.loaded) {
        logger.debug(`Plugin '${pluginId}' is already loaded`);
        return { success: true };
      }

      // Call onLoad if available
      if (hasPluginLifecycle(registry.plugin) && registry.plugin.onLoad) {
        try {
          await registry.plugin.onLoad();
        } catch (error: any) {
          logger.error(`Plugin '${pluginId}' onLoad failed:`, error?.message);
          return {
            success: false,
            error: `Plugin onLoad hook failed: ${error?.message}`,
          };
        }
      }

      registry.loaded = true;
      this._loadedPlugins.add(pluginId);
      logger.info(`Plugin loaded: ${pluginId}`);

      // Emit hook
      this._emitHook('onPluginLoaded', registry.plugin);

      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Unknown error during plugin load';
      logger.error(`Failed to load plugin '${pluginId}':`, message);

      return { success: false, error: message };
    }
  }

  /**
   * Unload a plugin by ID
   */
  async unloadPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const registry = this._plugins.get(pluginId);

      if (!registry) {
        return { success: false, error: `Plugin '${pluginId}' not found` };
      }

      if (!registry.loaded) {
        logger.debug(`Plugin '${pluginId}' is not loaded`);
        return { success: true };
      }

      // Call onUnload if available
      if (hasPluginLifecycle(registry.plugin) && registry.plugin.onUnload) {
        try {
          await registry.plugin.onUnload();
        } catch (error: any) {
          logger.warn(`Plugin '${pluginId}' onUnload failed:`, error?.message);

          // Continue unloading even if onUnload fails
        }
      }

      registry.loaded = false;
      registry.initialized = false;
      this._loadedPlugins.delete(pluginId);
      this._initializingPlugins.delete(pluginId);

      logger.info(`Plugin unloaded: ${pluginId}`);

      // Emit hook
      this._emitHook('onPluginUnloaded', registry.plugin);

      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Unknown error during plugin unload';
      logger.error(`Failed to unload plugin '${pluginId}':`, message);

      return { success: false, error: message };
    }
  }

  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): ProviderPlugin | undefined {
    return this._plugins.get(pluginId)?.plugin;
  }

  /**
   * Get a plugin by provider name
   */
  getPluginByProviderName(providerName: string): ProviderPlugin | undefined {
    const pluginId = this._pluginsByProviderName.get(providerName);
    return pluginId ? this._plugins.get(pluginId)?.plugin : undefined;
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): ProviderPlugin[] {
    return Array.from(this._plugins.values()).map((r) => r.plugin);
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): ProviderPlugin[] {
    return Array.from(this._loadedPlugins)
      .map((id) => this._plugins.get(id)?.plugin)
      .filter((p): p is ProviderPlugin => !!p);
  }

  /**
   * Get metadata for a plugin
   */
  getPluginMetadata(pluginId: string): PluginMetadata | undefined {
    return this._plugins.get(pluginId)?.metadata;
  }

  /**
   * Get all plugin metadata
   */
  getAllPluginMetadata(): PluginMetadata[] {
    return Array.from(this._plugins.values()).map((r) => r.metadata);
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(pluginId: string): boolean {
    return this._loadedPlugins.has(pluginId);
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(pluginId: string): Record<string, unknown> | undefined {
    return this._plugins.get(pluginId)?.config;
  }

  /**
   * Set plugin configuration
   */
  async setPluginConfig(
    pluginId: string,
    config: Record<string, unknown>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const registry = this._plugins.get(pluginId);

      if (!registry) {
        return { success: false, error: `Plugin '${pluginId}' not found` };
      }

      registry.config = config;

      // Notify plugin of settings change
      const plugin = registry.plugin;

      if (hasPluginLifecycle(plugin) && plugin.onSettingsChange) {
        try {
          await plugin.onSettingsChange(config);
        } catch (error: any) {
          logger.warn(`Plugin '${pluginId}' onSettingsChange failed:`, error?.message);
        }
      }

      logger.info(`Plugin config updated: ${pluginId}`);

      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Unknown error updating plugin config';
      logger.error(`Failed to set plugin config for '${pluginId}':`, message);

      return { success: false, error: message };
    }
  }

  /**
   * Get health status of a plugin
   */
  async getPluginHealthStatus(pluginId: string): Promise<PluginHealthStatus | undefined> {
    try {
      const registry = this._plugins.get(pluginId);

      if (!registry) {
        return undefined;
      }

      const plugin = registry.plugin;

      if (plugin.getHealthStatus) {
        const status = await plugin.getHealthStatus();
        registry.healthStatus = status;

        return status;
      }

      // Default healthy status
      return {
        status: 'healthy',
        lastCheck: Date.now(),
        message: 'No health check available',
      };
    } catch (error: any) {
      logger.error(`Failed to get health status for plugin '${pluginId}':`, error?.message);
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        message: `Health check failed: ${error?.message}`,
      };
    }
  }

  /**
   * Register a lifecycle hook
   */
  onPluginLoaded(callback: (plugin: ProviderPlugin) => void): void {
    this._pluginHooks.get('onPluginLoaded')?.add(callback);
  }

  /**
   * Register an unload hook
   */
  onPluginUnloaded(callback: (plugin: ProviderPlugin) => void): void {
    this._pluginHooks.get('onPluginUnloaded')?.add(callback);
  }

  /**
   * Discover and load plugins from a source
   * This is a placeholder - actual implementation would depend on plugin source type
   */
  async discoverPlugins(
    sourcePattern: string,
  ): Promise<{ discovered: string[]; loaded: string[]; errors: Record<string, string> }> {
    const discovered: string[] = [];
    const loaded: string[] = [];
    const errors: Record<string, string> = {};

    logger.info(`Discovering plugins from: ${sourcePattern}`);

    /*
     * This would be extended to support:
     * - File system discovery
     * - npm module discovery
     * - Remote registry discovery
     * - Plugin manifest scanning
     */

    return { discovered, loaded, errors };
  }

  /**
   * Unregister a plugin completely
   */
  async unregisterPlugin(pluginId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const registry = this._plugins.get(pluginId);

      if (!registry) {
        return { success: false, error: `Plugin '${pluginId}' not found` };
      }

      // Unload if loaded
      if (registry.loaded) {
        await this.unloadPlugin(pluginId);
      }

      // Remove from maps
      this._plugins.delete(pluginId);
      this._pluginsByProviderName.delete(registry.plugin.name);
      this._loadedPlugins.delete(pluginId);
      this._initializingPlugins.delete(pluginId);

      logger.info(`Plugin unregistered: ${pluginId}`);

      return { success: true };
    } catch (error: any) {
      const message = error?.message || 'Unknown error during plugin unregistration';
      logger.error(`Failed to unregister plugin '${pluginId}':`, message);

      return { success: false, error: message };
    }
  }

  /**
   * Get plugins that support dynamic models
   */
  getPluginsWithDynamicModels(): ProviderPlugin[] {
    return this.getLoadedPlugins().filter((p) => {
      const caps = p.getCapabilities?.();
      return caps?.supportsDynamicModels ?? false;
    });
  }

  /**
   * Export all plugins as a model info source
   */
  getAllPluginModels(): ModelInfo[] {
    return this.getLoadedPlugins().flatMap((p) => p.staticModels);
  }

  /**
   * Reset registry (for testing)
   */
  reset(): void {
    this._plugins.clear();
    this._pluginsByProviderName.clear();
    this._loadedPlugins.clear();
    this._initializingPlugins.clear();
  }

  // ==================== Private Methods ====================

  /**
   * Validate plugin before registration
   */
  private async _validatePlugin(plugin: ProviderPlugin): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check required fields
    if (!plugin.pluginMetadata?.id) {
      errors.push('Plugin metadata must have an id');
    }

    if (!plugin.pluginMetadata?.name) {
      errors.push('Plugin metadata must have a name');
    }

    if (!plugin.pluginMetadata?.version) {
      errors.push('Plugin metadata must have a version');
    }

    if (!plugin.name) {
      errors.push('Plugin must have a provider name');
    }

    if (!Array.isArray(plugin.staticModels)) {
      errors.push('Plugin must have a staticModels array');
    }

    if (typeof plugin.getModelInstance !== 'function') {
      errors.push('Plugin must implement getModelInstance method');
    }

    // Call plugin's own validate if available
    if (plugin.validate) {
      try {
        const result = await plugin.validate();

        if (!result.valid) {
          errors.push(...result.errors);
        }
      } catch (error: any) {
        errors.push(`Plugin validation hook failed: ${error?.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Emit lifecycle hooks
   */
  private _emitHook(hookName: string, plugin: ProviderPlugin): void {
    const callbacks = this._pluginHooks.get(hookName);

    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(plugin);
        } catch (error: any) {
          logger.error(`Hook '${hookName}' callback failed:`, error?.message);
        }
      });
    }
  }
}

/**
 * Get the global plugin registry instance
 */
export function getPluginRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}
