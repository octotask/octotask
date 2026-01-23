import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createValidatedResponse } from '~/lib/api/validation';

export const loader = async ({ request: _request }: LoaderFunctionArgs) => {
  return createValidatedResponse(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
    },
    200,
  );
};
