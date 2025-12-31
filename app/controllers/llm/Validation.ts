import type { ModelInfo } from '~/lib/modules/llm/types';
import { MAX_TOKENS, PROVIDER_COMPLETION_LIMITS } from '~/lib/.server/llm/constants';

function getCompletionTokenLimit(modelDetails: ModelInfo): number {
  if (modelDetails.maxCompletionTokens && modelDetails.maxCompletionTokens > 0) {
    return modelDetails.maxCompletionTokens;
  }

  const providerDefault = PROVIDER_COMPLETION_LIMITS[modelDetails.provider];

  if (providerDefault) {
    return providerDefault;
  }

  return Math.min(MAX_TOKENS, 16384);
}

export function validateTokenLimits(
  modelDetails: ModelInfo,
  requestedTokens: number,
): { valid: boolean; error?: string } {
  const modelMaxTokens = modelDetails.maxTokenAllowed || 128000;
  const maxCompletionTokens = getCompletionTokenLimit(modelDetails);

  if (requestedTokens > modelMaxTokens) {
    return {
      valid: false,
      error: `Requested tokens (${requestedTokens}) exceed model's context window (${modelMaxTokens}). Please reduce your request size.`,
    };
  }

  if (requestedTokens > maxCompletionTokens) {
    return {
      valid: false,
      error: `Requested tokens (${requestedTokens}) exceed model's completion limit (${maxCompletionTokens}). Consider using a model with higher token limits.`,
    };
  }

  return { valid: true };
}

export function getDynamicMaxTokens(modelDetails: ModelInfo): number {
  return getCompletionTokenLimit(modelDetails);
}
