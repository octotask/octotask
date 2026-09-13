export type Brand<T, TBrand> = T & { readonly __brand: unique symbol };

export function createBrand<T, TBrand>(value: T): Brand<T, TBrand> {
  return value as Brand<T, TBrand>;
}

export function isBrand<T, TBrand>(value: T, _brand: TBrand): value is Brand<T, TBrand> {
  return typeof value === 'string' || typeof value === 'number';
}

export type UserId = Brand<string, 'UserId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type FileId = Brand<string, 'FileId'>;
export type ChatId = Brand<string, 'ChatId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type ArtifactId = Brand<string, 'ArtifactId'>;
export type BranchId = Brand<string, 'BranchId'>;
export type CommitId = Brand<string, 'CommitId'>;
export type RepositoryId = Brand<string, 'RepositoryId'>;
export type ProviderId = Brand<string, 'ProviderId'>;
export type ModelId = Brand<string, 'ModelId'>;
export type DeploymentId = Brand<string, 'DeploymentId'>;
export type BuildId = Brand<string, 'BuildId'>;
export type TemplateId = Brand<string, 'TemplateId'>;
export type SecretId = Brand<string, 'SecretId'>;
export type TokenId = Brand<string, 'TokenId'>;
export type ConnectionId = Brand<string, 'ConnectionId'>;

export const BrandedIds = {
  userId: (id: string): UserId => createBrand(id),
  projectId: (id: string): ProjectId => createBrand(id),
  sessionId: (id: string): SessionId => createBrand(id),
  workspaceId: (id: string): WorkspaceId => createBrand(id),
  fileId: (id: string): FileId => createBrand(id),
  chatId: (id: string): ChatId => createBrand(id),
  messageId: (id: string): MessageId => createBrand(id),
  artifactId: (id: string): ArtifactId => createBrand(id),
  branchId: (id: string): BranchId => createBrand(id),
  commitId: (id: string): CommitId => createBrand(id),
  repositoryId: (id: string): RepositoryId => createBrand(id),
  providerId: (id: string): ProviderId => createBrand(id),
  modelId: (id: string): ModelId => createBrand(id),
  deploymentId: (id: string): DeploymentId => createBrand(id),
  buildId: (id: string): BuildId => createBrand(id),
  templateId: (id: string): TemplateId => createBrand(id),
  secretId: (id: string): SecretId => createBrand(id),
  tokenId: (id: string): TokenId => createBrand(id),
  connectionId: (id: string): ConnectionId => createBrand(id),
};