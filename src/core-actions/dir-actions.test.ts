import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import {
  suite,
  describe,
  beforeAll,
  beforeEach,
  it,
  expect,
  afterEach,
  vi,
} from 'vitest';

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
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
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
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
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

  describe('createDir core dir action', () => {
    const testName = 'createDir';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    const dirActions = {
      getPath: expect.any(Function),
      exists: expect.any(Function),
      createDir: expect.any(Function),
      deleteDir: expect.any(Function),
      createFile: expect.any(Function),
      deleteFile: expect.any(Function),
      readFile: expect.any(Function),
      writeFile: expect.any(Function),
      clearFile: expect.any(Function),
    };

    it('creates dir object of correct shape', () => {
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const dirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const createdDir = dir.createDir(newDirName1) as DirActions;
        const newDir = createdDir.createDir(newDirName2) as DirActions;
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
        const newDir = dir.createDir(newDirName1) as DirActions;
        newDir.createDir(newDirName2) as DirActions;
      });

      check(true);
    });

    it('returns dir object if dir already exists', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'folder';
      const root = actions((r) => r);

      fs.mkdirSync(getPath(dirName));
      const created = root.createDir(dirName);

      expect(created).toEqual(dirActions);
    });

    it('returns false if fails to create dir', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'new-dir/new-dir';
      const root = actions((r) => r);
      const newDir = root.createDir(dirName);
      const newDirPath = getPath(dirName);

      expect(newDir).toBe(false);
      expect(fs.existsSync(newDirPath)).toBe(false);
    });

    it('creates dir recursively', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const dirName = 'new-dir/new-dir';
      const root = actions((r) => r);
      const newDir = root.createDir(dirName, true);
      const newDirPath = getPath(dirName);

      expect(newDir).toEqual(dirActions);
      expect(fs.existsSync(newDirPath)).toBe(true);
    });
  });

  describe('deleteDir core dir action', () => {
    const testName = 'deleteDir';
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

      treeDirs.forEach((dir) => dir.deleteDir(dirName));
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
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      newDirs.forEach((dir, i) => {
        const currentPath = dirPaths[i];
        fs.mkdirSync(currentPath);
        expect(fs.existsSync(currentPath)).toBe(true);

        dir.deleteDir(dirName);
        expect(fs.existsSync(currentPath)).toBe(false);
      });
    });

    it('skips if dir does not exist', ({ task }) => {
      const root = actions((r) => r);
      const dirName = 'no-dir';
      const dirPath = getTaskPath(task.id)(dirName);

      root.deleteDir(dirName);
      expect(fs.existsSync(dirPath)).toBe(false);
    });
  });

  describe('createFile core dir action', () => {
    const testName = 'createFile';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    function checkInFileSystem(filePaths: readonly string[]) {
      return function check(exists: boolean): void {
        filePaths.forEach((p) => {
          expect(fs.existsSync(p)).toBe(exists);
          if (exists) {
            expect(fs.statSync(p).isFile()).toBe(true);
          }
        });
      };
    }

    const fileActions = {
      getPath: expect.any(Function),
      read: expect.any(Function),
      write: expect.any(Function),
      clear: expect.any(Function),
    };

    it('creates file object of correct shape', () => {
      const fileName = 'file';
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      const newFiles = [...treeDirs, ...newDirs].map((dir) =>
        dir.createFile(fileName),
      );

      newFiles.forEach((file) => {
        expect(file).toEqual(fileActions);
      });
    });

    it('creates file by tree dirs in file system', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const dirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const filePaths = [
        getPath(fileName),
        getPath(dir1Name, fileName),
        getPath(dir1Name, dir2Name, fileName),
      ];

      const check = checkInFileSystem(filePaths);
      check(false);

      dirs.forEach((dir) => dir.createFile(fileName, ''));
      check(true);
    });

    it('creates file by created dirs in file system', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      const filePaths = [
        getPath(newDirName1, fileName),
        getPath(newDirName1, newDirName2, fileName),
        getPath(dir1Name, newDirName1, fileName),
        getPath(dir1Name, newDirName1, newDirName2, fileName),
        getPath(dir1Name, dir2Name, newDirName1, fileName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, fileName),
      ];

      const check = checkInFileSystem(filePaths);
      check(false);

      newDirs.forEach((dir) => dir.createFile(fileName, ''));
      check(true);
    });

    it('returns false if fails to create file', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'new-dir/file';
      const root = actions((r) => r);
      const newFile = root.createFile(fileName);
      const newFilePath = getPath(fileName);

      expect(newFile).toBe(false);
      expect(fs.existsSync(newFilePath)).toBe(false);
    });
  });

  describe('deleteFile core dir action', () => {
    const testName = 'deleteFile';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('deletes file located in tree dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const filePaths = [
        getPath(fileName),
        getPath(dir1Name, fileName),
        getPath(dir1Name, dir2Name, fileName),
      ];

      function check(exists: boolean): void {
        filePaths.forEach((p) => {
          expect(fs.existsSync(p)).toBe(exists);
        });
      }

      filePaths.forEach((p) => fs.writeFileSync(p, ''));
      check(true);

      treeDirs.forEach((dir) => dir.deleteFile(fileName));
      check(false);
    });

    it('deletes file located in created dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const filePaths = [
        getPath(newDirName1, fileName),
        getPath(newDirName1, newDirName2, fileName),
        getPath(dir1Name, newDirName1, fileName),
        getPath(dir1Name, newDirName1, newDirName2, fileName),
        getPath(dir1Name, dir2Name, newDirName1, fileName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, fileName),
      ];

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      newDirs.forEach((dir, i) => {
        const currentPath = filePaths[i];
        fs.writeFileSync(currentPath, '');
        expect(fs.existsSync(currentPath)).toBe(true);

        dir.deleteFile(fileName);
        expect(fs.existsSync(currentPath)).toBe(false);
      });
    });

    it('skips if file does not exist', ({ task }) => {
      const fileName = 'no-file';
      const filePath = getTaskPath(task.id)(fileName);
      const root = actions((r) => r);

      root.deleteFile(fileName);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('readFile core dir actions', () => {
    const testName = 'readFile';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('reads file located in tree dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const filePaths = [
        getPath(fileName),
        getPath(dir1Name, fileName),
        getPath(dir1Name, dir2Name, fileName),
      ];

      filePaths.forEach((p, i) => fs.writeFileSync(p, fileData(i)));

      treeDirs.forEach((dir, i) => {
        expect(dir.readFile(fileName)).toBe(fileData(i));
      });
    });

    it('reads file located in created dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      const filePaths = [
        getPath(newDirName1, fileName),
        getPath(newDirName1, newDirName2, fileName),
        getPath(dir1Name, newDirName1, fileName),
        getPath(dir1Name, newDirName1, newDirName2, fileName),
        getPath(dir1Name, dir2Name, newDirName1, fileName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, fileName),
      ];

      filePaths.forEach((p, i) => fs.writeFileSync(p, fileData(i)));

      newDirs.forEach((dir, i) => {
        expect(dir.readFile(fileName)).toBe(fileData(i));
      });
    });
  });

  describe('writeFile core dir action', () => {
    const testName = 'writeFile';
    beforeEachTest(testName);

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const getTaskPath = createGetPathFn(testName);

    it('creates new file and writes to it in tree dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const filePaths = [
        getPath(fileName),
        getPath(dir1Name, fileName),
        getPath(dir1Name, dir2Name, fileName),
      ];

      filePaths.forEach((p) => {
        expect(fs.existsSync(p)).toBe(false);
      });

      treeDirs.forEach((dir, i) => dir.writeFile(fileName, fileData(i)));

      filePaths.forEach((p, i) => {
        expect(fs.existsSync(p)).toBe(true);
        expect(readFile(p)).toBe(fileData(i));
      });
    });

    it('creates new file and writes to it in created dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      const filePaths = [
        getPath(newDirName1, fileName),
        getPath(newDirName1, newDirName2, fileName),
        getPath(dir1Name, newDirName1, fileName),
        getPath(dir1Name, newDirName1, newDirName2, fileName),
        getPath(dir1Name, dir2Name, newDirName1, fileName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, fileName),
      ];

      filePaths.forEach((p) => {
        expect(fs.existsSync(p)).toBe(false);
      });

      newDirs.forEach((dir, i) => dir.writeFile(fileName, fileData(i)));

      filePaths.forEach((p, i) => {
        expect(fs.existsSync(p)).toBe(true);
        expect(readFile(p)).toBe(fileData(i));
      });
    });
  });

  describe('clearFile core dir action', () => {
    const testName = 'clearFile';
    beforeEachTest(testName);

    const getTaskPath = createGetPathFn(testName);

    it('clears file in tree dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const filePaths = [
        getPath(fileName),
        getPath(dir1Name, fileName),
        getPath(dir1Name, dir2Name, fileName),
      ];

      filePaths.forEach((p, i) => fs.writeFileSync(p, fileData(i)));

      filePaths.forEach((p, i) => {
        expect(readFile(p)).toBe(fileData(i));
      });

      treeDirs.forEach((dir) => dir.clearFile(fileName));

      filePaths.forEach((p) => {
        expect(readFile(p)).toBe('');
      });
    });

    it('clears file in created dirs', ({ task }) => {
      const getPath = getTaskPath(task.id);
      const fileName = 'file';
      const newDirName1 = 'new-dir-1';
      const newDirName2 = 'new-dir-2';

      const treeDirs = actions((r) => [r, r[dir1Name], r[dir1Name][dir2Name]]);

      const newDirs = treeDirs.reduce<DirActions[]>((acc, dir) => {
        const newDir1 = dir.createDir(newDirName1) as DirActions;
        const newDir2 = newDir1.createDir(newDirName2) as DirActions;
        return [...acc, newDir1, newDir2];
      }, []);

      const filePaths = [
        getPath(newDirName1, fileName),
        getPath(newDirName1, newDirName2, fileName),
        getPath(dir1Name, newDirName1, fileName),
        getPath(dir1Name, newDirName1, newDirName2, fileName),
        getPath(dir1Name, dir2Name, newDirName1, fileName),
        getPath(dir1Name, dir2Name, newDirName1, newDirName2, fileName),
      ];

      filePaths.forEach((p, i) => fs.writeFileSync(p, fileData(i)));

      filePaths.forEach((p, i) => {
        expect(readFile(p)).toBe(fileData(i));
      });

      newDirs.forEach((dir) => dir.clearFile(fileName));

      filePaths.forEach((p) => {
        expect(readFile(p)).toBe('');
      });
    });

    it('skips if file does not exist', ({ task }) => {
      const fileName = 'no-file';
      const filePath = getTaskPath(task.id)(fileName);
      const root = actions((r) => r);

      root.clearFile(fileName);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });
});
