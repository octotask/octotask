import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { LLMManager } from '~/lib/modules/llm/manager';
import { PROVIDER_LIST } from '~/utils/constants';
import type { ProviderInfo, IProviderSetting } from '~/types/model';
import { getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { StreamController } from './StreamController';
import { LLMService } from '~/lib/llm/LLMService';
import { LLMError, LLMAuthError, handleError, getErrorMessage } from '~/lib/errors';

export class LLMController {
  async handleRequest({ context, request }: ActionFunctionArgs) {
    const { system, message, model, provider, streamOutput } = await request.json<{
      system: string;
      message: string;
      model: string;
      provider: ProviderInfo;
      streamOutput?: boolean;
    }>();

    // Validate inputs
    if (!model || typeof model !== 'string') {
      throw new Response('Invalid or missing model', { status: 400, statusText: 'Bad Request' });
    }

    if (!provider?.name || typeof provider.name !== 'string') {
      throw new Response('Invalid or missing provider', { status: 400, statusText: 'Bad Request' });
    }

    // Retrieve API Keys from Vault (Context)
    const vault = (context as any).vault;
    const apiKeys: Record<string, string> = {};

    if (vault) {
      for (const p of PROVIDER_LIST) {
        const key = await vault.getSecret(p.name);

        if (key) {
          apiKeys[p.name] = key;
        }
      }
    } else {
      console.warn('Vault context missing in LLMController');
    }

    // Provider settings still from cookies for now
    const cookieHeader = request.headers.get('Cookie');
    const providerSettings = getProviderSettingsFromCookie(cookieHeader);

    if (streamOutput) {
      const streamController = new StreamController();
      return streamController.handleStream({
        system,
        message,
        env: context.cloudflare?.env,
        apiKeys,
        providerSettings,
      });
    }

    // Standard Generation Logic
    try {
      const llmService = new LLMService();
      const result = await llmService.generate({
        system,
        message,
        model,
        provider,
        apiKeys,
        providerSettings,
        serverEnv: context.cloudflare?.env,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: unknown) {
      return this._handleError(error);
    }
  }

  private async _getModelList(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
    serverEnv?: any;
  }) {
    const llmManager = LLMManager.getInstance(import.meta.env); // or options.serverEnv
    return llmManager.updateModelList(options);
  }

  private _handleError(error: unknown) {
    const { error: appError } = handleError(error);

    let llmError = appError;

    if (getErrorMessage(error).includes('API key')) {
      llmError = new LLMAuthError('Invalid or missing API key', {
        cause: appError instanceof Error ? appError : undefined,
        context: appError.context,
      });
    } else if (appError instanceof LLMError) {
      llmError = appError;
    }

    const errorResponse = {
      error: true,
      message: llmError.message,
      code: llmError.code,
      statusCode: llmError.statusCode,
      isRetryable: llmError.canRetry(),
      provider: (llmError as LLMError).provider || 'unknown',
    };

    console.error('[LLMController]', llmError.toString());

    return new Response(JSON.stringify(errorResponse), {
      status: llmError.statusCode,
      headers: { 'Content-Type': 'application/json' },
      statusText: llmError.statusCode === 401 ? 'Unauthorized' : 'Error',
    });
  }
}
