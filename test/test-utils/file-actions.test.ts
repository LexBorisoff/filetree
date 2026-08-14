import fs from 'node:fs';

import { beforeAll, beforeEach, expect, it, suite, vi } from 'vitest';

import { FileTree } from '@app/main.js';
import { coreActions } from '@core-actions/core-actions.js';
import { testSetup } from '@test-setup';

import { anyFunction } from './any-function.js';
import { NEW_DIR_NAME } from './dir-actions.js';
import {
  getTestFileActions,
  NEW_FILE_DATA,
  NEW_FILE_NAME,
  type TestFileActionsFn,
} from './file-actions.js';
import { TestEnum } from './test.enum.js';

import type { FileInfo } from './get-files-info.js';
import type { TreeInterface } from '@app-types/tree.types.js';
import type { CoreActionsType } from '@core-actions/core-actions.types.js';

const { setup, testPath } = testSetup(TestEnum.UseFiles, import.meta);

const tree = {
  file1: 'File 1',
  file2: 'File 1\nFile 2',
  dir1: {},
  dir2: {
    file3: 'File 1\nFile 2\nFile 3',
    file4: 'File 1\nFile 2\nFile 3\nFile 4',
    dir3: {},
    dir4: {
      file5: 'File 1\nFile 2\nFile 3\nFile 4\nFile 5',
      file6: 'File 1\nFile 2\nFile 3\nFile 4\nFile 5\nFile 6',
    },
  },
} satisfies TreeInterface;

interface FileInterface extends FileInfo {
  fileActions: CoreActionsType['file'];
  dirActions: CoreActionsType['dir'];
}

suite('getTestFileActions function', () => {
  beforeAll(() => setup());

  let fileTree: FileTree<typeof tree>;
  let files: FileInterface[];
  let testFileActions: TestFileActionsFn;

  beforeEach(() => {
    fileTree = new FileTree(testPath, tree);
    testFileActions = getTestFileActions(fileTree);
    const actions = fileTree.use(coreActions);

    files = [
      {
        fileActions: actions((root) => root.file1),
        dirActions: actions((root) => root),
        fileData: tree.file1,
        fileName: 'file1',
        pathDirs: [],
      },
      {
        fileActions: actions((root) => root.file2),
        dirActions: actions((root) => root),
        fileData: tree.file2,
        fileName: 'file2',
        pathDirs: [],
      },
      {
        fileActions: actions((root) => root.dir2.file3),
        dirActions: actions((root) => root.dir2),
        fileData: tree.dir2.file3,
        fileName: 'file3',
        pathDirs: ['dir2'],
      },
      {
        fileActions: actions((root) => root.dir2.file4),
        dirActions: actions((root) => root.dir2),
        fileData: tree.dir2.file4,
        fileName: 'file4',
        pathDirs: ['dir2'],
      },
      {
        fileActions: actions((root) => root.dir2.dir4.file5),
        dirActions: actions((root) => root.dir2.dir4),
        fileData: tree.dir2.dir4.file5,
        fileName: 'file5',
        pathDirs: ['dir2', 'dir4'],
      },
      {
        fileActions: actions((root) => root.dir2.dir4.file6),
        dirActions: actions((root) => root.dir2.dir4),
        fileData: tree.dir2.dir4.file6,
        fileName: 'file6',
        pathDirs: ['dir2', 'dir4'],
      },
    ];
  });

  it('should be a function', () => {
    expect(testFileActions).toBeTypeOf('function');
  });

  it('should call the callback', () => {
    function treeFileParams(index: number): [object, FileInfo] {
      const { fileActions, fileData, fileName, pathDirs } = files[index];
      const info: FileInfo = {
        fileName,
        fileData,
        pathDirs,
      };
      return [anyFunction(fileActions), info];
    }

    /**
     * File created with fileCreate on tree directires
     */
    function createdFileParams1(index: number): [object, FileInfo] | [] {
      const { dirActions, pathDirs } = files[index];
      const info: FileInfo = {
        fileData: NEW_FILE_DATA,
        fileName: NEW_FILE_NAME,
        pathDirs,
      };

      // create the tree directory
      const treeDir = dirActions.getPath();
      fs.mkdirSync(treeDir, { recursive: true });

      // create the new file
      const createdFile = dirActions.fileCreate(NEW_FILE_NAME, NEW_FILE_DATA);

      // delete the tree directory
      fs.rmSync(treeDir, {
        force: true,
        recursive: true,
      });

      return createdFile ? [anyFunction(createdFile), info] : [];
    }

    /**
     * File created with dirCreated + fileCreate combination
     */
    function createdFileParams2(index: number): [object, FileInfo] | [] {
      const { dirActions, pathDirs } = files[index];
      const info: FileInfo = {
        fileData: NEW_FILE_DATA,
        fileName: NEW_FILE_NAME,
        pathDirs: pathDirs.concat(NEW_DIR_NAME),
      };

      // create the tree directory
      const treeDir = dirActions.getPath();
      fs.mkdirSync(treeDir, { recursive: true });

      // create the new directory
      const createdDir = dirActions.dirCreate(NEW_DIR_NAME);

      if (createdDir) {
        // create the new file
        const createdFile = createdDir.fileCreate(NEW_FILE_NAME, NEW_FILE_DATA);

        // delete the tree directory
        fs.rmSync(treeDir, {
          force: true,
          recursive: true,
        });

        return [anyFunction(createdFile || {}), info];
      }

      return [];
    }

    const cb = vi.fn();
    const numOfFiles = files.length;
    const callsPerFile = 3;

    testFileActions(cb);
    expect(cb).toHaveBeenCalledTimes(numOfFiles * callsPerFile);

    let callNum = 1;
    Array.from({ length: numOfFiles }).forEach((_, i) => {
      expect(cb).toHaveBeenNthCalledWith(callNum++, ...treeFileParams(i));
      expect(cb).toHaveBeenNthCalledWith(callNum++, ...createdFileParams1(i));
      expect(cb).toHaveBeenNthCalledWith(callNum++, ...createdFileParams2(i));
    });
  });
});
