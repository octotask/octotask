import { generateText } from 'ai';
import { LLMManager } from '~/lib/modules/llm/manager';
import { PROVIDER_LIST } from '~/utils/constants';
import { isReasoningModel } from '~/lib/.server/llm/constants';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { ProviderInfo, IProviderSetting } from '~/types/model';
import { getDynamicMaxTokens, validateTokenLimits } from '~/controllers/llm/Validation';

interface GenerateOptions {
  system: string;
  message?: string;
  messages?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  model: string;
  provider: ProviderInfo;
  apiKeys: Record<string, string>;
  providerSettings?: Record<string, IProviderSetting>;
  serverEnv?: any;
  tools?: Record<string, any>;
}

export class LLMService {
  async generate(options: GenerateOptions) {
    const { system, message, messages, model, provider, apiKeys, providerSettings, serverEnv, tools } = options;

    const models = await this._getModelList({ apiKeys, providerSettings, serverEnv });
    const modelDetails = models.find((m: ModelInfo) => m.name === model);

    if (!modelDetails) {
      throw new Error('Model not found');
    }

    const dynamicMaxTokens = getDynamicMaxTokens(modelDetails);
    const validation = validateTokenLimits(modelDetails, dynamicMaxTokens);

    if (!validation.valid) {
      throw new Error(validation.error || 'Token Limit Exceeded');
    }

    const providerInfo = PROVIDER_LIST.find((p) => p.name === provider.name);

    if (!providerInfo) {
      throw new Error('Provider not found');
    }

    const isReasoning = isReasoningModel(modelDetails.name);
    const tokenParams = isReasoning ? { maxCompletionTokens: dynamicMaxTokens } : { maxTokens: dynamicMaxTokens };

    const formattedMessages = messages || (message ? [{ role: 'user' as const, content: message }] : []);

    const baseParams = {
      system,
      messages: formattedMessages,
      model: providerInfo.getModelInstance({
        model: modelDetails.name,
        serverEnv: serverEnv as any,
        apiKeys,
        providerSettings,
      }),
      ...tokenParams,
      tools,
      toolChoice: tools ? ('auto' as const) : ('none' as const),
    };

    const finalParams = isReasoning ? { ...baseParams, temperature: 1 } : { ...baseParams, temperature: 0 };

    return generateText(finalParams);
  }

  private async _getModelList(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: any;
  }) {
    const llmManager = LLMManager.getInstance(options.serverEnv || {});
    return llmManager.updateModelList(options);
  }
}
