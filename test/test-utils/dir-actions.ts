import fs from 'node:fs';

import { coreActions } from '@core-actions/core-actions.js';

import { getDirsInfo, type DirInfo } from './get-dirs-info.js';

import type { FileTree } from '@app/main.js';
import type { TreeInterface } from '@app-types/tree.types.js';
import type { CoreActionsType } from '@core-actions/core-actions.types.js';

type TestDirActionsCb = (actions: CoreActionsType['dir'], dir: DirInfo) => void;

export type TestDirActionsFn = (cb: TestDirActionsCb) => void;

export const NEW_DIR_NAME = 'new-dir';

export function getTestDirActions(
  fileTree: FileTree<TreeInterface>,
): TestDirActionsFn {
  const dirs = getDirsInfo(fileTree);
  const actions = fileTree.use(coreActions);

  /**
   * Types of directories for testing
   * 1. from the tree
   * 2. created with dirCreate on tree directories
   */
  return function testDirActions(cb) {
    dirs.forEach((dirInfo) => {
      const { pathDirs } = dirInfo;

      /**
       * Test directory from the tree
       */
      const dirActions = actions((root) => {
        let currentDir: TreeInterface = root;

        pathDirs.forEach((dirName) => {
          currentDir = currentDir[dirName] as TreeInterface;
        });

        return currentDir;
      });

      cb(dirActions, dirInfo);

      /**
       * Test directory created with dirCreate on a tree directory
       */
      const createdDir = dirActions.dirCreate(NEW_DIR_NAME, true);

      if (createdDir) {
        cb(createdDir, {
          pathDirs: pathDirs.concat(NEW_DIR_NAME),
          children: [],
        });

        fs.rmSync(createdDir.getPath(), {
          force: true,
          recursive: true,
        });
      }
    });
  };
}
