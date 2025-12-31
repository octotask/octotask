import fs from 'fs/promises';
import path from 'path';
import type { Tool } from '~/core/agent/ToolRouter';

export class FileSystemTools {
  private _workspacePath: string;

  constructor(workspacePath: string) {
    this._workspacePath = workspacePath;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file. Provide the relative path.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
          },
          required: ['path'],
        },
        execute: async (args: { path: string }) => {
          return this.readFile(args.path);
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file. Provide the relative path and content.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
            content: { type: 'string', description: 'Content to write' },
          },
          required: ['path', 'content'],
        },
        execute: async (args: { path: string; content: string }) => {
          return this.writeFile(args.path, args.content);
        },
      },
      {
        name: 'list_files',
        description: 'List files in a directory. Provide the relative path.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the directory (optional, defaults to root)' },
          },
        },
        execute: async (args: { path?: string }) => {
          return this.listFiles(args.path || '.');
        },
      },
    ];
  }

  private _resolvePath(relativePath: string): string {
    const resolved = path.resolve(this._workspacePath, relativePath);

    if (!resolved.startsWith(this._workspacePath)) {
      throw new Error(`Access denied: path must be within workspace ${this._workspacePath}`);
    }

    return resolved;
  }

  async readFile(filePath: string): Promise<string> {
    const fullPath = this._resolvePath(filePath);

    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async writeFile(filePath: string, content: string): Promise<string> {
    const fullPath = this._resolvePath(filePath);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      return `Successfully wrote to ${filePath}`;
    } catch (error) {
      return `Error writing file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const fullPath = this._resolvePath(dirPath);

    try {
      // Simple recursive list or just top level? Top level for now to be safe
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
    } catch (error) {
      return [`Error listing files: ${error instanceof Error ? error.message : String(error)}`];
    }
  }
}
