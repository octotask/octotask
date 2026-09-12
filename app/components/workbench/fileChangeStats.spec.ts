import { describe, expect, it } from 'vitest';
import { getFileChangeStats } from './fileChangeStats';

describe('fileChangeStats', () => {
  it('caches repeated diff calculations for the same file history', () => {
    const history = {
      originalContent: 'const a = 1;\nconst b = 2;',
      versions: [{ content: 'const a = 1;\nconst b = 3;' }],
    } as any;

    const first = getFileChangeStats(history);
    const second = getFileChangeStats(history);

    expect(first).toEqual({ additions: 1, deletions: 1 });
    expect(second).toEqual(first);
  });
});
