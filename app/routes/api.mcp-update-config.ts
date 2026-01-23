import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { MCPService, type MCPConfig } from '~/lib/services/mcpService';
import { validateRequestBody, createErrorResponse, createValidatedResponse } from '~/lib/api/validation';
import { MCPUpdateConfigRequestSchema } from '~/lib/api/schemas';

const logger = createScopedLogger('api.mcp-update-config');

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Validate request body early
    const validation = await validateRequestBody(request, MCPUpdateConfigRequestSchema);

    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const mcpConfig = validation.data;
    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.updateConfig(mcpConfig as MCPConfig);

    return createValidatedResponse(serverTools, 200);
  } catch (error) {
    logger.error('Error updating MCP config:', error);
    return createErrorResponse('Failed to update MCP config', 500);
  }
}
