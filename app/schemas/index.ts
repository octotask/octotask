import { z } from 'zod';

export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export const ProjectIdSchema = z.string().uuid().brand<'ProjectId'>();
export const SessionIdSchema = z.string().uuid().brand<'SessionId'>();
export const WorkspaceIdSchema = z.string().uuid().brand<'WorkspaceId'>();
export const FileIdSchema = z.string().uuid().brand<'FileId'>();
export const ChatIdSchema = z.string().uuid().brand<'ChatId'>();
export const MessageIdSchema = z.string().uuid().brand<'MessageId'>();
export const ArtifactIdSchema = z.string().uuid().brand<'ArtifactId'>();
export const BranchIdSchema = z.string().uuid().brand<'BranchId'>();
export const CommitIdSchema = z.string().uuid().brand<'CommitId'>();
export const RepositoryIdSchema = z.string().uuid().brand<'RepositoryId'>();
export const ProviderIdSchema = z.string().uuid().brand<'ProviderId'>();
export const ModelIdSchema = z.string().uuid().brand<'ModelId'>();
export const DeploymentIdSchema = z.string().uuid().brand<'DeploymentId'>();
export const BuildIdSchema = z.string().uuid().brand<'BuildId'>();
export const TemplateIdSchema = z.string().uuid().brand<'TemplateId'>();
export const SecretIdSchema = z.string().uuid().brand<'SecretId'>();
export const TokenIdSchema = z.string().uuid().brand<'TokenId'>();
export const ConnectionIdSchema = z.string().uuid().brand<'ConnectionId'>();

export type UserId = z.infer<typeof UserIdSchema>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;
export type FileId = z.infer<typeof FileIdSchema>;
export type ChatId = z.infer<typeof ChatIdSchema>;
export type MessageId = z.infer<typeof MessageIdSchema>;
export type ArtifactId = z.infer<typeof ArtifactIdSchema>;
export type BranchId = z.infer<typeof BranchIdSchema>;
export type CommitId = z.infer<typeof CommitIdSchema>;
export type RepositoryId = z.infer<typeof RepositoryIdSchema>;
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export type ModelId = z.infer<typeof ModelIdSchema>;
export type DeploymentId = z.infer<typeof DeploymentIdSchema>;
export type BuildId = z.infer<typeof BuildIdSchema>;
export type TemplateId = z.infer<typeof TemplateIdSchema>;
export type SecretId = z.infer<typeof SecretIdSchema>;
export type TokenId = z.infer<typeof TokenIdSchema>;
export type ConnectionId = z.infer<typeof ConnectionIdSchema>;

export const TimestampSchema = z.number().int().positive();

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export const UserSchema = BaseEntitySchema.extend({
  id: UserIdSchema,
  email: z.string().email(),
  name: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  settings: z.record(z.unknown()).default({}),
});

export const ProjectSchema = BaseEntitySchema.extend({
  id: ProjectIdSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  ownerId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
  gitRepository: z.object({
    url: z.string().url(),
    branch: z.string().default('main'),
    provider: z.enum(['github', 'gitlab']),
  }).optional(),
  settings: z.record(z.unknown()).default({}),
});

export const WorkspaceSchema = BaseEntitySchema.extend({
  id: WorkspaceIdSchema,
  name: z.string().min(1).max(100),
  ownerId: UserIdSchema,
  members: z.array(z.object({
    userId: UserIdSchema,
    role: z.enum(['owner', 'admin', 'member', 'viewer']),
  })).default([]),
  settings: z.record(z.unknown()).default({}),
});

export const FileSchema = BaseEntitySchema.extend({
  id: FileIdSchema,
  projectId: ProjectIdSchema,
  path: z.string().min(1),
  content: z.string().optional(),
  language: z.string().optional(),
  size: z.number().int().nonnegative(),
  isDirectory: z.boolean().default(false),
  parentId: FileIdSchema.optional(),
});

export const ChatSchema = BaseEntitySchema.extend({
  id: ChatIdSchema,
  projectId: ProjectIdSchema,
  userId: UserIdSchema,
  title: z.string().min(1).max(200),
  modelId: ModelIdSchema,
  providerId: ProviderIdSchema,
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const MessageSchema = BaseEntitySchema.extend({
  id: MessageIdSchema,
  chatId: ChatIdSchema,
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  artifacts: z.array(z.object({
    id: ArtifactIdSchema,
    type: z.enum(['code', 'file', 'image', 'link']),
    title: z.string(),
    content: z.string(),
    language: z.string().optional(),
  })).default([]),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown()),
  })).default([]),
  metadata: z.record(z.unknown()).default({}),
});

export const ArtifactSchema = BaseEntitySchema.extend({
  id: ArtifactIdSchema,
  messageId: MessageIdSchema,
  type: z.enum(['code', 'file', 'image', 'link', 'diff']),
  title: z.string(),
  content: z.string(),
  language: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const ProviderSchema = BaseEntitySchema.extend({
  id: ProviderIdSchema,
  name: z.string().min(1),
  type: z.enum(['openai', 'anthropic', 'deepseek', 'groq', 'ollama', 'openrouter', 'cerebras', 'fireworks', 'mistral', 'cohere', 'bedrock', 'google']),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().default(0),
  models: z.array(ModelSchema).default([]),
});

export const ModelSchema = BaseEntitySchema.extend({
  id: ModelIdSchema,
  providerId: ProviderIdSchema,
  name: z.string().min(1),
  displayName: z.string().min(1),
  contextWindow: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  supportsTools: z.boolean().default(false),
  supportsVision: z.boolean().default(false),
  pricing: z.object({
    input: z.number().nonnegative(),
    output: z.number().nonnegative(),
  }).optional(),
});

export const DeploymentSchema = BaseEntitySchema.extend({
  id: DeploymentIdSchema,
  projectId: ProjectIdSchema,
  provider: z.enum(['netlify', 'vercel', 'cloudflare', 'docker']),
  status: z.enum(['pending', 'building', 'deploying', 'success', 'failed']),
  url: z.string().url().optional(),
  buildLogs: z.string().optional(),
  environment: z.record(z.string()).default({}),
});

export const BuildSchema = BaseEntitySchema.extend({
  id: BuildIdSchema,
  projectId: ProjectIdSchema,
  status: z.enum(['pending', 'running', 'success', 'failed']),
  command: z.string(),
  output: z.string().optional(),
  artifacts: z.array(z.string()).default([]),
});

export const GitRepositorySchema = z.object({
  id: RepositoryIdSchema,
  name: z.string().min(1),
  fullName: z.string().min(1),
  url: z.string().url(),
  defaultBranch: z.string().default('main'),
  provider: z.enum(['github', 'gitlab']),
  isPrivate: z.boolean(),
  description: z.string().optional(),
  stars: z.number().int().nonnegative().optional(),
  forks: z.number().int().nonnegative().optional(),
});

export const GitBranchSchema = z.object({
  id: BranchIdSchema,
  repositoryId: RepositoryIdSchema,
  name: z.string().min(1),
  isDefault: z.boolean().default(false),
  lastCommit: z.object({
    id: CommitIdSchema,
    message: z.string(),
    author: z.string(),
    timestamp: TimestampSchema,
  }).optional(),
});

export const GitCommitSchema = z.object({
  id: CommitIdSchema,
  repositoryId: RepositoryIdSchema,
  message: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  timestamp: TimestampSchema,
  parents: z.array(CommitIdSchema).default([]),
  tree: z.string(),
});

export const EnvironmentVariableSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
  isSecret: z.boolean().default(false),
  description: z.string().optional(),
});

export const SecretSchema = BaseEntitySchema.extend({
  id: SecretIdSchema,
  projectId: ProjectIdSchema,
  key: z.string().min(1).max(100),
  value: z.string(),
  description: z.string().optional(),
});

export const ApiKeySchema = BaseEntitySchema.extend({
  id: z.string().uuid(),
  userId: UserIdSchema,
  providerId: ProviderIdSchema,
  name: z.string().min(1).max(100),
  keyHash: z.string(),
  lastUsed: TimestampSchema.optional(),
  expiresAt: TimestampSchema.optional(),
  isActive: z.boolean().default(true),
});

export const ConnectionSchema = BaseEntitySchema.extend({
  id: ConnectionIdSchema,
  userId: UserIdSchema,
  provider: z.enum(['github', 'gitlab', 'netlify', 'vercel', 'supabase', 'cloudflare']),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: TimestampSchema.optional(),
  scope: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    }).optional(),
    meta: z.object({
      timestamp: TimestampSchema,
      requestId: z.string().uuid(),
    }).optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    hasMore: z.boolean(),
  });

export const WebSocketMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
  requestId: z.string().uuid().optional(),
  timestamp: TimestampSchema,
});

export const AiModelRequestSchema = z.object({
  modelId: ModelIdSchema,
  providerId: ProviderIdSchema,
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
    toolCalls: z.array(z.object({
      id: z.string(),
      name: z.string(),
      arguments: z.record(z.unknown()),
    })).optional(),
    toolCallId: z.string().optional(),
  })),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().optional(),
  tools: z.array(z.object({
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.unknown()),
    }),
  })).optional(),
  stream: z.boolean().default(false),
});

export const AiModelResponseSchema = z.object({
  id: z.string(),
  modelId: ModelIdSchema,
  providerId: ProviderIdSchema,
  choices: z.array(z.object({
    index: z.number().int().nonnegative(),
    message: z.object({
      role: z.enum(['assistant']),
      content: z.string().nullable(),
      toolCalls: z.array(z.object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
      })).optional(),
    }),
    finishReason: z.enum(['stop', 'length', 'tool_calls', 'content_filter', 'null']),
  })),
  usage: z.object({
    promptTokens: z.number().int().nonnegative(),
    completionTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  }).optional(),
  created: TimestampSchema,
});

export const EnvironmentSchema = z.object({
  VITE_APP_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OLLAMA_API_BASE_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITLAB_CLIENT_ID: z.string().optional(),
  GITLAB_CLIENT_SECRET: z.string().optional(),
  NETLIFY_CLIENT_ID: z.string().optional(),
  NETLIFY_CLIENT_SECRET: z.string().optional(),
  VERCEL_CLIENT_ID: z.string().optional(),
  VERCEL_CLIENT_SECRET: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
});

export function validateEnv(env: Record<string, string | undefined>) {
  return EnvironmentSchema.safeParse(env);
}

export function validateApiResponse<T extends z.ZodTypeAny>(
  response: unknown,
  dataSchema: T
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = ApiResponseSchema(dataSchema).safeParse(response);
  if (result.success) {
    return { success: true, data: result.data.data as z.infer<T> };
  }
  return { success: false, error: result.error };
}

export function validateWebSocketMessage(message: unknown) {
  return WebSocketMessageSchema.safeParse(message);
}