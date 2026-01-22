/*
 * Maximum tokens for response generation (updated for modern model capabilities)
 * This serves as a fallback when model-specific limits are unavailable
 */
export const MAX_TOKENS = 128000;

/*
 * Provider-specific default completion token limits
 * Used as fallbacks when model doesn't specify maxCompletionTokens
 */
export const PROVIDER_COMPLETION_LIMITS: Record<string, number> = {
  OpenAI: 4096,
  Github: 4096,
  Anthropic: 64000,
  Google: 8192,
  Cohere: 4000,
  DeepSeek: 8192,
  Groq: 8192,
  HuggingFace: 4096,
  Mistral: 8192,
  Ollama: 8192,
  OpenRouter: 8192,
  Perplexity: 8192,
  Together: 8192,
  xAI: 8192,
  LMStudio: 8192,
  OpenAILike: 8192,
  AmazonBedrock: 8192,
  Hyperbolic: 8192,
};

export const REASONING_MODELS = [
  'o1-preview',
  'o1-mini',
  'o1',
  'o3-mini',
  'deepseek-reasoner',
  'deepseek-r1',
  'claude-3-7-sonnet-20250219',
];

export function isReasoningModel(modelName: string): boolean {
  return REASONING_MODELS.some((m) => modelName.toLowerCase().includes(m.toLowerCase()));
}
