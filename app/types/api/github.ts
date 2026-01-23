/**
 * GitHub API Response Types
 * Centralized types for GitHub API integration
 */

export interface GitHubUserResponse {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  public_gists: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepoInfo {
  id: string;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
  updated_at: string;
  language: string;
  languages_url: string;
  private?: boolean;
  topics?: string[];
  archived?: boolean;
  fork?: boolean;
  size?: number;
  contributors_count?: number;
  branches_count?: number;
  issues_count?: number;
  pull_requests_count?: number;
  license?: {
    name: string;
    spdx_id: string;
  };
}

export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface GitHubBlobResponse {
  content: string;
  encoding: string;
  sha: string;
  size: number;
  url: string;
}

export interface GitHubOrganization {
  login: string;
  name?: string;
  avatar_url: string;
  description: string;
  html_url: string;
  public_repos?: number;
  followers?: number;
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo: {
    name: string;
    url: string;
  };
  payload: {
    ref?: string;
    push_id?: number;
    size?: number;
    distinct_size?: number;
    commits?: Array<{
      sha: string;
      message: string;
      url: string;
    }>;
  };
}

export interface GitHubStats {
  totalRepos: number;
  totalFollowers: number;
  recentActivity: GitHubEvent[];
  favoriteLanguages: Record<string, number>;
  topRepositories: GitHubRepoInfo[];
}

export interface GitHubConnection {
  user: GitHubUserResponse | null;
  token: string;
  stats?: GitHubStats;
}
