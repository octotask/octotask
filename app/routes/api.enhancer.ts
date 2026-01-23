import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';
import { getApiKeysFromCookie, getProviderSettingsFromCookie } from '~/lib/api/cookies';
import { createScopedLogger } from '~/utils/logger';
import { validateRequestBody, createErrorResponse } from '~/lib/api/validation';
import { handleError, LLMAuthError } from '~/lib/errors';
import { z } from 'zod';

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

const logger = createScopedLogger('api.enhancher');

// Enhanced validation schema for enhancer endpoint
const EnhancerRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000),
  model: z.string().min(1, 'Model is required'),
  provider: z
    .object({
      name: z.string().min(1, 'Provider name is required'),
    })
    .passthrough(),
  apiKeys: z.record(z.string()).optional(),
});

async function enhancerAction({ context, request }: ActionFunctionArgs) {
  // Validate request body early
  const validation = await validateRequestBody(request, EnhancerRequestSchema);

  if (!validation.success) {
    return createErrorResponse(validation.error, 400);
  }

  const { message, model, provider } = validation.data;

  const { name: providerName } = provider;

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = getApiKeysFromCookie(cookieHeader);
  const providerSettings = getProviderSettingsFromCookie(cookieHeader);

  try {
    const result = await streamText({
      messages: [
        {
          role: 'user',
          content:
            `[Model: ${model}]\n\n[Provider: ${providerName}]\n\n` +
            stripIndents`
            You are a professional prompt engineer specializing in crafting precise, effective prompts.
            Your task is to enhance prompts by making them more specific, actionable, and effective.

            I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

            For valid prompts:
            - Make instructions explicit and unambiguous
            - Add relevant context and constraints
            - Remove redundant information
            - Maintain the core intent
            - Ensure the prompt is self-contained
            - Use professional language

            For invalid or unclear prompts:
            - Respond with clear, professional guidance
            - Keep responses concise and actionable
            - Maintain a helpful, constructive tone
            - Focus on what the user should provide
            - Use a standard template for consistency

            IMPORTANT: Your response must ONLY contain the enhanced prompt text.
            Do not include any explanations, metadata, or wrapper tags.

            <original_prompt>
              ${message}
            </original_prompt>
          `,
        },
      ],
      env: context.cloudflare?.env as any,
      apiKeys,
      providerSettings,
      options: {
        system:
          'You are a senior software principal architect, you should help the user analyse the user query and enrich it with the necessary context and constraints to make it more specific, actionable, and effective. You should also ensure that the prompt is self-contained and uses professional language. Your response should ONLY contain the enhanced prompt text. Do not include any explanations, metadata, or wrapper tags.',

        /*
         * onError: (event) => {
         *   throw new Response(null, {
         *     status: 500,
         *     statusText: 'Internal Server Error',
         *   });
         * }
         */
      },
    });

    // Handle streaming errors in a non-blocking way
    (async () => {
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'error') {
            const error: unknown = part.error;
            const { error: appError } = handleError(error, { operation: 'streamText' });
            logger.error('Streaming error:', appError.toString());
            break;
          }
        }
      } catch (error: unknown) {
        const { error: appError } = handleError(error, { operation: 'streamText processing' });
        logger.error('Error processing stream:', appError.toString());
      }
    })();

    // Return the text stream directly since it's already text data
    return new Response(result.textStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    const { error: appError, statusCode } = handleError(error, { operation: 'enhancer' });

    let message = appError.message;
    let status = statusCode;

    if (message.includes('API key')) {
      const llmAuthError = new LLMAuthError('Invalid or missing API key', {
        cause: appError instanceof Error ? appError : undefined,
      });
      message = llmAuthError.message;
      status = llmAuthError.statusCode;

      logger.error('[api.enhancer]', llmAuthError.toString());
      throw new Response(message, {
        status,
        statusText: 'Unauthorized',
      });
    }

    logger.error('[api.enhancer]', appError.toString());
    throw new Response(null, {
      status,
      statusText: 'Internal Server Error',
    });
  }
}
