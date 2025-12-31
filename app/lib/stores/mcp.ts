import { map } from 'nanostores';
import type { MCPConfig, MCPServerTools } from '~/lib/services/mcpService';

const MCP_SETTINGS_KEY = 'mcp_settings';
const isBrowser = typeof window !== 'undefined';

export type MCPSettings = {
  mcpConfig: MCPConfig;
  maxLLMSteps: number;
};

const defaultSettings = {
  maxLLMSteps: 5,
  mcpConfig: {
    mcpServers: {},
  },
} satisfies MCPSettings;

type Store = {
  isInitialized: boolean;
  settings: MCPSettings;
  serverTools: MCPServerTools;
  error: string | null;
  isUpdatingConfig: boolean;
};

export const mcpStore = map<Store>({
  isInitialized: false,
  settings: defaultSettings,
  serverTools: {},
  error: null,
  isUpdatingConfig: false,
});

export const initializeMCP = async () => {
  if (mcpStore.get().isInitialized) {
    return;
  }

  if (isBrowser) {
    const savedConfig = localStorage.getItem(MCP_SETTINGS_KEY);

    if (savedConfig) {
      try {
        const settings = JSON.parse(savedConfig) as MCPSettings;
        const serverTools = await updateServerConfig(settings.mcpConfig);
        mcpStore.setKey('settings', settings);
        mcpStore.setKey('serverTools', serverTools);
      } catch (error) {
        console.error('Error parsing saved mcp config:', error);
        mcpStore.setKey(
          'error',
          `Error parsing saved mcp config: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      localStorage.setItem(MCP_SETTINGS_KEY, JSON.stringify(defaultSettings));
    }
  }

  mcpStore.setKey('isInitialized', true);
};

export const updateMCPSettings = async (newSettings: MCPSettings) => {
  if (mcpStore.get().isUpdatingConfig) {
    return;
  }

  try {
    mcpStore.setKey('isUpdatingConfig', true);

    const serverTools = await updateServerConfig(newSettings.mcpConfig);

    if (isBrowser) {
      localStorage.setItem(MCP_SETTINGS_KEY, JSON.stringify(newSettings));
    }

    mcpStore.setKey('settings', newSettings);
    mcpStore.setKey('serverTools', serverTools);
  } catch (error) {
    throw error;
  } finally {
    mcpStore.setKey('isUpdatingConfig', false);
  }
};

export const checkMCPServersAvailabilities = async () => {
  const response = await fetch('/api/mcp-check', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
  }

  const serverTools = (await response.json()) as MCPServerTools;

  mcpStore.setKey('serverTools', serverTools);
};

async function updateServerConfig(config: MCPConfig) {
  const response = await fetch('/api/mcp-update-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as MCPServerTools;

  return data;
}
