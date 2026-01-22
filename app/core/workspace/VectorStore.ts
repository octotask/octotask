export interface SearchResult {
  path: string;
  score: number;
  chunk: string;
}

export class VectorStore {
  private _documents: any[] = [];
  private _embedder: any = null;
  private _isInitialized = false;
  private _isServer = typeof window === 'undefined';

  async initialize() {
    if (this._isServer) {
      console.log('VectorStore: Running in server mode, skipping embedding model initialization');
      this._isInitialized = true;

      return;
    }

    if (this._isInitialized) {
      return;
    }

    try {
      console.log('Initializing local embedding model...');

      // Use a small, efficient model for local embeddings
      const { getEmbedder } = await import('./VectorStore.client');
      this._embedder = await getEmbedder();
      this._isInitialized = true;
      console.log('Embedding model initialized.');
    } catch (error) {
      console.error('Failed to initialize embedding model:', error);
      throw error;
    }
  }

  async addDocuments(documents: { path: string; chunks: string[] }[]) {
    if (this._isServer) {
      console.log('VectorStore: Running in server mode, skipping document addition');
      return;
    }

    if (!this._isInitialized) {
      await this.initialize();
    }

    console.log(`Embedding ${documents.length} documents...`);

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        try {
          const output = await this._embedder(chunk, { pooling: 'mean', normalize: true });
          const embedding = output.data;

          this._documents.push({
            path: doc.path,
            chunk,
            embedding,
          });
        } catch (e) {
          console.error(`Failed to embed chunk for ${doc.path}:`, e);
        }
      }
    }
    console.log(`Stored ${this._documents.length} vector chunks.`);
  }

  removeDocumentsByPath(path: string) {
    const initialCount = this._documents.length;
    this._documents = this._documents.filter((doc) => doc.path !== path);

    const removedCount = initialCount - this._documents.length;

    if (removedCount > 0) {
      console.log(`Removed ${removedCount} chunks for path: ${path}`);
    }
  }

  async search(query: string, k: number = 5): Promise<SearchResult[]> {
    if (this._isServer) {
      console.log('VectorStore: Running in server mode, returning empty search results');
      return [];
    }

    if (!this._isInitialized) {
      await this.initialize();
    }

    const output = await this._embedder(query, { pooling: 'mean', normalize: true });
    const queryEmbedding = output.data;

    const scores = this._documents.map((doc) => ({
      ...doc,
      score: this._cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, k).map((s) => ({
      path: s.path,
      score: s.score,
      chunk: s.chunk,
    }));
  }

  private _cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
