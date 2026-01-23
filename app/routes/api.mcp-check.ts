import { createScopedLogger } from '~/utils/logger';
import { MCPService } from '~/lib/services/mcpService';
import { createErrorResponse, createValidatedResponse } from '~/lib/api/validation';

const logger = createScopedLogger('api.mcp-check');

export async function loader() {
  try {
    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.checkServersAvailabilities();

    return createValidatedResponse(serverTools, 200);
  } catch (error) {
    logger.error('Error checking MCP servers:', error);
    return createErrorResponse('Failed to check MCP servers', 500);
  }
}
