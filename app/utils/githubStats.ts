import type { GitHubStats } from '~/types/api';

export function calculateStatsSummary(stats: GitHubStats): GitHubStats {
  return {
    ...stats,

    // Add any calculated fields that might be missing
  };
}
