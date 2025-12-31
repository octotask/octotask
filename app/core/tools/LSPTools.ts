import type { Tool } from '~/core/agent/ToolRouter';
import { LSPManager } from '~/core/workspace/LSPManager';

export class LSPTools {
  private _lspManager: LSPManager;

  constructor(lspManager: LSPManager) {
    this._lspManager = lspManager;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'go_to_definition',
        description: 'Find the definition of a symbol at a specific position in a file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute path to the file' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' },
          },
          required: ['path', 'line', 'character'],
        },
        execute: async (args: { path: string; line: number; character: number }) => {
          try {
            const result = await this._lspManager.getDefinition(args.path, args.line, args.character);
            return JSON.stringify(result, null, 2) || 'Definition not found.';
          } catch (error: any) {
            return `Error finding definition: ${error.message}`;
          }
        },
      },
      {
        name: 'find_references',
        description: 'Find all references of a symbol at a specific position in a file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute path to the file' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' },
          },
          required: ['path', 'line', 'character'],
        },
        execute: async (args: { path: string; line: number; character: number }) => {
          try {
            const result = await this._lspManager.getReferences(args.path, args.line, args.character);
            return JSON.stringify(result, null, 2) || 'References not found.';
          } catch (error: any) {
            return `Error finding references: ${error.message}`;
          }
        },
      },
      {
        name: 'list_symbols',
        description: 'List all symbols (functions, classes, etc.) in a file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute path to the file' },
          },
          required: ['path'],
        },
        execute: async (args: { path: string }) => {
          try {
            const result = await this._lspManager.getSymbols(args.path);
            return JSON.stringify(result, null, 2) || 'No symbols found.';
          } catch (error: any) {
            return `Error listing symbols: ${error.message}`;
          }
        },
      },
      {
        name: 'get_hover',
        description: 'Get type information and documentation (hover) for a symbol at a specific position in a file.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Absolute path to the file' },
            line: { type: 'number', description: 'Line number (0-indexed)' },
            character: { type: 'number', description: 'Character position (0-indexed)' },
          },
          required: ['path', 'line', 'character'],
        },
        execute: async (args: { path: string; line: number; character: number }) => {
          try {
            const result = await this._lspManager.getHover(args.path, args.line, args.character);
            return JSON.stringify(result, null, 2) || 'Hover information not found.';
          } catch (error: any) {
            return `Error getting hover information: ${error.message}`;
          }
        },
      },
    ];
  }
}
