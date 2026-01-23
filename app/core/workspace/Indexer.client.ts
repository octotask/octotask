import type { Document } from './Indexer.server'; // Import type for consistency

export class Indexer {
  async indexWorkspace(): Promise<Document[]> {
    console.warn('Indexer.indexWorkspace called on client side. This should not happen in production builds.');
    return [];
  }

  async indexFile(): Promise<Document | null> {
    console.warn('Indexer.indexFile called on client side. This should not happen in production builds.');
    return null;
  }

  private _chunkContent(): string[] {
    console.warn('Indexer._chunkContent called on client side. This should not happen in production builds.');
    return [];
  }
}
