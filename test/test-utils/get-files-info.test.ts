import { beforeEach, expect, it, suite } from 'vitest';

import { FileTree } from '@app/main.js';
import { testSetup } from '@test-setup';
import { getFilesInfo } from '@test-utils/get-files-info.js';

import { TestEnum } from './test.enum.js';

import type { TreeInterface } from '@app-types/tree.types.js';

const { testPath } = testSetup(TestEnum.GetFilesInfo, import.meta);

const tree = {
  file1: 'file 1 data',
  dir1: {
    file2: 'file 2 data',
    dir2: {
      file3: 'file 3 data',
      dir3: {
        file4: 'file 4 data',
      },
    },
  },
} satisfies TreeInterface;

suite('getFilesInfo function', () => {
  let fileTree: FileTree<typeof tree>;

  beforeEach(() => {
    fileTree = new FileTree(testPath, tree);
  });

  it('should return files information array', () => {
    const files = getFilesInfo(fileTree);
    const filesInfo = [
      {
        fileName: 'file1',
        fileData: tree.file1,
        pathDirs: [],
      },
      {
        fileName: 'file2',
        fileData: tree.dir1.file2,
        pathDirs: ['dir1'],
      },
      {
        fileName: 'file3',
        fileData: tree.dir1.dir2.file3,
        pathDirs: ['dir1', 'dir2'],
      },
      {
        fileName: 'file4',
        fileData: tree.dir1.dir2.dir3.file4,
        pathDirs: ['dir1', 'dir2', 'dir3'],
      },
    ];

    expect(files).toEqual(filesInfo);
  });
});
