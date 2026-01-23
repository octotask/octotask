import type { BaseProvider } from './base-provider';

/**
 * Plugin metadata describing a provider plugin
 */
export interface PluginMetadata {
  /** Unique identifier for the plugin */
  id: string;

  /** Human-readable name */
  name: string;

  /** Version string (semver) */
  version: string;

  /** Description of what the plugin does */
  description: string;

  /** Author information */
  author: string;

  /** License (e.g., 'MIT', 'Apache-2.0') */
  license: string;

  /** Repository URL */
  repository?: string;

  /** Plugin homepage URL */
  homepage?: string;

  /** Keywords for discovery */
  keywords?: string[];

  /** Minimum app version required */
  minAppVersion?: string;

  /** Maximum app version compatible */
  maxAppVersion?: string;

  /** Icon/logo URL */
  icon?: string;

  /** Configuration schema for the plugin */
  configSchema?: Record<string, unknown>;
}

/**
 * Lifecycle hook for plugin initialization
 */
export interface PluginLifecycle {
  /** Called when plugin is loaded */
  onLoad?(): Promise<void>;

  /** Called when plugin is unloaded */
  onUnload?(): Promise<void>;

  /** Called when app settings change */
  onSettingsChange?(settings: Record<string, unknown>): Promise<void>;

  /** Validate plugin dependencies and configuration */
  validate?(): Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Provider plugin interface - extends BaseProvider with plugin capabilities
 */
export interface ProviderPlugin extends BaseProvider, PluginLifecycle {
  /** Plugin metadata */
  readonly pluginMetadata: PluginMetadata;

  /** Plugin-specific configuration */
  getPluginConfig?(): Record<string, unknown>;

  /** Set plugin configuration */
  setPluginConfig?(config: Record<string, unknown>): Promise<void>;

  /** Get plugin capabilities/features */
  getCapabilities?(): PluginCapabilities;

  /** Get health status of the plugin */
  getHealthStatus?(): Promise<PluginHealthStatus>;
}

/**
 * Plugin capabilities descriptor
 */
export interface PluginCapabilities {
  /** Whether plugin supports streaming */
  supportsStreaming: boolean;

  /** Whether plugin supports dynamic model discovery */
  supportsDynamicModels: boolean;

  /** Whether plugin supports custom settings */
  supportsCustomSettings: boolean;

  /** Additional custom capabilities */
  custom?: Record<string, boolean>;
}

/**
 * Plugin health status
 */
export interface PluginHealthStatus {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Last check timestamp */
  lastCheck: number;

  /** Status message */
  message?: string;

  /** Specific component statuses */
  components?: Record<string, ComponentStatus>;
}

/**
 * Health status of a plugin component
 */
export interface ComponentStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
}

/**
 * Plugin loading options
 */
export interface PluginLoadOptions {
  /** Plugin source (file path, module name, or URL) - optional for inline plugins */
  source?: string;

  /** Plugin configuration */
  config?: Record<string, unknown>;

  /** Whether to auto-initialize after loading */
  autoInit?: boolean;

  /** Whether to verify plugin signature (if applicable) */
  verifySignature?: boolean;
}

/**
 * Plugin registration result
 */
export interface PluginRegistrationResult {
  /** Whether registration was successful */
  success: boolean;

  /** Plugin ID if successful */
  pluginId?: string;

  /** Error message if failed */
  error?: string;

  /** Warnings (if any) */
  warnings?: string[];
}

/**
 * Type guard to check if provider is a plugin
 */
export function isProviderPlugin(provider: unknown): provider is ProviderPlugin {
  if (!provider || typeof provider !== 'object') {
    return false;
  }

  const p = provider as any;

  return typeof p.pluginMetadata === 'object' && typeof p.name === 'string' && typeof p.getModelInstance === 'function';
}

/**
 * Type guard to check if object has lifecycle methods
 */
export function hasPluginLifecycle(obj: unknown): obj is PluginLifecycle {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const o = obj as any;

  return typeof o.onLoad === 'function' || typeof o.onUnload === 'function';
}
