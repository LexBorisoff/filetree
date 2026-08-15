import fs from 'node:fs';
import path from 'node:path';

import { CreateTreeError } from '@errors/create-tree.error.js';
import { createDir } from '@utils/create-dir.js';

import type { FileTree } from '../main.js';
import type { TreeInterface } from '@app-types/tree.types.js';

export function createTree(
  fileTree: FileTree<TreeInterface>,
): CreateTreeError[] {
  const errors: CreateTreeError[] = [];

  function traverse(parentPath: string, currentTree: TreeInterface): void {
    Object.entries(currentTree).forEach(([key, value]) => {
      const fullPath = path.resolve(parentPath, key);

      try {
        if (typeof value === 'string') {
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
            errors.push(
              new CreateTreeError(
                'file',
                fullPath,
                ({ pathExistsAsDir }) => pathExistsAsDir,
              ),
            );
            return;
          }

          fs.writeFileSync(fullPath, value);
          return;
        }

        if (typeof value === 'object') {
          createDir(fullPath);

          if (Object.keys(value).length > 0) {
            traverse(fullPath, value);
          }
        }
      } catch (error) {
        if (error instanceof CreateTreeError) {
          errors.push(error);
        } else {
          throw error;
        }
      }
    });
  }

  try {
    const { rootPath, tree } = fileTree;

    createDir(rootPath);
    traverse(rootPath, tree);
  } catch (error) {
    if (error instanceof CreateTreeError) {
      errors.push(error);
    } else {
      throw error;
    }
  }

  return errors;
}
