// ProviderName and ApiKeyMap for type safety

export type ProviderName = 'OpenAI' | 'Anthropic' | 'Ollama';
export type ApiKeyMap = Partial<Record<ProviderName, string>>;
