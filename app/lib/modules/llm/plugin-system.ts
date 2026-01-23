/**
 * Provider Plugin System
 *
 * Complete plugin system for dynamic LLM provider registration.
 * Allows adding new providers without modifying core code.
 *
 * @module ~/lib/modules/llm/plugin-system
 */

export type {
  ProviderPlugin,
  PluginMetadata,
  PluginLifecycle,
  PluginCapabilities,
  PluginHealthStatus,
  ComponentStatus,
  PluginLoadOptions,
  PluginRegistrationResult,
} from './plugin';

export { isProviderPlugin, hasPluginLifecycle } from './plugin';

export { ProviderRegistry, getPluginRegistry } from './provider-registry';

export type { ProviderRegistry } from './provider-registry';

export { PluginLoader, createPluginLoader } from './plugin-loader';

// Re-export from manager for convenience
export { LLMManager } from './manager';
