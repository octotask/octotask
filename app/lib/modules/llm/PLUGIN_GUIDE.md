# Provider Plugin System - Developer Guide

## Overview

The Provider Plugin System allows you to add new LLM providers to octotask **without modifying the core codebase**. Plugins are:

- **Isolated**: Run independently with their own configuration and lifecycle
- **Discoverable**: Automatically discovered and registered by the system
- **Safe**: Errors in plugins don't crash the application
- **Composable**: Can depend on other plugins or libraries
- **Monitored**: Health checks and status tracking built-in

## Quick Start

### 1. Create a Plugin Class

```typescript
import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ProviderPlugin, PluginMetadata } from '~/lib/modules/llm/plugin';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { LanguageModelV1 } from 'ai';

export default class MyCustomProvider extends BaseProvider implements ProviderPlugin {
  name = 'MyCustom';

  pluginMetadata: PluginMetadata = {
    id: 'provider-my-custom',
    name: 'My Custom Provider',
    version: '1.0.0',
    description: 'My custom LLM provider',
    author: 'Your Name',
    license: 'MIT',
  };

  config = {
    apiTokenKey: 'MY_CUSTOM_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'my-model',
      label: 'My Model',
      provider: 'MyCustom',
      maxTokenAllowed: 4096,
      maxCompletionTokens: 2048,
    },
  ];

  getModelInstance(options): LanguageModelV1 {
    // Return your language model instance
    throw new Error('Implement model instance creation');
  }
}
```

### 2. Load Your Plugin

```typescript
import { createPluginLoader } from '~/lib/modules/llm/plugin-loader';
import MyCustomProvider from './my-custom-provider';

const loader = createPluginLoader();
const result = await loader.loadPlugin(new MyCustomProvider());

if (result.success) {
  console.log(`Plugin loaded: ${result.pluginId}`);
}
```

## Architecture

### Plugin System Components

```
┌─────────────────────────────────────┐
│         LLMManager                  │
│  (Model & Provider Management)      │
└──────────────┬──────────────────────┘
               │
               ├─► ProviderRegistry
               │   (Plugin Lifecycle)
               │
               ├─► PluginLoader
               │   (Plugin Discovery)
               │
               └─► Plugins
                   (Provider Implementations)
```

### Core Interfaces

#### ProviderPlugin

Extends `BaseProvider` with plugin capabilities:

```typescript
interface ProviderPlugin extends BaseProvider, PluginLifecycle {
  readonly pluginMetadata: PluginMetadata;
  getPluginConfig?(): Record<string, unknown>;
  setPluginConfig?(config: Record<string, unknown>): Promise<void>;
  getCapabilities?(): PluginCapabilities;
  getHealthStatus?(): Promise<PluginHealthStatus>;
}
```

#### PluginMetadata

Describes your plugin:

```typescript
interface PluginMetadata {
  id: string; // Unique identifier
  name: string; // Human-readable name
  version: string; // Semantic version
  description: string;
  author: string;
  license: string;
  repository?: string;
  homepage?: string;
  keywords?: string[];
  minAppVersion?: string;
  maxAppVersion?: string;
  icon?: string;
  configSchema?: Record<string, unknown>;
}
```

#### PluginLifecycle

Hook into plugin lifecycle:

```typescript
interface PluginLifecycle {
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
  onSettingsChange?(settings: Record<string, unknown>): Promise<void>;
  validate?(): Promise<{ valid: boolean; errors: string[] }>;
}
```

## Implementation Guide

### Required Methods

Every plugin must implement these from `BaseProvider`:

1. **`name`**: Unique provider identifier

   ```typescript
   name = 'MyProvider';
   ```

2. **`staticModels`**: Array of models your provider offers

   ```typescript
   staticModels: ModelInfo[] = [
     {
       name: 'model-id',
       label: 'Model Label',
       provider: 'MyProvider',
       maxTokenAllowed: 4096,
       maxCompletionTokens: 2048,
     },
   ];
   ```

3. **`config`**: Configuration keys

   ```typescript
   config = {
     apiTokenKey: 'MY_API_KEY',
     baseUrlKey: 'MY_BASE_URL', // Optional
   };
   ```

4. **`getModelInstance()`**: Create AI SDK model instance

   ```typescript
   getModelInstance(options: {
     model: string;
     serverEnv: Env;
     apiKeys?: Record<string, string>;
     providerSettings?: Record<string, IProviderSetting>;
   }): LanguageModelV1 {
     const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
       apiKeys,
       providerSettings: options.providerSettings?.[this.name],
       serverEnv: options.serverEnv as any,
       defaultBaseUrlKey: 'MY_BASE_URL',
       defaultApiTokenKey: 'MY_API_KEY',
     });

     // Create and return model using AI SDK
     // Example for OpenAI:
     return createOpenAI({ apiKey, baseURL: baseUrl })(model);
   }
   ```

### Optional Features

#### 1. Dynamic Model Discovery

Fetch available models from API:

```typescript
async getDynamicModels(
  apiKeys?: Record<string, string>,
  settings?: IProviderSetting,
  serverEnv?: Record<string, string>,
): Promise<ModelInfo[]> {
  const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
    apiKeys,
    providerSettings: settings,
    serverEnv,
    defaultBaseUrlKey: 'MY_BASE_URL',
    defaultApiTokenKey: 'MY_API_KEY',
  });

  // Fetch from API
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return response.json();
}
```

#### 2. Lifecycle Hooks

```typescript
async onLoad(): Promise<void> {
  // Initialize resources, validate config, etc.
}

async onUnload(): Promise<void> {
  // Cleanup, close connections, etc.
}

async onSettingsChange(settings: Record<string, unknown>): Promise<void> {
  // Handle configuration changes
}

async validate(): Promise<{ valid: boolean; errors: string[] }> {
  // Check if plugin is valid to use
  return { valid: true, errors: [] };
}
```

#### 3. Health Monitoring

```typescript
async getHealthStatus(): Promise<PluginHealthStatus> {
  return {
    status: 'healthy', // or 'degraded', 'unhealthy'
    lastCheck: Date.now(),
    message: 'All systems operational',
    components: {
      api: { status: 'healthy' },
      auth: { status: 'healthy' },
    },
  };
}
```

#### 4. Capabilities Declaration

```typescript
getCapabilities(): PluginCapabilities {
  return {
    supportsStreaming: true,
    supportsDynamicModels: true,
    supportsCustomSettings: true,
    custom: {
      supportsRateLimiting: true,
      supportsImages: false,
    },
  };
}
```

#### 5. Configuration Management

```typescript
getPluginConfig(): Record<string, unknown> {
  return { /* current config */ };
}

async setPluginConfig(config: Record<string, unknown>): Promise<void> {
  // Update configuration
}
```

## Real-World Examples

### Example 1: OpenAI-Compatible API

See `openai-compatible-plugin.ts` for a complete example that works with:

- Ollama
- LM Studio
- vLLM
- Together.ai
- And other OpenAI-compatible APIs

### Example 2: Custom Provider

See `example-plugin.ts` for a template showing all features.

## Integration with LLMManager

Once loaded, plugins are automatically integrated:

```typescript
import { LLMManager } from '~/lib/modules/llm/manager';

const manager = LLMManager.getInstance();

// Get all providers (including plugins)
const providers = manager.getAllProviders();

// Get models from all providers (including plugins)
const models = await manager.updateModelList({
  apiKeys: { MyCustom: 'key-value' },
});

// Use a plugin provider's model
const model = manager.getProvider('MyCustom');
```

## Plugin Loading Patterns

### Pattern 1: Load at Startup

```typescript
import { LLMManager } from '~/lib/modules/llm/manager';
import MyPlugin from './plugins/my-plugin';

async function initializePlugins() {
  const manager = LLMManager.getInstance();
  const result = await manager.registerPlugin(new MyPlugin());
  console.log(result);
}

initializePlugins();
```

### Pattern 2: Load on Demand

```typescript
const manager = LLMManager.getInstance();
const registry = manager.getPluginRegistry();

// Load plugin dynamically
const plugin = new MyPlugin();
const result = await registry.registerPlugin(plugin);

if (result.success) {
  await registry.loadPlugin(result.pluginId!);
}
```

### Pattern 3: Batch Loading

```typescript
const loader = createPluginLoader();
const plugins = [Plugin1, Plugin2, Plugin3];

const { successful, failed } = await loader.loadPlugins(plugins);
console.log(`Loaded ${successful.length}, failed ${failed.length}`);
```

## Configuration Management

### Environment Variables

Plugins use environment variables for configuration:

```env
MY_CUSTOM_API_KEY=sk-xxx
MY_CUSTOM_BASE_URL=https://api.example.com
```

### Runtime Configuration

Update configuration at runtime:

```typescript
const registry = manager.getPluginRegistry();
const config = { apiKey: 'new-key' };
await registry.setPluginConfig('my-plugin-id', config);
```

## Error Handling

Plugins should handle errors gracefully:

```typescript
try {
  const models = await plugin.getDynamicModels(apiKeys);
} catch (error) {
  // Errors don't crash the system
  console.error('Plugin error:', error);
  // Return cached or static models as fallback
  return plugin.staticModels;
}
```

## Testing Your Plugin

```typescript
import { ProviderRegistry } from '~/lib/modules/llm/provider-registry';

describe('MyCustomProvider', () => {
  let registry: ProviderRegistry;
  let plugin: MyCustomProvider;

  beforeEach(() => {
    registry = ProviderRegistry.getInstance();
    plugin = new MyCustomProvider();
  });

  afterEach(() => {
    registry.reset();
  });

  it('should register successfully', async () => {
    const result = await registry.registerPlugin(plugin);
    expect(result.success).toBe(true);
  });

  it('should load and unload', async () => {
    const result = await registry.registerPlugin(plugin);
    const pluginId = result.pluginId!;

    await registry.loadPlugin(pluginId);
    expect(registry.isPluginLoaded(pluginId)).toBe(true);

    await registry.unloadPlugin(pluginId);
    expect(registry.isPluginLoaded(pluginId)).toBe(false);
  });

  it('should provide models', () => {
    expect(plugin.staticModels.length).toBeGreaterThan(0);
    expect(plugin.staticModels[0].provider).toBe(plugin.name);
  });

  it('should create model instances', () => {
    const model = plugin.getModelInstance({
      model: plugin.staticModels[0].name,
      serverEnv: {},
      apiKeys: { MyCustom: 'test-key' },
    });
    expect(model).toBeDefined();
  });
});
```

## Best Practices

1. **Always validate configuration** in `validate()` or `onLoad()`
2. **Use environment variables** for sensitive data
3. **Implement caching** for dynamic models
4. **Handle API errors gracefully** - don't crash the app
5. **Provide health checks** so the UI can show status
6. **Document configuration** in plugin metadata
7. **Test thoroughly** before publishing
8. **Use semantic versioning** for releases
9. **Keep plugins focused** - do one thing well
10. **Log errors for debugging** but don't expose sensitive info

## Publishing Your Plugin

### Step 1: Create Plugin Package

```
my-plugin/
├── src/
│   └── index.ts          # Your plugin
├── package.json
├── README.md
└── LICENSE
```

### Step 2: Document It

Create a comprehensive README:

```markdown
# My Custom Provider Plugin

Description and usage...

## Installation

## Configuration

## Examples
```

### Step 3: Share

- Publish to npm (recommended)
- Share GitHub repo
- Post in discussions/forums

## Troubleshooting

### Plugin won't load

1. Check `validate()` returns no errors
2. Check plugin metadata is complete
3. Review console for error messages

### Models not appearing

1. Verify `staticModels` array is populated
2. Check `getDynamicModels()` succeeds
3. Confirm provider is in enabled list

### API calls failing

1. Verify API keys are set correctly
2. Check base URL configuration
3. Test API directly with curl

## Support

For help:

- Check example plugins
- Review the main provider implementations
- Open an issue in the repository

## Contributing

Plugins follow the same standards as core providers. If you're creating a
widely-used provider, consider contributing it to the core project.
