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

const dir1Name = 'dir1';
const dir2Name = 'dir2';
const file1Name = 'file1';
const file2Name = 'file2.txt';
const file3Name = 'file3.md';

suite('file actions suite', () => {
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

      fs.mkdirSync(getTestPath(testName, dir1Name, dir2Name, 'dir3'), {
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

  describe('getPath core file action', () => {
    const testName = 'getPath';
    beforeEachTest(testName);

    function getPath(...args: readonly string[]): string {
      return getTestPath(testName, ...args);
    }

    it('returns correct path for a file from tree', () => {
      const [f1, f2, f3] = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      expect(f1.getPath()).toBe(getPath(file1Name));
      expect(f2.getPath()).toBe(getPath(dir1Name, file2Name));
      expect(f3.getPath()).toBe(getPath(dir1Name, dir2Name, file3Name));
    });

    it('returns correct path for a file created with fileCreate on a tree directory', () => {
      const newFileName = 'new-file';
      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const f1 = root.fileCreate(newFileName) as FileActions;
      const f2 = d1.fileCreate(newFileName) as FileActions;
      const f3 = d2.fileCreate(newFileName) as FileActions;

      expect(f1.getPath()).toBe(getPath(newFileName));
      expect(f2.getPath()).toBe(getPath(dir1Name, newFileName));
      expect(f3.getPath()).toBe(getPath(dir1Name, dir2Name, newFileName));
    });

    it('returns correct path for a file created with dirCreate + fileCreate', () => {
      const newDirName = 'new-dir';
      const newFileName = 'new-file';
      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const newD1 = root.dirCreate(newDirName) as DirActions;
      const newD2 = d1.dirCreate(newDirName) as DirActions;
      const newD3 = d2.dirCreate(newDirName) as DirActions;

      const f1 = newD1.fileCreate(newFileName) as FileActions;
      const f2 = newD2.fileCreate(newFileName) as FileActions;
      const f3 = newD3.fileCreate(newFileName) as FileActions;

      expect(f1.getPath()).toBe(getPath(newDirName, newFileName));
      expect(f2.getPath()).toBe(getPath(dir1Name, newDirName, newFileName));
      expect(f3.getPath()).toBe(
        getPath(dir1Name, dir2Name, newDirName, newFileName),
      );
    });
  });

  describe('read core file action', () => {
    const testName = 'read';
    beforeEachTest(testName);

    function getPath(...args: readonly string[]): string {
      return getTestPath(testName, ...args);
    }

    const data = (append: number): string => `File data ${append}`;

    it('reads file from tree', () => {
      fs.writeFileSync(getPath(file1Name), data(1));
      fs.writeFileSync(getPath(dir1Name, file2Name), data(2));
      fs.writeFileSync(getPath(dir1Name, dir2Name, file3Name), data(3));

      const [f1, f2, f3] = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      expect(f1.read()).toBe(data(1));
      expect(f2.read()).toBe(data(2));
      expect(f3.read()).toBe(data(3));
    });

    it('reads file created with fileCreate on a tree directory', () => {
      const newFileName = 'new-file';

      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const f1 = root.fileCreate(newFileName, data(1)) as FileActions;
      const f2 = d1.fileCreate(newFileName, data(2)) as FileActions;
      const f3 = d2.fileCreate(newFileName, data(3)) as FileActions;

      expect(f1.read()).toBe(data(1));
      expect(f2.read()).toBe(data(2));
      expect(f3.read()).toBe(data(3));
    });

    it('reads file created with dirCreate + fileCreate', () => {
      const newFileName = 'new-file';
      const newDirName = 'new-dir';

      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const newDir1 = root.dirCreate(newDirName) as DirActions;
      const newDir2 = d1.dirCreate(newDirName) as DirActions;
      const newDir3 = d2.dirCreate(newDirName) as DirActions;

      const f1 = newDir1.fileCreate(newFileName, data(1)) as FileActions;
      const f2 = newDir2.fileCreate(newFileName, data(2)) as FileActions;
      const f3 = newDir3.fileCreate(newFileName, data(3)) as FileActions;

      expect(f1.read()).toBe(data(1));
      expect(f2.read()).toBe(data(2));
      expect(f3.read()).toBe(data(3));
    });
  });

  describe('write core file action', () => {
    const testName = 'write';
    beforeEachTest(testName);

    function getPath(...args: readonly string[]): string {
      return getTestPath(testName, ...args);
    }

    function readFile(filePath: string): string {
      return fs.readFileSync(filePath, { encoding: 'utf-8' });
    }

    const data = (append: number): string => `File data ${append}`;

    it('writes to file from tree', () => {
      const [f1, f2, f3] = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      f1.write(data(1));
      f2.write(data(2));
      f3.write(data(3));

      const f1Data = readFile(getPath(file1Name));
      const f2Data = readFile(getPath(dir1Name, file2Name));
      const f3Data = readFile(getPath(dir1Name, dir2Name, file3Name));

      expect(f1Data).toBe(data(1));
      expect(f2Data).toBe(data(2));
      expect(f3Data).toBe(data(3));
    });

    it('writes to file created with fileCreate on a tree directory', () => {
      const newFileName = 'new-file';

      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const f1 = root.fileCreate(newFileName) as FileActions;
      const f2 = d1.fileCreate(newFileName) as FileActions;
      const f3 = d2.fileCreate(newFileName) as FileActions;

      f1.write(data(1));
      f2.write(data(2));
      f3.write(data(3));

      const f1Data = readFile(getPath(newFileName));
      const f2Data = readFile(getPath(dir1Name, newFileName));
      const f3Data = readFile(getPath(dir1Name, dir2Name, newFileName));

      expect(f1Data).toBe(data(1));
      expect(f2Data).toBe(data(2));
      expect(f3Data).toBe(data(3));
    });

    it('writes to file created with dirCreate + fileCreate', () => {
      const newFileName = 'new-file';
      const newDirName = 'new-dir';

      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const newDir1 = root.dirCreate(newDirName) as DirActions;
      const newDir2 = d1.dirCreate(newDirName) as DirActions;
      const newDir3 = d2.dirCreate(newDirName) as DirActions;

      const f1 = newDir1.fileCreate(newFileName) as FileActions;
      const f2 = newDir2.fileCreate(newFileName) as FileActions;
      const f3 = newDir3.fileCreate(newFileName) as FileActions;

      f1.write(data(1));
      f2.write(data(2));
      f3.write(data(3));

      const f1Data = readFile(getPath(newDirName, newFileName));
      const f2Data = readFile(getPath(dir1Name, newDirName, newFileName));
      const f3Data = readFile(
        getPath(dir1Name, dir2Name, newDirName, newFileName),
      );

      expect(f1Data).toBe(data(1));
      expect(f2Data).toBe(data(2));
      expect(f3Data).toBe(data(3));
    });
  });

  describe('clear core file action', () => {
    const testName = 'clear';
    beforeEachTest(testName);

    function getPath(...args: readonly string[]): string {
      return getTestPath(testName, ...args);
    }

    function readFile(filePath: string): string {
      return fs.readFileSync(filePath, { encoding: 'utf-8' });
    }

    const data = (append: number): string => `File data ${append}`;

    it('clears file from tree', () => {
      const f1Path = getPath(file1Name);
      const f2Path = getPath(dir1Name, file2Name);
      const f3Path = getPath(dir1Name, dir2Name, file3Name);

      fs.writeFileSync(f1Path, data(1));
      fs.writeFileSync(f2Path, data(2));
      fs.writeFileSync(f3Path, data(3));

      expect(readFile(f1Path)).toBe(data(1));
      expect(readFile(f2Path)).toBe(data(2));
      expect(readFile(f3Path)).toBe(data(3));

      const [f1, f2, f3] = actions((r) => [
        r[file1Name],
        r[dir1Name][file2Name],
        r[dir1Name][dir2Name][file3Name],
      ]);

      f1.clear();
      f2.clear();
      f3.clear();

      expect(readFile(f1Path)).toBe('');
      expect(readFile(f2Path)).toBe('');
      expect(readFile(f3Path)).toBe('');
    });

    it('clears file created with fileCreate on a tree directory', () => {
      const newFileName = 'new-file';
      const f1Path = getPath(newFileName);
      const f2Path = getPath(dir1Name, newFileName);
      const f3Path = getPath(dir1Name, dir2Name, newFileName);

      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const f1 = root.fileCreate(newFileName, data(1)) as FileActions;
      const f2 = d1.fileCreate(newFileName, data(2)) as FileActions;
      const f3 = d2.fileCreate(newFileName, data(3)) as FileActions;

      expect(readFile(f1Path)).toBe(data(1));
      expect(readFile(f2Path)).toBe(data(2));
      expect(readFile(f3Path)).toBe(data(3));

      f1.clear();
      f2.clear();
      f3.clear();

      expect(readFile(f1Path)).toBe('');
      expect(readFile(f2Path)).toBe('');
      expect(readFile(f3Path)).toBe('');
    });

    it('clears file created with dirCreate + fileCreate', () => {
      const newFileName = 'new-file';
      const newDirName = 'new-dir';

      const f1Path = getPath(newDirName, newFileName);
      const f2Path = getPath(dir1Name, newDirName, newFileName);
      const f3Path = getPath(dir1Name, dir2Name, newDirName, newFileName);

      const [root, d1, d2] = actions((r) => [
        r,
        r[dir1Name],
        r[dir1Name][dir2Name],
      ]);

      const newDir1 = root.dirCreate(newDirName) as DirActions;
      const newDir2 = d1.dirCreate(newDirName) as DirActions;
      const newDir3 = d2.dirCreate(newDirName) as DirActions;

      const f1 = newDir1.fileCreate(newFileName, data(1)) as FileActions;
      const f2 = newDir2.fileCreate(newFileName, data(2)) as FileActions;
      const f3 = newDir3.fileCreate(newFileName, data(3)) as FileActions;

      expect(readFile(f1Path)).toBe(data(1));
      expect(readFile(f2Path)).toBe(data(2));
      expect(readFile(f3Path)).toBe(data(3));

      f1.clear();
      f2.clear();
      f3.clear();

      expect(readFile(f1Path)).toBe('');
      expect(readFile(f2Path)).toBe('');
      expect(readFile(f3Path)).toBe('');
    });
  });
});
