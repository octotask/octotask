import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { validateRequestBody, createErrorResponse, safeJSONParse } from '~/lib/api/validation';
import { z } from 'zod';

const logger = createScopedLogger('api.supabase.query');

// Validation schema for Supabase query
const supabaseQuerySchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  query: z.string().min(1, 'Query is required'),
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return new Response('No authorization token provided', { status: 401 });
  }

  // Validate request body early
  const validation = await validateRequestBody(request, supabaseQuerySchema);

  if (!validation.success) {
    return createErrorResponse(validation.error, 400);
  }

  const { projectId, query } = validation.data;
  logger.debug('Executing query:', { projectId, query });

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const parseResult = safeJSONParse(errorText);
      const errorData = parseResult.success ? parseResult.data : { message: errorText };

      logger.error(
        'Supabase API error:',
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        }),
      );

      return new Response(
        JSON.stringify({
          error: {
            status: response.status,
            statusText: response.statusText,
            message:
              typeof errorData === 'object' && errorData !== null && 'message' in errorData
                ? (errorData as any).message
                : typeof errorData === 'object' && errorData !== null && 'error' in errorData
                  ? (errorData as any).error
                  : errorText,
            details: errorData,
          },
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Query execution error:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Query execution failed',
          stack: error instanceof Error ? error.stack : undefined,
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
