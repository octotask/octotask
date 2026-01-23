/**
 * Centralized API Types Index
 * Re-exports all API response types for convenient importing
 */

// Vercel API types
export {
  type VercelUserResponse,
  type VercelUser,
  type VercelProject,
  type VercelStats,
  type VercelConnection,
  type VercelProjectInfo,
} from './vercel';

// GitHub API types
export {
  type GitHubUserResponse,
  type GitHubRepoInfo,
  type GitHubContent,
  type GitHubBranch,
  type GitHubBlobResponse,
  type GitHubOrganization,
  type GitHubEvent,
  type GitHubStats,
  type GitHubConnection,
} from './github';

// Netlify API types
export {
  type NetlifySite,
  type NetlifyDeploy,
  type NetlifyBuild,
  type NetlifyUser,
  type NetlifyStats,
  type NetlifyConnection,
  type NetlifySiteInfo,
} from './netlify';

// GitLab API types
export {
  type GitLabUserResponse,
  type GitLabProjectInfo,
  type GitLabGroupInfo,
  type GitLabEvent,
  type GitLabStats,
  type GitLabConnection,
  type GitLabProjectResponse,
  type GitLabCommitAction,
  type GitLabCommitRequest,
} from './gitlab';

// Common API response type
export { type ApiResponse } from './responses';
