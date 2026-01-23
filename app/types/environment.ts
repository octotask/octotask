// Environment-related types for type safety

export interface CloudflareEnv {
  [key: string]: string | undefined;
}

export interface ProviderConfig {
  name: string;
  apiTokenKey?: string;
  baseUrlKey?: string;
  baseUrl?: string;
}

export interface ProviderSettings {
  [provider: string]: {
    enabled: boolean;
    config?: Record<string, unknown>;
  };
}
