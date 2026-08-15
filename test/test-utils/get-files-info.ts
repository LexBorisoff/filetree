import type { FileTree } from '@app/main.js';
import type { FileType, TreeInterface } from '@app-types/tree.types.js';

export interface FileInfo {
  fileData: FileType;
  fileName: string;
  pathDirs: string[];
}

export function getFilesInfo(fileTree: FileTree<TreeInterface>): FileInfo[] {
  const files: FileInfo[] = [];

  (function traverse(
    dir: TreeInterface = fileTree.tree,
    pathDirs: string[] = [],
  ): void {
    Object.entries(dir).forEach(([key, node]) => {
      if (typeof node === 'string') {
        files.push({
          fileData: node,
          fileName: key,
          pathDirs,
        });
        return;
      }

      if (typeof node === 'object') {
        traverse(node, pathDirs.concat(key));
      }
    });
  })();

  return files;
}
