import { describe, expect, it } from 'vitest';
import { EditorStore } from './editor';

describe('EditorStore', () => {
  it('does not replace the entire document map when the file set is unchanged', () => {
    const store = new EditorStore({
      getFile: () => ({ isLocked: false }),
    } as any);

    const initialFiles: any = {
      '/src/index.ts': {
        type: 'file',
        content: 'console.log(1);',
        isBinary: false,
      },
    };

    store.setDocuments(initialFiles);

    const before = store.documents.get();

    store.setDocuments(initialFiles);

    expect(store.documents.get()).toBe(before);
  });

  it('preserves scroll position for unchanged files while updating changed files', () => {
    const store = new EditorStore({
      getFile: () => ({ isLocked: false }),
    } as any);

    store.documents.set({
      '/src/index.ts': {
        value: 'console.log(1);',
        filePath: '/src/index.ts',
        isBinary: false,
        scroll: { top: 42, left: 8 },
      },
    });

    store.setDocuments({
      '/src/index.ts': {
        type: 'file',
        content: 'console.log(2);',
        isBinary: false,
      },
      '/src/other.ts': {
        type: 'file',
        content: 'export const x = 1;',
        isBinary: false,
      },
    } as any);

    expect(store.documents.get()['/src/index.ts']).toMatchObject({
      value: 'console.log(2);',
      scroll: { top: 42, left: 8 },
    });
    expect(store.documents.get()['/src/other.ts']).toMatchObject({
      value: 'export const x = 1;',
    });
  });
});
