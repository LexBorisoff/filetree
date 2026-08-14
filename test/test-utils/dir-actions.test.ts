import { beforeAll, beforeEach, expect, it, suite, vi } from 'vitest';

import { FileTree } from '@app/main.js';
import { coreActions } from '@core-actions/core-actions.js';
import { testSetup } from '@test-setup';
import { anyFunction } from '@test-utils/any-function.js';
import {
  getTestDirActions,
  NEW_DIR_NAME,
  type TestDirActionsFn,
} from '@test-utils/dir-actions.js';

import { TestEnum } from './test.enum.js';

import type { TreeInterface } from '@app-types/tree.types.js';
import type { CoreActionsType } from '@core-actions/core-actions.types.js';
import type { DirInfo } from '@test-utils/get-dirs-info.js';

const { setup, testPath } = testSetup(TestEnum.UseDirs, import.meta);

const tree = {
  file1: '',
  dir1: {},
  dir2: {
    file2: '',
    dir3: {},
    dir4: {
      file3: '',
      dir5: {},
      dir6: {
        file4: '',
      },
    },
  },
} satisfies TreeInterface;

interface DirInterface extends DirInfo {
  dirActions: CoreActionsType['dir'];
}

suite('getTestDirActions function', () => {
  beforeAll(() => setup());

  let fileTree: FileTree<typeof tree>;
  let dirs: DirInterface[];
  let testDirActions: TestDirActionsFn;

  beforeEach(() => {
    fileTree = new FileTree(testPath, tree);
    testDirActions = getTestDirActions(fileTree);
    const actions = fileTree.use(coreActions);

    dirs = [
      {
        dirActions: actions((root) => root),
        children: ['file1', 'dir1', 'dir2'],
        pathDirs: [],
      },
      {
        dirActions: actions((root) => root.dir1),
        children: [],
        pathDirs: ['dir1'],
      },
      {
        dirActions: actions((root) => root.dir2),
        children: ['file2', 'dir3', 'dir4'],
        pathDirs: ['dir2'],
      },
      {
        dirActions: actions((root) => root.dir2.dir3),
        children: [],
        pathDirs: ['dir2', 'dir3'],
      },
      {
        dirActions: actions((root) => root.dir2.dir4),
        children: ['file3', 'dir5', 'dir6'],
        pathDirs: ['dir2', 'dir4'],
      },
      {
        dirActions: actions((root) => root.dir2.dir4.dir5),
        children: [],
        pathDirs: ['dir2', 'dir4', 'dir5'],
      },
      {
        dirActions: actions((root) => root.dir2.dir4.dir6),
        children: ['file4'],
        pathDirs: ['dir2', 'dir4', 'dir6'],
      },
    ];
  });

  it('should be a function', () => {
    expect(testDirActions).toBeTypeOf('function');
  });

  it('should call the callback', () => {
    function treeDirParams(index: number): [object, DirInfo] {
      const { dirActions, ...rest } = dirs[index];
      return [anyFunction(dirActions), rest];
    }

    function createdDirParams(index: number): [object, DirInfo] {
      const { dirActions, pathDirs } = dirs[index];
      const info: DirInfo = {
        children: [],
        pathDirs: pathDirs.concat(NEW_DIR_NAME),
      };

      const createdDir = dirActions.dirCreate(NEW_DIR_NAME);
      return [anyFunction(createdDir || {}), info];
    }

    const cb = vi.fn();
    const numOfDirs = dirs.length;
    const callsPerDir = 2;

    testDirActions(cb);
    expect(cb).toHaveBeenCalledTimes(numOfDirs * callsPerDir);

    let callNum = 1;
    Array.from({ length: numOfDirs }).forEach((_, i) => {
      expect(cb).toHaveBeenNthCalledWith(callNum++, ...treeDirParams(i));
      expect(cb).toHaveBeenNthCalledWith(callNum++, ...createdDirParams(i));
    });
  });
});
