import { streamText } from '~/lib/.server/llm/stream-text';
import type { IProviderSetting } from '~/types/model';

interface StreamOptions {
  system: string;
  message: string;
  env: any;
  apiKeys: Record<string, string>;
  providerSettings: Record<string, IProviderSetting>;
}

export class StreamController {
  async handleStream(options: StreamOptions): Promise<Response> {
    const { system, message, env, apiKeys, providerSettings } = options;

    try {
      const result = await streamText({
        options: {
          system,
        },
        messages: [
          {
            role: 'user',
            content: `${message}`,
          },
        ],
        env,
        apiKeys,
        providerSettings,
      });

      return new Response(result.textStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    } catch (error: unknown) {
      console.log(error);

      if (error instanceof Error && error.message?.includes('API key')) {
        throw new Response('Invalid or missing API key', {
          status: 401,
          statusText: 'Unauthorized',
        });
      }

      // Handle token limit errors with helpful messages
      if (
        error instanceof Error &&
        (error.message?.includes('max_tokens') ||
          error.message?.includes('token') ||
          error.message?.includes('exceeds') ||
          error.message?.includes('maximum'))
      ) {
        throw new Response(
          `Token limit error: ${error.message}. Try reducing your request size or using a model with higher token limits.`,
          {
            status: 400,
            statusText: 'Token Limit Exceeded',
          },
        );
      }

      throw new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  }
}
