/**
 * API Route Validation Schemas
 * Centralized Zod schemas for all API endpoints
 */

import { z } from 'zod';

// Common nested schemas
const messageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system']).optional(),
    content: z.string().min(1),
    toolInvocations: z.any().optional(),
  })
  .passthrough();

const supabaseCredentialsSchema = z
  .object({
    anonKey: z.string().optional(),
    supabaseUrl: z.string().optional(),
  })
  .optional();

const supabaseSchema = z
  .object({
    isConnected: z.boolean().optional(),
    hasSelectedProject: z.boolean().optional(),
    credentials: supabaseCredentialsSchema,
  })
  .optional();

const designSchemeSchema = z.object({}).passthrough().optional();

// API Route Schemas

/**
 * POST /api/chat - Chat request validation
 */
export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1, 'At least one message is required'),
  files: z.record(z.any()).optional(),
  promptId: z.string().optional(),
  contextOptimization: z.boolean().default(false),
  supabase: supabaseSchema,
  chatMode: z.enum(['discuss', 'build']).default('discuss'),
  designScheme: designSchemeSchema,
  maxLLMSteps: z.number().int().positive().default(10),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * POST /api/llmcall - LLM call request validation
 */
export const llmCallRequestSchema = z
  .object({
    messages: z.array(messageSchema),
    model: z.string().min(1),
    provider: z.string().min(1),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().positive().optional(),
  })
  .passthrough();

export type LLMCallRequest = z.infer<typeof llmCallRequestSchema>;

/**
 * POST /api/enhancer - Code/text enhancement request validation
 */
export const enhancerRequestSchema = z.object({
  code: z.string().min(1, 'Code cannot be empty'),
  language: z.string().optional(),
  context: z.string().optional(),
});

export type EnhancerRequest = z.infer<typeof enhancerRequestSchema>;

/**
 * POST /api/bug-report - Bug report submission validation
 */
export const bugReportRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  stepsToReproduce: z.string().max(1000).optional(),
  expectedBehavior: z.string().max(1000).optional(),
  actualBehavior: z.string().max(1000).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  environmentInfo: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

export type BugReportRequest = z.infer<typeof bugReportRequestSchema>;

/**
 * GET /api/check-env-key - Query parameter validation
 */
export const checkEnvKeyQuerySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
});

export type CheckEnvKeyQuery = z.infer<typeof checkEnvKeyQuerySchema>;

/**
 * POST /api/supabase - Supabase request validation
 */
export const supabaseRequestSchema = z.object({
  query: z.string().optional(),
  projectId: z.string().optional(),
});

export type SupabaseRequest = z.infer<typeof supabaseRequestSchema>;

/**
 * POST /api/supabase.query - Supabase query validation
 */
export const supabaseQueryRequestSchema = z.object({
  sql: z.string().min(1, 'SQL query cannot be empty'),
  params: z.array(z.any()).optional(),
});

export type SupabaseQueryRequest = z.infer<typeof supabaseQueryRequestSchema>;

/**
 * POST /api/netlify-deploy - Netlify deployment validation
 */
export const netlifyDeployRequestSchema = z
  .object({
    siteId: z.string().optional(),
    siteName: z.string().optional(),
    branch: z.string().optional(),
    files: z.record(z.string()).optional(),
    chatId: z.string().min(1, 'Chat ID is required'),
    token: z.string().min(1, 'Netlify token is required'),
  })
  .passthrough();

export type NetlifyDeployRequest = z.infer<typeof netlifyDeployRequestSchema>;

/**
 * POST /api/vercel-deploy - Vercel deployment validation
 */
export const vercelDeployRequestSchema = z
  .object({
    projectId: z.string().optional(),
    branch: z.string().optional(),
    files: z.record(z.string()).optional(),
    chatId: z.string().min(1, 'Chat ID is required'),
    token: z.string().min(1, 'Vercel token is required'),
  })
  .passthrough();

export type VercelDeployRequest = z.infer<typeof vercelDeployRequestSchema>;

/**
 * POST /api/mcp-update-config - MCP configuration update validation
 */
export const mcpUpdateConfigRequestSchema = z
  .object({
    servers: z.record(z.object({}).passthrough()).optional(),
  })
  .passthrough();

export type MCPUpdateConfigRequest = z.infer<typeof mcpUpdateConfigRequestSchema>;

/**
 * GET /api/models - Query parameter validation
 */
export const modelsQuerySchema = z.object({
  provider: z.string().optional(),
});

export type ModelsQuery = z.infer<typeof modelsQuerySchema>;

/**
 * GET /api/models/:provider - Path parameter and query validation
 */
export const modelsByProviderSchema = z.object({
  provider: z.string().min(1),
});

export type ModelsByProvider = z.infer<typeof modelsByProviderSchema>;

/**
 * GET /api/health - Health check response
 */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/**
 * GET /api/configured-providers - Configured providers query
 */
export const configuredProvidersQuerySchema = z
  .object({
    // No required parameters
  })
  .optional();

export type ConfiguredProvidersQuery = z.infer<typeof configuredProvidersQuerySchema>;

/**
 * POST /api/gitlab-branches - GitLab branches request validation
 */
export const gitLabBranchesSchema = z.object({
  token: z.string().min(1, 'GitLab token is required'),
  gitlabUrl: z.string().url('Invalid GitLab URL').optional().default('https://gitlab.com'),
  projectId: z.string().min(1, 'Project ID is required'),
});

export type GitLabBranchesRequest = z.infer<typeof gitLabBranchesSchema>;

/**
 * POST /api/gitlab-projects - GitLab projects request validation
 */
export const gitLabProjectsSchema = z.object({
  token: z.string().min(1, 'GitLab token is required'),
  gitlabUrl: z.string().url('Invalid GitLab URL').optional().default('https://gitlab.com'),
});

export type GitLabProjectsRequest = z.infer<typeof gitLabProjectsSchema>;

/**
 * GET /api/github-stats - GitHub stats query (no params needed, uses cookies/env)
 */
export const gitHubStatsQuerySchema = z.object({}).optional();

export type GitHubStatsQuery = z.infer<typeof gitHubStatsQuerySchema>;

/**
 * GET /api/github-user - GitHub user query (no params needed, uses cookies/env)
 */
export const gitHubUserQuerySchema = z.object({}).optional();

export type GitHubUserQuery = z.infer<typeof gitHubUserQuerySchema>;

/**
 * Generic response wrapper schemas
 */
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
});

export const paginatedResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
});
