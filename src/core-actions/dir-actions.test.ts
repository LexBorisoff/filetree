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
  return function getPath(...args: readonly string[]): string {
    return getTestPath(testName, ...args);
  };
}

const dir1Name = 'dir1';
const dir2Name = 'dir2';
const file1Name = 'file1';
const file2Name = 'file2.txt';
const file3Name = 'file3.md';

suite('core dir actions suite', { concurrent: false }, () => {
  const tree = {
    [file1Name]: '',
    [dir1Name]: {
      [file2Name]: '',
      [dir2Name]: {
        [file3Name]: '',
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
    const CURRENT_TEST_PATH = getTestPath(testName);

    beforeEach(() => {
      if (fs.existsSync(CURRENT_TEST_PATH)) {
        deleteTestDir(testName);
      }
      fs.mkdirSync(CURRENT_TEST_PATH);

      fs.mkdirSync(getTestPath(testName, dir1Name, dir2Name), {
        recursive: true,
      });

      fileTree = new FileTree(CURRENT_TEST_PATH, tree);
      actions = fileTree.use(coreActions);

      return function cleanup() {
        if (!KEEP_TEST_FOLDER) {
          deleteTestDir(testName);
        }
      };
    });
  }

  describe('getPath core dir action', () => {
    const testName = 'getPath';
    beforeEachTest(testName);

    const getPath = createGetPathFn(testName);

    it('returns correct path for tree dirs', () => {
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

    it('returns correct path for dirs created by tree dirs', () => {
      const newDirName = 'new-dir';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(newDirName),
        getPath(dir1Name, newDirName),
        getPath(dir1Name, dir2Name, newDirName),
      ];

      const dirs: [DirActions, string][] = treeDirs.map((dir, i) => {
        const newDir = dir.dirCreate(newDirName) as DirActions;
        return [newDir, dirPaths[i]];
      });

      dirs.forEach(([dir, dirPath]) => {
        expect(dir.getPath()).toBe(dirPath);
      });
    });

    it('returns correct path for dirs created by other created dirs', () => {
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(newDirName1, newDirName2),
        getPath(dir1Name, newDirName1, newDirName2),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2),
      ];

      const dirs: [DirActions, string][] = treeDirs.map((dir, i) => {
        const createdDir = dir.dirCreate(newDirName1) as DirActions;
        const newDir = createdDir.dirCreate(newDirName2) as DirActions;
        return [newDir, dirPaths[i]];
      });

      dirs.forEach(([dir, dirPath]) => {
        expect(dir.getPath()).toBe(dirPath);
      });
    });
  });

  describe('exists core dir action', () => {
    const testName = 'exists';
    beforeEachTest(testName);

    const getPath = createGetPathFn(testName);

    const fileName = 'file.txt';
    const dirName = 'folder';

    it('checks exists for tree dirs', () => {
      const dirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      function exists(value: boolean): void {
        dirs.forEach((dir) => {
          expect(dir.exists(fileName)).toBe(value);
          expect(dir.exists(dirName)).toBe(value);
        });
      }

      exists(false);

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

      exists(true);
    });

    it('checks exists for dirs created by tree dirs', () => {
      const newDirName = 'new-dir';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirs = treeDirs.map(
        (dir) => dir.dirCreate(newDirName) as DirActions,
      );

      function exists(value: boolean): void {
        dirs.forEach((dir) => {
          expect(dir.exists(fileName)).toBe(value);
          expect(dir.exists(dirName)).toBe(value);
        });
      }

      exists(false);

      const filePaths = [
        getPath(newDirName, fileName),
        getPath(dir1Name, newDirName, fileName),
        getPath(dir1Name, dir2Name, newDirName, fileName),
      ];

      const dirPaths = [
        getPath(newDirName, dirName),
        getPath(dir1Name, newDirName, dirName),
        getPath(dir1Name, dir2Name, newDirName, dirName),
      ];

      filePaths.forEach((p) => fs.writeFileSync(p, ''));
      dirPaths.forEach((p) => fs.mkdirSync(p));

      exists(true);
    });

    it('checks exists for dirs created by other created dirs', () => {
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirs = treeDirs.map((dir) => {
        const newDir = dir.dirCreate(newDirName1) as DirActions;
        return newDir.dirCreate(newDirName2) as DirActions;
      });

      function exists(value: boolean): void {
        dirs.forEach((dir) => {
          expect(dir.exists(fileName)).toBe(value);
          expect(dir.exists(dirName)).toBe(value);
        });
      }

      exists(false);

      const filePaths = [
        getPath(newDirName1, newDirName2, fileName),
        getPath(dir1Name, newDirName1, newDirName2, fileName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, fileName),
      ];

      const dirPaths = [
        getPath(newDirName1, newDirName2, dirName),
        getPath(dir1Name, newDirName1, newDirName2, dirName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, dirName),
      ];

      filePaths.forEach((p) => fs.writeFileSync(p, ''));
      dirPaths.forEach((p) => fs.mkdirSync(p));

      exists(true);
    });
  });

  describe('dirCreate core dir action', () => {
    const testName = 'dirCreate';
    beforeEachTest(testName);

    const getPath = createGetPathFn(testName);

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
      const dirs: DirActions[] = [];

      treeDirs.forEach((dir) => {
        const createdDir = dir.dirCreate(newDirName1) as DirActions;
        const newDir = createdDir.dirCreate(newDirName2) as DirActions;
        dirs.push(createdDir, newDir);
      });

      dirs.forEach((dir) => {
        expect(dir).toEqual(dirActions);
      });
    });

    it('creates dir in file system', () => {
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
            expect(fs.statSync(dirPath).isDirectory()).toBe(exists);
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

    it('returns false if fails to create dir', () => {
      const dirName = 'new-dir/new-dir';
      const root = actions((r) => r);
      const newDir = root.dirCreate(dirName);
      const newDirPath = getPath(dirName);

      expect(newDir).toBe(false);
      expect(fs.existsSync(newDirPath)).toBe(false);
    });

    it('creates dir recursively', () => {
      const dirName = 'new-dir/new-dir';
      const root = actions((r) => r);
      const newDir = root.dirCreate(dirName, true);
      const newDirPath = getPath(dirName);

      expect(newDir).toEqual(dirActions);
      expect(fs.existsSync(newDirPath)).toBe(true);
    });
  });

  describe('dirDelete core dir action', () => {
    const testName = 'dirCreate';
    beforeEachTest(testName);

    const getPath = createGetPathFn(testName);

    it('deletes dir located in tree dir', () => {
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

    it('deletes dir located in dirs created by tree dirs', () => {
      const newDirName = 'new-dir';
      const dirName = 'folder';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(newDirName, dirName),
        getPath(dir1Name, newDirName, dirName),
        getPath(dir1Name, dir2Name, newDirName, dirName),
      ];

      treeDirs.forEach((dir, i) => {
        const currentPath = dirPaths[i];
        const newDir = dir.dirCreate(newDirName) as DirActions;

        fs.mkdirSync(currentPath);
        expect(fs.existsSync(currentPath)).toBe(true);

        newDir.dirDelete(dirName);
        expect(fs.existsSync(currentPath)).toBe(false);
      });
    });

    it('deletes dir located in dirs created by other created dirs', () => {
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';
      const dirName = 'folder';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirPaths = [
        getPath(newDirName1, newDirName2, dirName),
        getPath(dir1Name, newDirName1, newDirName2, dirName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, dirName),
      ];

      treeDirs.forEach((dir, i) => {
        const currentPath = dirPaths[i];
        const created = dir.dirCreate(newDirName1) as DirActions;
        const newDir = created.dirCreate(newDirName2) as DirActions;

        fs.mkdirSync(currentPath);
        expect(fs.existsSync(currentPath)).toBe(true);

        newDir.dirDelete(dirName);
        expect(fs.existsSync(currentPath)).toBe(false);
      });
    });
  });
});
