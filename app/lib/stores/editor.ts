import { atom, computed, map, type MapStore, type WritableAtom } from 'nanostores';
import type { EditorDocument, ScrollPosition } from '~/components/editor/codemirror/CodeMirrorEditor';
import type { FileMap, FilesStore } from './files';
import { createScopedLogger } from '~/utils/logger';

export type EditorDocuments = Record<string, EditorDocument>;

type SelectedFile = WritableAtom<string | undefined>;

const logger = createScopedLogger('EditorStore');

export class EditorStore {
  #filesStore: FilesStore;

  selectedFile: SelectedFile = import.meta.hot?.data.selectedFile ?? atom<string | undefined>();
  documents: MapStore<EditorDocuments> = import.meta.hot?.data.documents ?? map({});

  currentDocument = computed([this.documents, this.selectedFile], (documents, selectedFile) => {
    if (!selectedFile) {
      return undefined;
    }

    return documents[selectedFile];
  });

  constructor(filesStore: FilesStore) {
    this.#filesStore = filesStore;

    if (import.meta.hot) {
      import.meta.hot.data.documents = this.documents;
      import.meta.hot.data.selectedFile = this.selectedFile;
    }
  }

  setDocuments(files: FileMap) {
    const previousDocuments = this.documents.get() ?? {};
    const nextDocuments: EditorDocuments = { ...previousDocuments };
    let hasChanges = false;

    for (const filePath of Object.keys(previousDocuments)) {
      if (!files[filePath]) {
        delete nextDocuments[filePath];
        hasChanges = true;
      }
    }

    for (const [filePath, dirent] of Object.entries(files)) {
      if (dirent === undefined || dirent.type !== 'file') {
        if (previousDocuments[filePath]) {
          delete nextDocuments[filePath];
          hasChanges = true;
        }

        continue;
      }

      const previousDocument = previousDocuments[filePath];
      const nextDocument: EditorDocument = previousDocument
        ? {
          ...previousDocument,
          value: dirent.content,
          filePath,
          isBinary: dirent.isBinary,
        }
        : {
          value: dirent.content,
          filePath,
          isBinary: dirent.isBinary,
        };

      const documentChanged =
        !previousDocument ||
        previousDocument.value !== dirent.content ||
        previousDocument.isBinary !== dirent.isBinary ||
        previousDocument.filePath !== filePath;

      if (documentChanged) {
        nextDocuments[filePath] = nextDocument;
        hasChanges = true;
      } else if (!previousDocument) {
        nextDocuments[filePath] = nextDocument;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.documents.set(nextDocuments);
    }
  }

  setSelectedFile(filePath: string | undefined) {
    this.selectedFile.set(filePath);
  }

  updateScrollPosition(filePath: string, position: ScrollPosition) {
    const documents = this.documents.get();
    const documentState = documents[filePath];

    if (!documentState) {
      return;
    }

    this.documents.setKey(filePath, {
      ...documentState,
      scroll: position,
    });
  }

  updateFile(filePath: string, newContent: string) {
    const documents = this.documents.get();
    const documentState = documents[filePath];

    if (!documentState) {
      return;
    }

    // Check if the file is locked by getting the file from the filesStore
    const file = this.#filesStore.getFile(filePath);

    if (file?.isLocked) {
      logger.warn(`Attempted to update locked file: ${filePath}`);
      return;
    }

    /*
     * For scoped locks, we would need to implement diff checking here
     * to determine if the edit is modifying existing code or just adding new code
     * This is a more complex feature that would be implemented in a future update
     */

    const currentContent = documentState.value;
    const contentChanged = currentContent !== newContent;

    if (contentChanged) {
      this.documents.setKey(filePath, {
        ...documentState,
        value: newContent,
      });
    }
  }
}
