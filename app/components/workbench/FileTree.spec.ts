import { describe, expect, it } from 'vitest';
import { buildFileList, buildFileListCacheKey } from './FileTree';

describe('FileTree', () => {
  it('uses the same cache key for equivalent file sets with different file contents', () => {
    const filesA: any = {
      '/src/index.ts': { type: 'file', content: 'console.log("A")', isBinary: false },
      '/src/components/App.tsx': { type: 'file', content: 'export const App = () => null;', isBinary: false },
    };

    const filesB: any = {
      '/src/index.ts': { type: 'file', content: 'console.log("B")', isBinary: false },
      '/src/components/App.tsx': { type: 'file', content: 'export const App = () => 1;', isBinary: false },
    };

    expect(buildFileListCacheKey(filesA, '/', false, [])).toBe(buildFileListCacheKey(filesB, '/', false, []));
    expect(buildFileList(filesA, '/', false, [])).toEqual(buildFileList(filesB, '/', false, []));
  });
});
