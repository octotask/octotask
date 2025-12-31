import fg from 'fast-glob';
import fs from 'fs/promises';

export interface Document {
  path: string;
  content: string;
  chunks: string[];
}

export interface FileMetadata {
  mtime: number;
  size: number;
}

export interface IndexResult {
  changedDocuments: Document[];
  deletedFiles: string[];
  metadata: Record<string, FileMetadata>;
}

export class Indexer {
  private readonly _maxChunkSize = 1000; // Characters roughly
  private readonly _overlap = 100;

  async indexWorkspace(rootPath: string, oldMetadata: Record<string, FileMetadata> = {}): Promise<IndexResult> {
    console.log(`Indexing workspace: ${rootPath}`);

    try {
      // Find all relevant files
      const files = await fg('**/*.{ts,tsx,js,jsx,md,json,css,scss}', {
        cwd: rootPath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        absolute: true,
        onlyFiles: true,
      });

      const changedDocuments: Document[] = [];
      const newMetadata: Record<string, FileMetadata> = {};
      const currentFiles = new Set(files);

      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          const meta: FileMetadata = {
            mtime: stats.mtimeMs,
            size: stats.size,
          };

          newMetadata[file] = meta;

          const cached = oldMetadata[file];
          const isChanged = !cached || cached.mtime !== meta.mtime || cached.size !== meta.size;

          if (isChanged) {
            console.log(`File changed or new: ${file}`);

            const content = await fs.readFile(file, 'utf-8');
            const chunks = this._chunkContent(content, file, rootPath);
            changedDocuments.push({
              path: file,
              content,
              chunks,
            });
          }
        } catch (err) {
          console.error(`Failed to process file ${file}:`, err);
        }
      }

      // Identify deleted files
      const deletedFiles = Object.keys(oldMetadata).filter((path) => !currentFiles.has(path));

      if (deletedFiles.length > 0) {
        console.log(`Identified ${deletedFiles.length} deleted files.`);
      }

      console.log(`Index scan complete. ${changedDocuments.length} files changed/new, ${deletedFiles.length} deleted.`);

      return {
        changedDocuments,
        deletedFiles,
        metadata: newMetadata,
      };
    } catch (error) {
      console.error('Error indexing workspace:', error);
      return { changedDocuments: [], deletedFiles: [], metadata: {} };
    }
  }

  private _chunkContent(content: string, filePath: string, rootPath: string): string[] {
    if (!content || content.length === 0) {
      return [];
    }

    const relativePath = filePath.replace(rootPath, '').replace(/^\//, '');
    const extension = filePath.split('.').pop() || '';
    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < content.length) {
      let endIndex = startIndex + this._maxChunkSize;

      if (endIndex < content.length) {
        const optimalBreak = this._findOptimalBreak(content, startIndex, endIndex, extension);
        endIndex = optimalBreak;
      }

      let chunk = content.slice(startIndex, endIndex);

      // Prepend context header
      chunk = `--- FILE: ${relativePath} ---\n${chunk}`;

      chunks.push(chunk);
      startIndex = endIndex - this._overlap;

      // Prevent infinite loops if overlap is bigger than chunk
      if (startIndex >= endIndex) {
        startIndex = endIndex;
      }
    }

    return chunks;
  }

  private _findOptimalBreak(content: string, start: number, end: number, extension: string): number {
    const windowSize = 300; // Look back up to 300 characters to find a good break
    const lookbackStart = Math.max(start, end - windowSize);
    const textToSearch = content.slice(lookbackStart, end);

    let regex: RegExp;

    // Language heuristics
    if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
      // Look for function, class, export, or top level declarations
      regex = /\n(?=(export\s+)?(class|function|interface|type|const|let|var)\s+)/g;
    } else if (extension === 'md') {
      // Look for headings
      regex = /\n(?=#+\s+)/g;
    } else {
      // Generic fallback - double newlines
      regex = /\n\s*\n/g;
    }

    const matches = Array.from(textToSearch.matchAll(regex));

    if (matches.length > 0) {
      // Take the last match in the window
      const lastMatch = matches[matches.length - 1];
      return lookbackStart + lastMatch.index!;
    }

    // Fallback 1: Last single newline
    const lastNewline = textToSearch.lastIndexOf('\n');

    if (lastNewline !== -1) {
      return lookbackStart + lastNewline;
    }

    // Fallback 2: Hard break at max size
    return end;
  }
}
