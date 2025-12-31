import fg from 'fast-glob';
import fs from 'fs/promises';

export interface Document {
  path: string;
  content: string;
  chunks: string[];
}

export class Indexer {
  private readonly _maxChunkSize = 1000; // Characters roughly
  private readonly _overlap = 100;

  async indexWorkspace(rootPath: string): Promise<Document[]> {
    console.log(`Indexing workspace: ${rootPath}`);

    try {
      // Find all relevant files, ignoring common non-source directories
      const files = await fg('**/*.{ts,tsx,js,jsx,md,json,css,scss}', {
        cwd: rootPath,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
        absolute: true,
        onlyFiles: true,
      });

      const documents: Document[] = [];

      for (const file of files) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          const chunks = this._chunkContent(content);
          documents.push({
            path: file,
            content,
            chunks,
          });
        } catch (err) {
          console.error(`Failed to read file ${file}:`, err);
        }
      }

      console.log(`Indexed ${documents.length} files.`);

      return documents;
    } catch (error) {
      console.error('Error indexing workspace:', error);
      return [];
    }
  }

  private _chunkContent(content: string): string[] {
    if (!content || content.length === 0) {
      return [];
    }

    const chunks: string[] = [];
    let startIndex = 0;

    while (startIndex < content.length) {
      let endIndex = startIndex + this._maxChunkSize;

      // If we are not at the end, try to break at a newline
      if (endIndex < content.length) {
        const nextNewline = content.indexOf('\n', endIndex);

        if (nextNewline !== -1 && nextNewline - endIndex < 200) {
          endIndex = nextNewline;
        }
      }

      chunks.push(content.slice(startIndex, endIndex));
      startIndex = endIndex - this._overlap;

      // Prevent infinite loops if overlap is bigger than chunk (unlikely with these settings)
      if (startIndex >= endIndex) {
        startIndex = endIndex;
      }
    }

    return chunks;
  }
}
