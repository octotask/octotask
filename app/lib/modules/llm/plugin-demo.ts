/**
 * Plugin System Integration Test & Demo
 *
 * This file demonstrates the complete plugin workflow:
 * - Creating a plugin
 * - Registering it
 * - Loading/unloading
 * - Health monitoring
 * - Integration with LLMManager
 */

import { ProviderRegistry, getPluginRegistry } from './provider-registry';
import { PluginLoader } from './plugin-loader';
import { LLMManager } from './manager';
import type { ProviderPlugin, PluginMetadata } from './plugin';

/**
 * Demo: Complete plugin workflow
 */
export async function demoPluginWorkflow() {
  console.log('=== Provider Plugin System Demo ===\n');

  // Step 1: Create a simple test plugin
  console.log('Step 1: Creating a test plugin...');

  class TestProviderPlugin extends (await import('./base-provider')).BaseProvider implements ProviderPlugin {
    name = 'TestProvider';

    config = {
      apiTokenKey: 'TEST_API_KEY',
    };

    staticModels = [
      {
        name: 'test-model',
        label: 'Test Model',
        provider: 'TestProvider',
        maxTokenAllowed: 2048,
      },
    ];

    pluginMetadata: PluginMetadata = {
      id: 'provider-test-demo',
      name: 'Test Provider',
      version: '1.0.0',
      description: 'A test provider for demonstration',
      author: 'Demo',
      license: 'MIT',
    };

    async onLoad() {
      console.log('  → Plugin onLoad called');
    }

    async onUnload() {
      console.log('  → Plugin onUnload called');
    }

    async validate() {
      console.log('  → Plugin validation called');
      return { valid: true, errors: [] };
    }

    getModelInstance() {
      throw new Error('Not implemented for demo');
    }

    getCapabilities() {
      return {
        supportsStreaming: false,
        supportsDynamicModels: false,
        supportsCustomSettings: true,
      };
    }

    async getHealthStatus() {
      return {
        status: 'healthy',
        lastCheck: Date.now(),
        message: 'Test plugin is operational',
      };
    }
  }

  // Step 2: Register the plugin
  console.log('\nStep 2: Registering plugin with registry...');

  const registry = getPluginRegistry();
  const plugin = new TestProviderPlugin();

  const registerResult = await registry.registerPlugin(plugin);
  console.log(`  ✓ Registration: ${registerResult.success}`);
  console.log(`  ✓ Plugin ID: ${registerResult.pluginId}`);

  if (!registerResult.success) {
    console.error('Failed to register plugin:', registerResult.error);
    return;
  }

  const pluginId = registerResult.pluginId!;

  // Step 3: Load the plugin
  console.log('\nStep 3: Loading plugin...');

  const loadResult = await registry.loadPlugin(pluginId);
  console.log(`  ✓ Load result: ${loadResult.success}`);

  // Step 4: Check plugin status
  console.log('\nStep 4: Checking plugin status...');

  const isLoaded = registry.isPluginLoaded(pluginId);
  console.log(`  ✓ Is loaded: ${isLoaded}`);

  const metadata = registry.getPluginMetadata(pluginId);
  console.log(`  ✓ Plugin: ${metadata?.name} v${metadata?.version}`);

  // Step 5: Get health status
  console.log('\nStep 5: Getting plugin health status...');

  const health = await registry.getPluginHealthStatus(pluginId);
  console.log(`  ✓ Health: ${health?.status}`);
  console.log(`  ✓ Message: ${health?.message}`);

  // Step 6: List all plugins
  console.log('\nStep 6: Listing all plugins...');

  const allPlugins = registry.getAllPlugins();
  const loadedPlugins = registry.getLoadedPlugins();

  console.log(`  ✓ Total registered: ${allPlugins.length}`);
  console.log(`  ✓ Currently loaded: ${loadedPlugins.length}`);

  // Step 7: Update plugin configuration
  console.log('\nStep 7: Updating plugin configuration...');

  const newConfig = { apiKey: 'new-test-key' };
  const configResult = await registry.setPluginConfig(pluginId, newConfig);
  console.log(`  ✓ Config update: ${configResult.success}`);

  // Step 8: Get plugin configuration
  console.log('\nStep 8: Getting plugin configuration...');

  const config = registry.getPluginConfig(pluginId);
  console.log(`  ✓ Current config:`, config);

  // Step 9: Unload plugin
  console.log('\nStep 9: Unloading plugin...');

  const unloadResult = await registry.unloadPlugin(pluginId);
  console.log(`  ✓ Unload result: ${unloadResult.success}`);

  const isStillLoaded = registry.isPluginLoaded(pluginId);
  console.log(`  ✓ Is still loaded: ${isStillLoaded}`);

  // Step 10: Unregister plugin
  console.log('\nStep 10: Unregistering plugin...');

  const unregisterResult = await registry.unregisterPlugin(pluginId);
  console.log(`  ✓ Unregister result: ${unregisterResult.success}`);

  console.log('\n=== Demo Complete ===');
}

/**
 * Demo: Plugin Loader
 */
export async function demoPluginLoader() {
  console.log('\n=== Plugin Loader Demo ===\n');

  console.log('Plugin Loader Features:');
  console.log('  - Load plugins from classes/modules');
  console.log('  - Batch loading multiple plugins');
  console.log('  - Plugin discovery (extensible)');
  console.log('  - Metadata helpers');

  // Example: Create metadata
  const metadata = PluginLoader.createPluginMetadata(
    'provider-custom',
    'Custom Provider',
    '1.0.0',
    'A custom LLM provider',
    'Your Company',
    {
      license: 'MIT',
      keywords: ['llm', 'custom'],
      minAppVersion: '1.0.0',
    },
  );

  console.log('\nCreated metadata:', metadata);

  // Example: Check dependencies
  const deps = PluginLoader.verifyDependencies({
    '@ai-sdk/openai': '1.0.0',
    'non-existent-package': '1.0.0',
  });

  console.log('\nDependency check:', deps);

  console.log('\n=== Loader Demo Complete ===');
}

/**
 * Demo: LLMManager Integration
 */
export async function demoLLMManagerIntegration() {
  console.log('\n=== LLMManager Integration Demo ===\n');

  const manager = LLMManager.getInstance();
  const registry = manager.getPluginRegistry();

  console.log('LLMManager Integration:');
  console.log('  - Plugins automatically registered as providers');
  console.log('  - Models from plugins included in model list');
  console.log('  - Plugin lifecycle managed transparently');
  console.log('  - Unified provider interface');

  const allProviders = manager.getAllProviders();
  console.log(`\nTotal providers available: ${allProviders.length}`);

  const pluginCount = registry.getAllPlugins().length;
  console.log(`Plugin-based providers: ${pluginCount}`);

  console.log('\n=== Integration Demo Complete ===');
}

/**
 * Demo: Error Handling
 */
export async function demoErrorHandling() {
  console.log('\n=== Error Handling Demo ===\n');

  const registry = getPluginRegistry();

  // Try to load non-existent plugin
  console.log('Attempting to load non-existent plugin...');

  const result1 = await registry.loadPlugin('nonexistent-id');
  console.log(`  Result: ${result1.success} (Error: ${result1.error})`);

  // Try to register invalid plugin
  console.log('\nAttempting to register invalid plugin...');

  const result2 = await registry.registerPlugin({} as any);
  console.log(`  Result: ${result2.success} (Error: ${result2.error})`);

  console.log('\n=== Error Handling Demo Complete ===');
}

/**
 * Run all demos
 */
export async function runAllDemos() {
  try {
    await demoPluginWorkflow();
    await demoPluginLoader();
    await demoLLMManagerIntegration();
    await demoErrorHandling();
    console.log('\n✓ All demos completed successfully!');
  } catch (error) {
    console.error('\n✗ Demo failed:', error);
  }
}

// Type-safe export for testing
export type { ProviderRegistry, PluginLoader };
