import fs from 'node:fs';
import path from 'node:path';

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  suite,
  vi,
} from 'vitest';

import { createTree } from '@app/create-tree/create-tree.js';
import { CreateTreeError } from '@app/errors/create-tree.error.js';
import { FileTree } from '@app/main.js';
import * as createDir from '@app/utils/create-dir.js';
import { testSetup } from '@test-setup';
import { deleteDir } from '@test-utils/delete-dir.js';
import { getPathArray, type PathTreeFile } from '@test-utils/get-path-array.js';
import { tree } from '@test-utils/tree.js';

import type { TreeInterface } from '@app-types/tree.types.js';

const { setup, joinPath } = testSetup('create-files', import.meta);

enum CreateFilesTest {
  FileTreeObject = 'file-tree-object',
  ErrorHandling = 'error-handling',
}

suite('createTree function', { concurrent: false }, () => {
  beforeAll(() => setup());

  let getDescribePath: (...args: string[]) => string;

  function describeSetup(testName: string): void {
    getDescribePath = (...args) => joinPath(testName, ...args);
  }

  describe('create files based on an FileTree object', () => {
    describeSetup(CreateFilesTest.FileTreeObject);
    const describePath = getDescribePath();
    const pathArray = getPathArray(describePath, tree);

    beforeEach(() => {
      const fileTree = new FileTree(describePath, tree);
      createTree(fileTree);
    });

    afterEach(() => {
      const files = fs.readdirSync(describePath);
      files.forEach((file) => {
        const currentPath = getDescribePath(file);
        deleteDir(currentPath);
      });
    });

    it('should create files and directories', () => {
      pathArray.forEach((item) => {
        expect(fs.existsSync(item.path)).toBe(true);
      });
    });

    it('should be directories', () => {
      pathArray
        .filter(({ type }) => type === 'dir')
        .forEach((dir) => {
          expect(fs.statSync(dir.path).isDirectory()).toBe(true);
        });
    });

    it('should be files', () => {
      pathArray
        .filter(({ type }) => type === 'file')
        .forEach((file) => {
          expect(fs.statSync(file.path).isFile()).toBe(true);
        });
    });

    it('should write correct file data', () => {
      pathArray
        .filter((item): item is PathTreeFile => item.type === 'file')
        .forEach((file) => {
          const data = fs.readFileSync(file.path, 'utf-8');
          expect(data).toBe(file.data);
        });
    });
  });

  describe('create files error handling', () => {
    describeSetup(CreateFilesTest.ErrorHandling);
    const describePath = getDescribePath();
    const rootPath = getDescribePath('root-path');
    let fileTree: FileTree<TreeInterface>;

    beforeEach(() => {
      fileTree = new FileTree(rootPath, tree);
      fs.mkdirSync(describePath, { recursive: true });
    });

    afterEach(() => {
      const files = fs.readdirSync(describePath);
      files.forEach((file) => {
        deleteDir(getDescribePath(file));
      });
    });

    it('should return error when root directory path is a file', () => {
      fs.writeFileSync(rootPath, '');

      const errors = createTree(fileTree);
      expect(errors.length).toBe(1);
      expect(errors.at(0)).toBeInstanceOf(CreateTreeError);
      expect(errors.at(0)?.type).toBe('dir');
      expect(errors.at(0)?.path).toBe(rootPath);
    });

    it('should return errors when directory paths exist as files', () => {
      const dirPaths: string[] = [];

      function traverse(dir: TreeInterface, dirPath: string): void {
        fs.mkdirSync(dirPath, { recursive: true });

        Object.entries(dir).forEach(([key, value]) => {
          if (typeof value === 'object') {
            const currentPath = path.resolve(dirPath, key);
            dirPaths.push(currentPath);
            fs.writeFileSync(currentPath, '');
          }
        });
      }

      traverse(fileTree.tree, fileTree.rootPath);

      const errors = createTree(fileTree);

      expect(errors.length).toBe(dirPaths.length);
      dirPaths.forEach((dirPath, i) => {
        expect(errors.at(i)).toBeInstanceOf(CreateTreeError);
        expect(errors.at(i)?.type).toBe('dir');
        expect(errors.at(i)?.path).toBe(dirPath);
      });
    });

    it('should return errors when file paths exist as directories', () => {
      const filePaths: string[] = [];

      function traverse(dir: TreeInterface, dirPath: string): void {
        Object.entries(dir).forEach(([key, value]) => {
          const currentPath = path.resolve(dirPath, key);

          if (typeof value === 'string') {
            filePaths.push(currentPath);
            fs.mkdirSync(currentPath, { recursive: true });
            return;
          }

          if (typeof value === 'object') {
            traverse(value, currentPath);
          }
        });
      }

      traverse(fileTree.tree, fileTree.rootPath);

      const errors = createTree(fileTree);

      expect(errors.length).toBe(filePaths.length);
      filePaths.forEach((filePath, i) => {
        expect(errors.at(i)).toBeInstanceOf(CreateTreeError);
        expect(errors.at(i)?.type).toBe('file');
        expect(errors.at(i)?.path).toBe(filePath);
      });
    });

    it('should throw when createDir throws an unknown error', () => {
      const originalFn = createDir.createDir;
      const error = new Error('unknown error');

      // throw on the first call to createDir
      vi.spyOn(createDir, 'createDir').mockImplementationOnce(() => {
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
});
