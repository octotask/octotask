import { pipeline } from '@xenova/transformers';
import fs from 'fs/promises';
import path from 'path';

export interface SearchResult {
  path: string;
  score: number;
  chunk: string;
}

export class VectorStore {
  private _documents: any[] = [];
  private _embedder: any = null;
  private _isInitialized = false;

  async initialize() {
    if (this._isInitialized) {
      return;
    }

    try {
      console.log('Initializing local embedding model...');

      // Use a small, efficient model for local embeddings
      this._embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this._isInitialized = true;
      console.log('Embedding model initialized.');
    } catch (error) {
      console.error('Failed to initialize embedding model:', error);
      throw error;
    }
  }

  async addDocuments(documents: { path: string; chunks: string[] }[]) {
    if (!this._isInitialized) {
      await this.initialize();
    }

    console.log(`Embedding ${documents.length} documents...`);

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        try {
          const output = await this._embedder(chunk, { pooling: 'mean', normalize: true });
          const embedding = Array.from(output.data as Float32Array);

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

  removeDocuments(filePath: string) {
    const before = this._documents.length;
    this._documents = this._documents.filter((doc) => doc.path !== filePath);

    const removed = before - this._documents.length;

    if (removed > 0) {
      console.log(`Removed ${removed} stale vector chunks for ${filePath}`);
    }
  }

  async save(storagePath: string) {
    try {
      await fs.mkdir(path.dirname(storagePath), { recursive: true });

      const data = JSON.stringify(this._documents);
      await fs.writeFile(storagePath, data, 'utf-8');
      console.log(`Vector store saved to ${storagePath}`);
    } catch (error) {
      console.error('Failed to save vector store:', error);
    }
  }

  async load(storagePath: string) {
    try {
      const data = await fs.readFile(storagePath, 'utf-8');
      this._documents = JSON.parse(data);
      console.log(`Loaded ${this._documents.length} vector chunks from ${storagePath}`);
    } catch (error) {
      // It's fine if the file doesn't exist yet
      if ((error as any).code !== 'ENOENT') {
        console.error('Failed to load vector store:', error);
      }
    }
  }

  async search(query: string, k: number = 5): Promise<SearchResult[]> {
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

  private _cosineSimilarity(a: Float32Array, b: any): number {
    const bVec = b instanceof Float32Array ? b : new Float32Array(b);

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * bVec[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += bVec[i] * bVec[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
