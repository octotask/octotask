// Tool schema types for ToolRouter

export interface ToolSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolArgs {
  [key: string]: unknown;
}
