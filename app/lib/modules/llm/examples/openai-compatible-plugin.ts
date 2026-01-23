/**
 * Example: OpenAI-Compatible Provider Plugin
 *
 * This demonstrates creating a plugin for an OpenAI-compatible API
 * (e.g., Ollama, vLLM, LM Studio, Together.ai, etc.)
 */

import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ProviderPlugin, PluginMetadata, PluginCapabilities, PluginHealthStatus } from '~/lib/modules/llm/plugin';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * OpenAI-compatible provider plugin
 * Can be used for various backends that implement the OpenAI API
 */
export default class OpenAICompatiblePlugin extends BaseProvider implements ProviderPlugin {
  // ==================== Configuration ====================

  name = 'OpenAICompatibleCustom';

  config = {
    apiTokenKey: 'OPENAI_COMPATIBLE_API_KEY',
    baseUrlKey: 'OPENAI_COMPATIBLE_BASE_URL',
    baseUrl: 'http://localhost:8000', // Default for local servers
  };

  staticModels: ModelInfo[] = [
    {
      name: 'gpt-3.5-turbo',
      label: 'GPT-3.5 Turbo (Compatible)',
      provider: 'OpenAICompatibleCustom',
      maxTokenAllowed: 4096,
      maxCompletionTokens: 2048,
    },
  ];

  getApiKeyLink = 'https://example.com/docs';
  labelForGetApiKey = 'See Documentation';
  icon = 'i-ph:api';

  // ==================== Plugin Metadata ====================

  pluginMetadata: PluginMetadata = {
    id: 'provider-openai-compatible-custom',
    name: 'OpenAI-Compatible Custom',
    version: '1.0.0',
    description: 'Custom OpenAI-compatible provider plugin for local/custom APIs',
    author: 'Your Company',
    license: 'MIT',
    keywords: ['openai', 'compatible', 'api', 'custom'],
    minAppVersion: '1.0.0',
  };

  // ==================== Lifecycle ====================

  async onLoad(): Promise<void> {
    console.log(`Loading OpenAI-compatible plugin`);
  }

  async onUnload(): Promise<void> {
    console.log(`Unloading OpenAI-compatible plugin`);
  }

  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }

  // ==================== Dynamic Model Discovery ====================

  /**
   * Fetch available models from the OpenAI-compatible API
   */
  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    try {
      const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
        apiKeys,
        providerSettings: settings,
        serverEnv,
        defaultBaseUrlKey: 'OPENAI_COMPATIBLE_BASE_URL',
        defaultApiTokenKey: 'OPENAI_COMPATIBLE_API_KEY',
      });

      if (!baseUrl) {
        console.warn('No base URL configured for OpenAI-compatible provider');
        return [];
      }

      // Call /models endpoint
      const response = await fetch(`${baseUrl}/v1/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });

      if (!response.ok) {
        console.error('Failed to fetch models:', response.statusText);
        return [];
      }

      const data = (await response.json()) as { data: Array<{ id: string }> };

      return (
        data.data?.map((model) => ({
          name: model.id,
          label: model.id,
          provider: this.name,
          maxTokenAllowed: 4096,
          maxCompletionTokens: 2048,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching models from OpenAI-compatible API:', error);
      return [];
    }
  }

  // ==================== Model Creation ====================

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'OPENAI_COMPATIBLE_BASE_URL',
      defaultApiTokenKey: 'OPENAI_COMPATIBLE_API_KEY',
    });

    if (!baseUrl) {
      throw new Error(`Missing configuration for ${this.name}. Set OPENAI_COMPATIBLE_BASE_URL`);
    }

    return createOpenAI({
      apiKey: apiKey || 'sk-no-key',
      baseURL: baseUrl,
      defaultQuery: {},
      defaultHeaders: {},
    })(model);
  }

  // ==================== Capabilities ====================

  getCapabilities(): PluginCapabilities {
    return {
      supportsStreaming: true,
      supportsDynamicModels: true,
      supportsCustomSettings: true,
    };
  }

  async getHealthStatus(): Promise<PluginHealthStatus> {
    try {
      // Check if server is reachable
      const baseUrl = this.config.baseUrl || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/v1/models`, { method: 'HEAD' });

      return {
        status: response.ok ? 'healthy' : 'degraded',
        lastCheck: Date.now(),
        message: response.ok ? 'Server reachable' : 'Server returned error',
        components: {
          server: {
            status: response.ok ? 'healthy' : 'unhealthy',
            message: `HTTP ${response.status}`,
          },
        },
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        lastCheck: Date.now(),
        message: `Connection failed: ${error?.message}`,
      };
    }
  }

  getPluginConfig(): Record<string, unknown> {
    return {
      baseUrl: this.config.baseUrl,
      baseUrlKey: this.config.baseUrlKey,
      apiTokenKey: this.config.apiTokenKey,
    };
  }

  async setPluginConfig(config: Record<string, unknown>): Promise<void> {
    if (config.baseUrl && typeof config.baseUrl === 'string') {
      this.config.baseUrl = config.baseUrl;
    }
  }
}

/**
 * Usage:
 *
 * For Ollama:
 * ```
 * OPENAI_COMPATIBLE_BASE_URL=http://localhost:11434
 * ```
 *
 * For LM Studio:
 * ```
 * OPENAI_COMPATIBLE_BASE_URL=http://localhost:1234
 * ```
 *
 * For Together.ai:
 * ```
 * OPENAI_COMPATIBLE_BASE_URL=https://api.together.xyz
 * OPENAI_COMPATIBLE_API_KEY=your-api-key
 * ```
 */
