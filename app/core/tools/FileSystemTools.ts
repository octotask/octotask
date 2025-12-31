import fs from 'fs/promises';
import path from 'path';
import type { Tool } from '~/core/agent/ToolRouter';
import { ShadowManager } from '~/core/workspace/ShadowManager';

export class FileSystemTools {
  private _workspacePath: string;
  private _shadowManager: ShadowManager;

  constructor(workspacePath: string, shadowManager: ShadowManager) {
    this._workspacePath = workspacePath;
    this._shadowManager = shadowManager;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file. Returns staged content if available.',
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
        description: 'Update a file. Changes are staged in the shadow filesystem by default.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative path to the file' },
            content: { type: 'string', description: 'New content for the file' },
            stage: { type: 'boolean', description: 'Whether to stage changes (default: true)', default: true },
          },
          required: ['path', 'content'],
        },
        execute: async (args: { path: string; content: string; stage?: boolean }) => {
          return this.writeFile(args.path, args.content, args.stage ?? true);
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
      {
        name: 'commit_changes',
        description: 'Apply staged changes from the shadow filesystem to the actual workspace.',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Specific file to commit (optional, commits all if omitted)' },
          },
        },
        execute: async (args: { path?: string }) => {
          if (args.path) {
            await this._shadowManager.commit(args.path);
            return `Successfully committed changes for ${args.path}`;
          } else {
            const committed = await this._shadowManager.commitAll();
            return committed.length > 0
              ? `Successfully committed ${committed.length} files: ${committed.join(', ')}`
              : 'No staged changes to commit.';
          }
        },
      },
      {
        name: 'discard_changes',
        description: 'Discard all staged changes in the shadow filesystem.',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: async () => {
          await this._shadowManager.clearShadow();
          return 'All staged changes discarded.';
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
    try {
      const shadowContent = await this._shadowManager.getEffectiveContent(filePath);

      if (shadowContent !== null) {
        return shadowContent;
      }

      const fullPath = this._resolvePath(filePath);

      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async writeFile(filePath: string, content: string, stage: boolean = true): Promise<string> {
    try {
      if (stage) {
        await this._shadowManager.applyShadow(filePath, content);
        return `Successfully staged changes for ${filePath}. Use commit_changes to apply them to the workspace.`;
      } else {
        const fullPath = this._resolvePath(filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');

        return `Successfully wrote to ${filePath}`;
      }
    } catch (error) {
      return `Error writing file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const fullPath = this._resolvePath(dirPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
    } catch (error) {
      return [`Error listing files: ${error instanceof Error ? error.message : String(error)}`];
    }
  }
}
