import path from 'node:path';

import type {
  DirObjectInterface,
  FileObjectInterface,
  TreeInterface,
  ObjectTreeType,
} from '@app-types/tree.types.js';

export function buildObjectTree<Tree extends TreeInterface>(
  rootPath: string,
  tree: Tree,
): DirObjectInterface<Tree> {
  function traverse<ChildTree extends TreeInterface>(
    parentPath: string,
    childTree: ChildTree,
  ): ObjectTreeType<ChildTree> {
    let result = {} as ObjectTreeType<ChildTree>;

    Object.entries(childTree).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const file: FileObjectInterface = {
          type: 'file',
          path: path.resolve(parentPath, key),
        };

        result = {
          ...result,
          [key]: file,
        };
        return;
      }

      if (typeof value === 'object') {
        const dirPath = path.resolve(parentPath, key);
        const dir: DirObjectInterface<typeof value> = {
          type: 'dir',
          path: dirPath,
          children: traverse(dirPath, value),
        };

        result = {
          ...result,
          [key]: dir,
        };
      }
    });

    return result;
  }

  return {
    type: 'dir',
    path: rootPath,
    children: traverse(rootPath, tree),
  };
}
