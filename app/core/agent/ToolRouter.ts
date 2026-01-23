import type { ToolSchema, ToolArgs } from '~/types/tool';

export interface Tool {
  name: string;
  description: string;
  execute: (args: ToolArgs) => Promise<unknown>;
  schema: ToolSchema;
}

export class ToolRouter {
  private _tools: Map<string, Tool> = new Map();

  registerTool(tool: Tool) {
    if (this._tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }

    this._tools.set(tool.name, tool);
    console.log(`Registered tool: ${tool.name}`);
  }

  getTool(name: string): Tool | undefined {
    return this._tools.get(name);
  }

  async executeTool(name: string, args: ToolArgs): Promise<unknown> {
    const tool = this._tools.get(name);

    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      console.log(`Executing tool: ${name} with args:`, args);
      return await tool.execute(args);
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  }

  getToolDefinitions(): Array<{ name: string; description: string; parameters: ToolSchema }> {
    return Array.from(this._tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.schema,
    }));
  }
}
