/**
 * Example: Creating a Custom Provider Plugin
 *
 * This file demonstrates how to create a new LLM provider plugin
 * that integrates with the octotask plugin system.
 */

import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ProviderPlugin, PluginMetadata, PluginCapabilities, PluginHealthStatus } from '~/lib/modules/llm/plugin';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

/**
 * Example Custom LLM Provider Plugin
 *
 * This plugin demonstrates:
 * - Implementing the ProviderPlugin interface
 * - Providing plugin metadata
 * - Implementing lifecycle hooks
 * - Supporting both static and dynamic models
 * - Providing health monitoring
 */
export default class ExampleCustomProviderPlugin extends BaseProvider implements ProviderPlugin {
  // ==================== BaseProvider Implementation ====================

  name = 'ExampleCustom';

  config = {
    apiTokenKey: 'EXAMPLE_CUSTOM_API_KEY',
    baseUrlKey: 'EXAMPLE_CUSTOM_BASE_URL',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'example-model-1',
      label: 'Example Model 1',
      provider: 'ExampleCustom',
      maxTokenAllowed: 4096,
      maxCompletionTokens: 2048,
    },
    {
      name: 'example-model-2',
      label: 'Example Model 2',
      provider: 'ExampleCustom',
      maxTokenAllowed: 8192,
      maxCompletionTokens: 4096,
    },
  ];

  getApiKeyLink = 'https://example.com/api-keys';
  labelForGetApiKey = 'Get API Key from Example';
  icon = 'i-ph:cube';

  // ==================== ProviderPlugin Implementation ====================

  /**
   * Required: Plugin metadata
   */
  pluginMetadata: PluginMetadata = {
    id: 'provider-example-custom',
    name: 'Example Custom Provider',
    version: '1.0.0',
    description: 'An example custom LLM provider plugin',
    author: 'Your Company',
    license: 'MIT',
    repository: 'https://github.com/yourusername/example-custom-provider',
    homepage: 'https://example.com',
    keywords: ['llm', 'provider', 'example', 'custom'],
    icon: 'i-ph:cube',
    minAppVersion: '1.0.0',
    configSchema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', description: 'API Key' },
        baseUrl: { type: 'string', description: 'Base URL (optional)' },
        maxRetries: { type: 'number', default: 3 },
      },
    },
  };

  // ==================== Lifecycle Hooks ====================

  /**
   * Called when the plugin is loaded into the system
   */
  async onLoad(): Promise<void> {
    console.log(`Loading plugin: ${this.pluginMetadata.id}`);

    // Initialize resources, establish connections, etc.
  }

  /**
   * Called when the plugin is unloaded
   */
  async onUnload(): Promise<void> {
    console.log(`Unloading plugin: ${this.pluginMetadata.id}`);

    // Clean up resources, close connections, etc.
  }

  /**
   * Called when app settings change
   */
  async onSettingsChange(settings: Record<string, unknown>): Promise<void> {
    console.log(`Settings changed for ${this.pluginMetadata.id}:`, settings);

    // Re-initialize if settings affect configuration
  }

  /**
   * Validate plugin is ready to use
   */
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate configuration
    if (!this.config.apiTokenKey) {
      errors.push('API token key is not configured');
    }

    // Check dependencies
    try {
      // Validate external dependencies if needed
    } catch {
      errors.push('Failed to verify dependencies');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ==================== Dynamic Models ====================

  /**
   * Fetch available models from the API (optional)
   * If your provider supports dynamic model discovery
   */
  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    try {
      const { apiKey } = this.getProviderBaseUrlAndKey({
        apiKeys,
        providerSettings: settings,
        serverEnv,
        defaultBaseUrlKey: 'EXAMPLE_CUSTOM_BASE_URL',
        defaultApiTokenKey: 'EXAMPLE_CUSTOM_API_KEY',
      });

      if (!apiKey) {
        console.warn(`No API key provided for ${this.name}`);
        return [];
      }

      /*
       * Fetch models from your API
       * const models = await fetch(`${baseUrl}/models`, {
       *   headers: { Authorization: `Bearer ${apiKey}` }
       * }).then(r => r.json());
       */

      // For example, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching dynamic models:', error);
      return [];
    }
  }

  // ==================== Model Instance Creation ====================

  /**
   * Create a language model instance for the given model name
   * This is required and called by the LLM controller
   */
  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'EXAMPLE_CUSTOM_BASE_URL',
      defaultApiTokenKey: 'EXAMPLE_CUSTOM_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name}`);
    }

    /*
     * Create and return a language model instance
     * This example shows the pattern - actual implementation depends on SDK
     *
     * Example for an OpenAI-compatible provider:
     * const { createOpenAI } = require('@ai-sdk/openai');
     * return createOpenAI({ baseURL: baseUrl, apiKey })(model);
     */

    // For now, throw error with implementation guidance
    throw new Error(
      `Model instance creation not implemented. ` + `Provider should create an appropriate language model using ai-sdk`,
    );
  }

  // ==================== Plugin Capabilities ====================

  /**
   * Describe what features this plugin supports
   */
  getCapabilities(): PluginCapabilities {
    return {
      supportsStreaming: true,
      supportsDynamicModels: true,
      supportsCustomSettings: true,
      custom: {
        supportsRateLimiting: true,
        supportsRetry: true,
      },
    };
  }

  /**
   * Get current health status of the plugin
   */
  async getHealthStatus(): Promise<PluginHealthStatus> {
    try {
      /*
       * Check API connectivity, resources, etc.
       * For example:
       * const status = await fetch(`${baseUrl}/health`);
       * const isHealthy = status.ok;
       */

      return {
        status: 'healthy',
        lastCheck: Date.now(),
        message: 'Plugin is operational',
        components: {
          api: { status: 'healthy', message: 'API connection OK' },
          models: { status: 'healthy', message: 'Models loaded' },
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        message: `Health check failed: ${error?.message}`,
      };
    }
  }

  /**
   * Get plugin configuration
   */
  getPluginConfig(): Record<string, unknown> {
    return {
      apiTokenKey: this.config.apiTokenKey,
      baseUrlKey: this.config.baseUrlKey,
    };
  }

  /**
   * Update plugin configuration
   */
  async setPluginConfig(config: Record<string, unknown>): Promise<void> {
    // Update internal configuration
    if (config.apiTokenKey && typeof config.apiTokenKey === 'string') {
      this.config.apiTokenKey = config.apiTokenKey;
    }

    if (config.baseUrlKey && typeof config.baseUrlKey === 'string') {
      this.config.baseUrlKey = config.baseUrlKey;
    }
  }
}

/**
 * Usage Example:
 *
 * ```typescript
 * import ExampleCustomProviderPlugin from './example-plugin';
 * import { createPluginLoader } from '~/lib/modules/llm/plugin-loader';
 *
 * // Create plugin instance
 * const plugin = new ExampleCustomProviderPlugin();
 *
 * // Load it
 * const loader = createPluginLoader();
 * const result = await loader.loadPlugin(plugin);
 *
 * if (result.success) {
 *   console.log(`Plugin loaded: ${result.pluginId}`);
 * }
 * ```
 */
