import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { suite, describe, beforeAll, beforeEach, it, expect } from 'vitest';

import { FileTree, type ActionsFn } from '../main.js';

import { coreActions } from './core-actions.js';

import type { TreeInterface } from '@app-types/tree.types.js';

const KEEP_TEST_FOLDER: boolean = process.env.KEEP_TEST_FOLDER === 'true';

const TEST_NAME = 'file-core-actions';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const TEST_PATH = path.join(__dirname, `__test__${TEST_NAME}`);

function getTestPath(...args: readonly string[]): string {
  return path.join(TEST_PATH, ...args);
}

function deleteTestDir(...dirs: readonly string[]): void {
  fs.rmSync(getTestPath(...dirs), { force: true, recursive: true });
}

function createGetPathFn(testName: string) {
  return function getCurrentTaskPath(taskId: string) {
    return function getPath(...args: readonly string[]): string {
      return getTestPath(testName, taskId, ...args);
    };
  };
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, { encoding: 'utf-8' });
}

function fileData(data: number | string): string {
  return `File data ${data}`;
}

const dir1Name = 'dir1';
const dir2Name = 'dir2';
const file1Name = 'file1';
const file2Name = 'file2.ts';
const file3Name = 'file3.md';
const file1Data = 'File 1 data';
const file2Data = 'const file = "File 2 data"';
const file3Data = '# File 3 Data';

suite('core file actions suite', { concurrent: false }, () => {
  const tree = {
    [file1Name]: file1Data,
    [dir1Name]: {
      [file2Name]: file2Data,
      [dir2Name]: {
        [file3Name]: file3Data,
      },
    },
  } satisfies TreeInterface;
  let fileTree: FileTree<typeof tree>;

  type FileActions = ReturnType<typeof coreActions.file>;
  type DirActions = ReturnType<typeof coreActions.dir>;
  let actions: ActionsFn<typeof tree, FileActions, DirActions>;

  beforeAll(() => {
    if (fs.existsSync(TEST_PATH)) {
      deleteTestDir();
    }
    fs.mkdirSync(TEST_PATH);

    return function cleanup() {
      if (!KEEP_TEST_FOLDER) {
        deleteTestDir();
      }
    };
  });

  function beforeEachTest(testName: string): void {
    beforeEach(({ task }) => {
      function taskPath(...args: readonly string[]): string {
        return getTestPath(testName, task.id, ...args);
      }

      const CURRENT_TEST_PATH = taskPath();
      const deleteTaskDir = (): void => deleteTestDir(testName, task.id);

      // create current task directory
      if (fs.existsSync(CURRENT_TEST_PATH)) {
        deleteTaskDir();
      }
      fs.mkdirSync(CURRENT_TEST_PATH, { recursive: true });

      // create tree in task directory
      fs.mkdirSync(taskPath(dir1Name, dir2Name), { recursive: true });
      fs.writeFileSync(taskPath(file1Name), file1Data);
      fs.writeFileSync(taskPath(dir1Name, file2Name), file2Data);
      fs.writeFileSync(taskPath(dir1Name, dir2Name, file3Name), file3Data);

      fileTree = new FileTree(CURRENT_TEST_PATH, tree);
      actions = fileTree.use(coreActions);

      return function cleanup() {
        if (!KEEP_TEST_FOLDER) {
          deleteTaskDir();
        }
      };
    });
  }

  describe('getPath core file action', () => {
    const testName = 'getPath';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('returns path for tree files', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const treeFiles = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      const filePaths = [
        getPath(file1Name),
        getPath(dir1Name, file2Name),
        getPath(dir1Name, dir2Name, file3Name),
      ];

      treeFiles.forEach((file, i) => {
        expect(file.getPath()).toBe(filePaths[i]);
      });
    });

    it('returns path for created files', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const newFileName = 'new-file';
      const newDirName = 'new-dir';
      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newFiles = treeDirs.reduce<FileActions[]>((acc, dir) => {
        const newDir = dir.dirCreate(newDirName) as DirActions;
        const newFile1 = dir.fileCreate(newFileName) as FileActions;
        const newFile2 = newDir.fileCreate(newFileName) as FileActions;
        return [...acc, newFile1, newFile2];
      }, []);

      const filePaths = [
        getPath(newFileName),
        getPath(newDirName, newFileName),
        getPath(dir1Name, newFileName),
        getPath(dir1Name, newDirName, newFileName),
        getPath(dir1Name, dir2Name, newFileName),
        getPath(dir1Name, dir2Name, newDirName, newFileName),
      ];

      newFiles.forEach((file, i) => {
        expect(file.getPath()).toBe(filePaths[i]);
      });
    });
  });

  describe('read core file action', () => {
    const testName = 'read';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('reads tree files', ({ task }) => {
      const getPath = getTaskPath(task.id);

      const filePaths = [
        getPath(file1Name),
        getPath(dir1Name, file2Name),
        getPath(dir1Name, dir2Name, file3Name),
      ];

      filePaths.forEach((p, i) => fs.writeFileSync(p, fileData(i)));

      const treeFiles = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      treeFiles.forEach((file, i) => {
        expect(file.read()).toBe(fileData(i));
      });
    });

    it('reads created files', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const newFileName = 'new-file';
      const newDirName = 'new-dir';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newFiles = treeDirs.reduce<FileActions[]>((acc, dir) => {
        const newDir = dir.dirCreate(newDirName) as DirActions;
        const newFile1 = dir.fileCreate(newFileName) as FileActions;
        const newFile2 = newDir.fileCreate(newFileName) as FileActions;
        return [...acc, newFile1, newFile2];
      }, []);

      const filePaths = [
        getPath(newFileName),
        getPath(newDirName, newFileName),
        getPath(dir1Name, newFileName),
        getPath(dir1Name, newDirName, newFileName),
        getPath(dir1Name, dir2Name, newFileName),
        getPath(dir1Name, dir2Name, newDirName, newFileName),
      ];

      filePaths.forEach((p, i) => fs.writeFileSync(p, fileData(i)));

      newFiles.forEach((file, i) => {
        expect(file.read()).toBe(fileData(i));
      });
    });
  });

  describe('write core file action', () => {
    const testName = 'write';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('writes to tree files', ({ task }) => {
      const getPath = getTaskPath(task.id);

      const treeFiles = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      const filePaths = [
        [getPath(file1Name), file1Data],
        [getPath(dir1Name, file2Name), file2Data],
        [getPath(dir1Name, dir2Name, file3Name), file3Data],
      ];

      filePaths.forEach(([p, d]) => {
        expect(readFile(p)).toBe(d);
      });

      treeFiles.forEach((file, i) => file.write(fileData(i)));

      filePaths.forEach(([p], i) => {
        expect(readFile(p)).toBe(fileData(i));
      });
    });

    it('writes to created files', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const newFileName = 'new-file';
      const newDirName = 'new-dir';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newFiles = treeDirs.reduce<FileActions[]>((acc, dir) => {
        const newDir = dir.dirCreate(newDirName) as DirActions;
        const newFile1 = dir.fileCreate(newFileName) as FileActions;
        const newFile2 = newDir.fileCreate(newFileName) as FileActions;
        return [...acc, newFile1, newFile2];
      }, []);

      const filePaths = [
        getPath(newFileName),
        getPath(newDirName, newFileName),
        getPath(dir1Name, newFileName),
        getPath(dir1Name, newDirName, newFileName),
        getPath(dir1Name, dir2Name, newFileName),
        getPath(dir1Name, dir2Name, newDirName, newFileName),
      ];

      filePaths.forEach((p) => {
        expect(readFile(p)).toBe('');
      });

      newFiles.forEach((file, i) => file.write(fileData(i)));

      filePaths.forEach((p, i) => {
        expect(readFile(p)).toBe(fileData(i));
      });
    });
  });

  describe('clear core file action', () => {
    const testName = 'clear';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('clears tree files', ({ task }) => {
      const getPath = getTaskPath(task.id);

      const treeFiles = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      const filePaths = [
        [getPath(file1Name), file1Data],
        [getPath(dir1Name, file2Name), file2Data],
        [getPath(dir1Name, dir2Name, file3Name), file3Data],
      ];

      filePaths.forEach(([p, d]) => {
        expect(readFile(p)).toBe(d);
      });

      treeFiles.forEach((file) => file.clear());

      filePaths.forEach(([p]) => {
        expect(readFile(p)).toBe('');
      });
    });

    it('clears created files', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const newFileName = 'new-file';
      const newDirName = 'new-dir';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newFiles = treeDirs.reduce<FileActions[]>((acc, dir) => {
        const newDir = dir.dirCreate(newDirName) as DirActions;
        const newFile1 = dir.fileCreate(newFileName) as FileActions;
        const newFile2 = newDir.fileCreate(newFileName) as FileActions;
        return [...acc, newFile1, newFile2];
      }, []);

      const filePaths = [
        getPath(newFileName),
        getPath(newDirName, newFileName),
        getPath(dir1Name, newFileName),
        getPath(dir1Name, newDirName, newFileName),
        getPath(dir1Name, dir2Name, newFileName),
        getPath(dir1Name, dir2Name, newDirName, newFileName),
      ];

      filePaths.forEach((p, i) => fs.writeFileSync(p, fileData(i)));

      filePaths.forEach((p, i) => {
        expect(readFile(p)).toBe(fileData(i));
      });

      newFiles.forEach((file) => file.clear());

      filePaths.forEach((p) => {
        expect(readFile(p)).toBe('');
      });
    });
  });
});
