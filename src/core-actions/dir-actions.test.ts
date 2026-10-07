import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { suite, describe, beforeAll, beforeEach, it, expect } from 'vitest';

import { FileTree, type ActionsFn } from '../main.js';

import { coreActions } from './core-actions.js';

import type { TreeInterface } from '@app-types/tree.types.js';

const KEEP_TEST_FOLDER: boolean = process.env.KEEP_TEST_FOLDER === 'true';

const TEST_NAME = 'dir-core-actions';
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

const dir1Name = 'dir1';
const dir2Name = 'dir2';
const file1Name = 'file1';
const file2Name = 'file2.ts';
const file3Name = 'file3.md';
const file1Data = 'File 1 data';
const file2Data = 'const file = "File 2 data"';
const file3Data = '# File 3 Data';

suite('core dir actions suite', { concurrent: false }, () => {
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
      fs.mkdirSync(taskPath(), { recursive: true });

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

  describe('getPath core dir action', () => {
    const testName = 'getPaths';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('returns correct path for tree dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(),
        getPath(dir1Name),
        getPath(dir1Name, dir2Name),
      ];

      const dirs: [DirActions, string][] = treeDirs.map((dir, i) => [
        dir,
        dirPaths[i],
      ]);

      dirs.forEach(([dir, dirPath]) => {
        expect(dir.getPath()).toBe(dirPath);
      });
    });

    it('returns correct path for created dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(newDirName1),
        getPath(newDirName1, newDirName2),
        getPath(dir1Name, newDirName1),
        getPath(dir1Name, newDirName1, newDirName2),
        getPath(dir1Name, dir2Name, newDirName1),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2),
      ];

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.dirCreate(newDirName1) as DirActions;
        const newDir2 = newDir1.dirCreate(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      newDirs.forEach((dir, i) => {
        expect(dir.getPath()).toBe(dirPaths[i]);
      });
    });
  });

  describe('exists core dir action', () => {
    const testName = 'exists';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    const fileName = 'file';
    const dirName = 'folder';

    function checkInFileSystem(dirs: readonly DirActions[]) {
      return function check(exists: boolean): void {
        dirs.forEach((dir) => {
          expect(dir.exists(fileName)).toBe(exists);
          expect(dir.exists(dirName)).toBe(exists);
        });
      };
    }

    it('checks exists for tree dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);
      const check = checkInFileSystem(dirs);

      check(false);

      const filePaths = [
        getPath(fileName),
        getPath(dir1Name, fileName),
        getPath(dir1Name, dir2Name, fileName),
      ];

      const dirPaths = [
        getPath(dirName),
        getPath(dir1Name, dirName),
        getPath(dir1Name, dir2Name, dirName),
      ];

      filePaths.forEach((p) => fs.writeFileSync(p, ''));
      dirPaths.forEach((p) => fs.mkdirSync(p));

      check(true);
    });

    it('checks exists for created dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.dirCreate(newDirName1) as DirActions;
        const newDir2 = newDir1.dirCreate(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      const check = checkInFileSystem(newDirs);

      check(false);

      const filePaths = [
        getPath(newDirName1, fileName),
        getPath(newDirName1, newDirName2, fileName),
        getPath(dir1Name, newDirName1, fileName),
        getPath(dir1Name, newDirName1, newDirName2, fileName),
        getPath(dir1Name, dir2Name, newDirName1, fileName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, fileName),
      ];

      const dirPaths = [
        getPath(newDirName1, dirName),
        getPath(newDirName1, newDirName2, dirName),
        getPath(dir1Name, newDirName1, dirName),
        getPath(dir1Name, newDirName1, newDirName2, dirName),
        getPath(dir1Name, dir2Name, newDirName1, dirName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, dirName),
      ];

      filePaths.forEach((p) => fs.writeFileSync(p, ''));
      dirPaths.forEach((p) => fs.mkdirSync(p));

      check(true);
    });
  });

  describe('dirCreate core dir action', () => {
    const testName = 'dirCreate';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    const dirActions = {
      getPath: expect.any(Function),
      exists: expect.any(Function),
      dirCreate: expect.any(Function),
      dirDelete: expect.any(Function),
      fileCreate: expect.any(Function),
      fileDelete: expect.any(Function),
      fileRead: expect.any(Function),
      fileWrite: expect.any(Function),
      fileClear: expect.any(Function),
    };

    it('creates dir object of correct shape', () => {
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const createdDir = dir.dirCreate(newDirName1) as DirActions;
        const newDir = createdDir.dirCreate(newDirName2) as DirActions;
        return [...acc, createdDir, newDir];
      }, []);

      dirs.forEach((dir) => {
        expect(dir).toEqual(dirActions);
      });
    });

    it('creates dir in file system', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(newDirName1),
        getPath(newDirName1, newDirName2),
        getPath(dir1Name, newDirName1),
        getPath(dir1Name, newDirName1, newDirName2),
        getPath(dir1Name, dir2Name, newDirName1),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2),
      ];

      function check(exists: boolean): void {
        dirPaths.forEach((dirPath) => {
          expect(fs.existsSync(dirPath)).toBe(exists);
          if (exists) {
            expect(fs.statSync(dirPath).isDirectory()).toBe(true);
          }
        });
      }

      check(false);

      treeDirs.forEach((dir) => {
        const newDir = dir.dirCreate(newDirName1) as DirActions;
        newDir.dirCreate(newDirName2) as DirActions;
      });

      check(true);
    });

    it('returns dir object if dir already exists', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'folder';
      const root = actions((r) => r);

      fs.mkdirSync(getPath(dirName));
      const created = root.dirCreate(dirName);

      expect(created).toEqual(dirActions);
    });

    it('returns false if fails to create dir', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'new-dir/new-dir';
      const root = actions((r) => r);
      const newDir = root.dirCreate(dirName);
      const newDirPath = getPath(dirName);

      expect(newDir).toBe(false);
      expect(fs.existsSync(newDirPath)).toBe(false);
    });

    it('creates dir recursively', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'new-dir/new-dir';
      const root = actions((r) => r);
      const newDir = root.dirCreate(dirName, true);
      const newDirPath = getPath(dirName);

      expect(newDir).toEqual(dirActions);
      expect(fs.existsSync(newDirPath)).toBe(true);
    });
  });

  describe('dirDelete core dir action', () => {
    const testName = 'dirDelete';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('deletes dir located in tree dir', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'folder';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(dirName),
        getPath(dir1Name, dirName),
        getPath(dir1Name, dir2Name, dirName),
      ];

      function check(exists: boolean): void {
        dirPaths.forEach((p) => {
          expect(fs.existsSync(p)).toBe(exists);
        });
      }

      dirPaths.forEach((p) => fs.mkdirSync(p));
      check(true);

      treeDirs.forEach((dir) => dir.dirDelete(dirName));
      check(false);
    });

    it('deletes dir located in created dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'folder';
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(newDirName1, dirName),
        getPath(newDirName1, newDirName2, dirName),
        getPath(dir1Name, newDirName1, dirName),
        getPath(dir1Name, newDirName1, newDirName2, dirName),
        getPath(dir1Name, dir2Name, newDirName1, dirName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, dirName),
      ];

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.dirCreate(newDirName1) as DirActions;
        const newDir2 = newDir1.dirCreate(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      newDirs.forEach((dir, i) => {
        const currentPath = dirPaths[i];
        fs.mkdirSync(currentPath);
        expect(fs.existsSync(currentPath)).toBe(true);

        dir.dirDelete(dirName);
        expect(fs.existsSync(currentPath)).toBe(false);
      });
    });
  });
});
