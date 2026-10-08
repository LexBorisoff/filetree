import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import {
  describe,
  it,
  beforeEach,
  beforeAll,
  expect,
  vi,
  afterEach,
} from 'vitest';

import * as createDir from '@utils/create-dir.js';

import { FileTree } from '../main.js';

import { CreateTreeError } from './create-tree-error.js';
import { createTree } from './create-tree.js';

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

function getCurrentTaskPath(taskId: string) {
  return function getPath(...args: readonly string[]): string {
    return getTestPath(taskId, ...args);
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

describe('createTree function', () => {
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

  beforeEach(({ task }) => {
    const CURRENT_TEST_PATH = getTestPath(task.id);

    // create current task directory
    if (fs.existsSync(CURRENT_TEST_PATH)) {
      deleteTestDir(task.id);
    }
    fs.mkdirSync(CURRENT_TEST_PATH, { recursive: true });

    fileTree = new FileTree(getTestPath(task.id), tree);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates tree in file system', ({ task }) => {
    const getPath = getCurrentTaskPath(task.id);

    createTree(fileTree);

    const dirPaths = [
      getPath(),
      getPath(dir1Name),
      getPath(dir1Name, dir2Name),
    ];

    const filePaths = [
      [getPath(file1Name), file1Data],
      [getPath(dir1Name, file2Name), file2Data],
      [getPath(dir1Name, dir2Name, file3Name), file3Data],
    ];

    dirPaths.forEach((p) => {
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.statSync(p).isDirectory()).toBe(true);
    });

    filePaths.forEach(([p, d]) => {
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.statSync(p).isFile()).toBe(true);
      expect(fs.readFileSync(p, { encoding: 'utf8' })).toBe(d);
    });
  });

  it('returns empty errors array', () => {
    const errors = createTree(fileTree);
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(0);
  });

  it('returns error when root directory path is a file', ({ task }) => {
    const rootPath = getTestPath(task.id);

    if (fs.existsSync(rootPath)) {
      fs.rmdirSync(rootPath);
    }
    fs.writeFileSync(rootPath, '');

    fileTree = new FileTree(rootPath, tree);
    const errors = createTree(fileTree);

    expect(errors.length).toBe(1);
    expect(errors.at(0)).toBeInstanceOf(CreateTreeError);
    expect(errors.at(0)?.type).toBe('dir');
    expect(errors.at(0)?.path).toBe(rootPath);
  });

  it('returns errors when directory paths are files', ({ task }) => {
    const rootPath = getTestPath(task.id);
    const ft = new FileTree(rootPath, {
      dir1: {},
      dir2: {
        dir3: {},
      },
    });

    const dirPaths = [
      getTestPath(task.id, 'dir1'),
      getTestPath(task.id, 'dir2', 'dir3'),
    ];

    fs.mkdirSync(getTestPath(task.id, 'dir2'));
    dirPaths.forEach((p) => fs.writeFileSync(p, ''));

    const errors = createTree(ft);

    expect(errors.length).toBe(dirPaths.length);

    dirPaths.forEach((dirPath, i) => {
      expect(errors.at(i)).toBeInstanceOf(CreateTreeError);
      expect(errors.at(i)?.type).toBe('dir');
      expect(errors.at(i)?.path).toBe(dirPath);
    });
  });

  it('returns errors when file paths are directories', ({ task }) => {
    const rootPath = getTestPath(task.id);
    const ft = new FileTree(rootPath, {
      file1: '',
      dir1: {
        file2: '',
      },
    });

    const filePaths: string[] = [
      getTestPath(task.id, 'file1'),
      getTestPath(task.id, 'dir1', 'file2'),
    ];

    filePaths.forEach((p) => fs.mkdirSync(p, { recursive: true }));

    const errors = createTree(ft);

    expect(errors.length).toBe(filePaths.length);
    filePaths.forEach((filePath, i) => {
      expect(errors.at(i)).toBeInstanceOf(CreateTreeError);
      expect(errors.at(i)?.type).toBe('file');
      expect(errors.at(i)?.path).toBe(filePath);
    });
  });

  it('throws when createDir throws an unknown error', () => {
    const originalFn = createDir.createDir;
    const error = new Error('unknown error');

    vi.spyOn(createDir, 'createDir').mockImplementation(() => {
      throw error;
    });

    expect(() => createTree(fileTree)).toThrow(error);

    // throw on the second call to createDir
    vi.spyOn(createDir, 'createDir')
      .mockImplementationOnce(originalFn)
      .mockImplementationOnce(() => {
        throw error;
      });

    expect(() => createTree(fileTree)).toThrow(error);
  });
});
