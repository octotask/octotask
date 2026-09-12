import { diffLines, type Change } from 'diff';
import type { FileHistory } from '~/types/actions';

const fileChangeStatsCache = new WeakMap<FileHistory, { additions: number; deletions: number }>();

export function getFileChangeStats(history: FileHistory): { additions: number; deletions: number } {
  const cached = fileChangeStatsCache.get(history);

  if (cached) {
    return cached;
  }

  if (!history.originalContent) {
    const result = { additions: 0, deletions: 0 };
    fileChangeStatsCache.set(history, result);

    return result;
  }

  const normalizedOriginal = history.originalContent.replace(/\r\n/g, '\n');
  const normalizedCurrent = history.versions[history.versions.length - 1]?.content.replace(/\r\n/g, '\n') || '';

  if (normalizedOriginal === normalizedCurrent) {
    const result = { additions: 0, deletions: 0 };
    fileChangeStatsCache.set(history, result);

    return result;
  }

  const changes = diffLines(normalizedOriginal, normalizedCurrent, {
    newlineIsToken: false,
    ignoreWhitespace: true,
    ignoreCase: false,
  });

  const result = changes.reduce(
    (acc: { additions: number; deletions: number }, change: Change) => {
      if (change.added) {
        acc.additions += change.value.split('\n').length;
      }

      if (change.removed) {
        acc.deletions += change.value.split('\n').length;
      }

      return acc;
    },
    { additions: 0, deletions: 0 },
  );

  fileChangeStatsCache.set(history, result);

  return result;
}
