import type { FileTree } from '@app/main.js';
import type { TreeInterface } from '@app-types/tree.types.js';

export interface DirInfo {
  children: string[];
  pathDirs: string[];
}

export function getDirsInfo(fileTree: FileTree<TreeInterface>): DirInfo[] {
  const dirs: DirInfo[] = [];

  (function traverse(
    dir: TreeInterface = fileTree.tree,
    pathDirs: string[] = [],
  ): void {
    dirs.push({
      pathDirs,
      children: Object.keys(dir),
    });

    Object.entries(dir).forEach(([key, node]) => {
      if (typeof node === 'object') {
        traverse(node, pathDirs.concat(key));
      }
    });
  })();

  return dirs;
}
