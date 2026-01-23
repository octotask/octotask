import { type ActionFunction } from '@remix-run/cloudflare';
import { createErrorResponse } from '~/lib/api/validation';

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  return createErrorResponse(
    'Updates must be performed manually in a server environment. Instructions: 1. Navigate to project directory, 2. Run: git fetch upstream, 3. Run: git pull upstream main, 4. Run: pnpm install, 5. Run: pnpm run build',
    400,
  );
};
