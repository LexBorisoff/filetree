import fs from 'node:fs';
import path from 'node:path';

import { coreActions } from '@core-actions/core-actions.js';

import { NEW_DIR_NAME } from './dir-actions.js';
import { getFilesInfo, type FileInfo } from './get-files-info.js';

import type { FileTree } from '@app/main.js';
import type { TreeInterface } from '@app-types/tree.types.js';
import type { CoreActionsType } from '@core-actions/core-actions.types.js';

type TestFileActionsCb = (
  actions: CoreActionsType['file'],
  file: FileInfo,
) => void;

export type TestFileActionsFn = (cb: TestFileActionsCb) => void;

export const NEW_FILE_NAME = 'new-file';
export const NEW_FILE_DATA = 'new file data';

export function getTestFileActions(
  fileTree: FileTree<TreeInterface>,
): TestFileActionsFn {
  const files = getFilesInfo(fileTree);
  const actions = fileTree.use(coreActions);

  /**
   * Types of files for testing:
   * 1. from the tree
   * 2. created with fileCreate on tree directories
   * 3. created with dirCreate + fileCreate combination
   */
  return function testFileActions(cb) {
    files.forEach((fileInfo) => {
      const { pathDirs, fileName } = fileInfo;
      const dirPath = path.resolve(fileTree.rootPath, ...pathDirs);

      fs.mkdirSync(dirPath, { recursive: true });

      /**
       * Test file from the tree
       */
      const fileActions = actions((root) => {
        let currentDir: TreeInterface = root;

        pathDirs.forEach((dirName) => {
          if (
            Object.keys(currentDir).includes(dirName) &&
            typeof currentDir[dirName] === 'object'
          ) {
            currentDir = currentDir[dirName];
          }
        });

        return currentDir[fileName] as string;
      });

      cb(fileActions, fileInfo);

      /**
       * Tree directory
       */
      const dirActions = actions((root) => {
        let currentDir: TreeInterface = root;

        pathDirs.forEach((dirName) => {
          if (
            Object.keys(currentDir).includes(dirName) &&
            typeof currentDir[dirName] === 'object'
          ) {
            currentDir = currentDir[dirName];
          }
        });

        return currentDir;
      });

      /**
       * Test file created with fileCreate on a tree directory
       */
      const createdFile1 = dirActions.fileCreate(NEW_FILE_NAME, NEW_FILE_DATA);
      if (createdFile1) {
        cb(createdFile1, {
          fileName: NEW_FILE_NAME,
          fileData: NEW_FILE_DATA,
          pathDirs,
        });
      }

      /**
       * Test file created with dirCreate + fileCreate combination
       */
      const createdDir = dirActions.dirCreate(NEW_DIR_NAME, true);
      if (createdDir) {
        const createdFile2 = createdDir.fileCreate(
          NEW_FILE_NAME,
          NEW_FILE_DATA,
        );
        if (createdFile2) {
          cb(createdFile2, {
            fileName: NEW_FILE_NAME,
            fileData: NEW_FILE_DATA,
            pathDirs: pathDirs.concat(NEW_DIR_NAME),
          });
        }
      }

      fs.rmSync(dirPath, {
        force: true,
        recursive: true,
      });
    });
  };
}
