import { LLMService } from '~/lib/llm/LLMService';
import { VectorStore } from '~/core/workspace/VectorStore';
import type { ProviderInfo } from '~/types/model';

export class SearchService {
  private _llmService: LLMService;
  private _vectorStore: VectorStore | undefined;
  apiKeys: Record<string, string>;

  constructor(vectorStore: VectorStore | undefined, apiKeys: Record<string, string>) {
    this._llmService = new LLMService();
    this._vectorStore = vectorStore;
    this.apiKeys = apiKeys;
  }

  async search(query: string, provider: ProviderInfo, model: string): Promise<string> {
    const rephrasedQuery = await this._rephraseQuery(query, provider, model);

    if (!this._vectorStore) {
      console.warn('VectorStore not initialized. Search is not available.');
      return '';
    }

    const searchResults = await this._vectorStore.search(rephrasedQuery);

    return searchResults.map((r) => r.chunk).join('\n---\n');
  }

  private async _rephraseQuery(query: string, provider: ProviderInfo, model: string): Promise<string> {
    const prompt = `Rephrase the following query to be more effective for a semantic code search. Focus on keywords and concepts. Query: "${query}"`;

    try {
      const response = await this._llmService.generate({
        system: 'You are a search query optimization assistant.',
        message: prompt,
        model,
        provider,
        apiKeys: this.apiKeys,
      });
      return response.text;
    } catch (error) {
      console.error('Failed to rephrase query:', error);
      return query; // Fallback to original query
    }
  }
}
