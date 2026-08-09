import fs from 'node:fs';
import path from 'node:path';

import { coreHooks } from '@core-hooks/core-hooks.js';

import { getFilesInfo, type FileInfo } from './get-files-info.js';
import { NEW_DIR_NAME } from './use-dirs.js';

import type { FsHooks } from '@app/fs-hooks.js';
import type { TreeInterface } from '@app-types/tree.types.js';
import type { CoreHooks } from '@core-hooks/core-hooks.types.js';

type UseFilesCb = (hooks: CoreHooks['file'], file: FileInfo) => void;

export type UseFilesFn = (cb: UseFilesCb) => void;

export const NEW_FILE_NAME = 'new-file';
export const NEW_FILE_DATA = 'new file data';

export function getUseFiles(fsHooks: FsHooks<TreeInterface>): UseFilesFn {
  const files = getFilesInfo(fsHooks);
  const hooks = fsHooks.useHooks(coreHooks);

  /**
   * Types of files for testing:
   * 1. from the tree
   * 2. created with fileCreate on tree directories
   * 3. created with dirCreate + fileCreate combination
   */
  return function useFiles(cb) {
    files.forEach((fileInfo) => {
      const { pathDirs, fileName } = fileInfo;
      const dirPath = path.resolve(fsHooks.rootPath, ...pathDirs);

      fs.mkdirSync(dirPath, { recursive: true });

      /**
       * Test file from the tree
       */
      const fileHooks = hooks((root) => {
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

      cb(fileHooks, fileInfo);

      /**
       * Tree directory
       */
      const dirHooks = hooks((root) => {
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
      const createdFile1 = dirHooks.fileCreate(NEW_FILE_NAME, NEW_FILE_DATA);
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
      const createdDir = dirHooks.dirCreate(NEW_DIR_NAME, true);
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
