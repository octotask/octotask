import { json } from '@remix-run/cloudflare';
import { getApiKeysFromCookie } from '~/lib/api/cookies';
import { withSecurity } from '~/lib/security';
import { validateRequestBody, createErrorResponse } from '~/lib/api/validation';
import { z } from 'zod';

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface BranchInfo {
  name: string;
  sha: string;
  protected: boolean;
  isDefault: boolean;
}

// Validation schema for POST requests
const GitHubBranchesRequestSchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository is required'),
  token: z.string().min(1, 'GitHub token is required'),
});

// Validation schema for GET query parameters
const GitHubBranchesQuerySchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository is required'),
});

async function githubBranchesLoader({ request, context }: { request: Request; context: any }) {
  try {
    let owner: string;
    let repo: string;
    let githubToken: string;

    if (request.method === 'POST') {
      // Handle POST request with token in body (from BranchSelector)
      const validation = await validateRequestBody(request, GitHubBranchesRequestSchema);

      if (!validation.success) {
        return createErrorResponse(validation.error, 400);
      }

      const body = validation.data;
      owner = body.owner;
      repo = body.repo;
      githubToken = body.token;
    } else {
      // Handle GET request with params and cookie token (backwards compatibility)
      const url = new URL(request.url);
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      const queryValidation = z.record(z.string()).safeParse(params);

      if (!queryValidation.success) {
        return createErrorResponse('Invalid query parameters', 400);
      }

      const schemaValidation = GitHubBranchesQuerySchema.safeParse(params);

      if (!schemaValidation.success) {
        return createErrorResponse(schemaValidation.error, 400);
      }

      const validated = schemaValidation.data;
      owner = validated.owner;
      repo = validated.repo;

      // Get API keys from cookies (server-side only)
      const cookieHeader = request.headers.get('Cookie');
      const apiKeys = getApiKeysFromCookie(cookieHeader);

      // Try to get GitHub token from various sources
      githubToken =
        apiKeys.GITHUB_API_KEY ||
        apiKeys.VITE_GITHUB_ACCESS_TOKEN ||
        context?.cloudflare?.env?.GITHUB_TOKEN ||
        context?.cloudflare?.env?.VITE_GITHUB_ACCESS_TOKEN ||
        process.env.GITHUB_TOKEN ||
        process.env.VITE_GITHUB_ACCESS_TOKEN ||
        '';
    }

    if (!githubToken) {
      return json({ error: 'GitHub token not found' }, { status: 401 });
    }

    // First, get repository info to know the default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'octotask-app',
      },
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return json({ error: 'Repository not found' }, { status: 404 });
      }

      if (repoResponse.status === 401) {
        return json({ error: 'Invalid GitHub token' }, { status: 401 });
      }

      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }

    const repoInfo: any = await repoResponse.json();
    const defaultBranch = repoInfo.default_branch;

    // Fetch branches
    const branchesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'octotask-app',
      },
    });

    if (!branchesResponse.ok) {
      throw new Error(`Failed to fetch branches: ${branchesResponse.status}`);
    }

    const branches: GitHubBranch[] = await branchesResponse.json();

    // Transform to our format
    const transformedBranches: BranchInfo[] = branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
      isDefault: branch.name === defaultBranch,
    }));

    // Sort branches with default branch first, then alphabetically
    transformedBranches.sort((a, b) => {
      if (a.isDefault) {
        return -1;
      }

      if (b.isDefault) {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });

    return json({
      branches: transformedBranches,
      defaultBranch,
      total: transformedBranches.length,
    });
  } catch (error) {
    console.error('Failed to fetch GitHub branches:', error);

    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return json(
          {
            error: 'Failed to connect to GitHub. Please check your network connection.',
          },
          { status: 503 },
        );
      }

      return json(
        {
          error: `Failed to fetch branches: ${error.message}`,
        },
        { status: 500 },
      );
    }

    return json(
      {
        error: 'An unexpected error occurred while fetching branches',
      },
      { status: 500 },
    );
  }
}

export const loader = withSecurity(githubBranchesLoader);
export const action = withSecurity(githubBranchesLoader);
