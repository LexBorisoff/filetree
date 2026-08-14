import fs from 'node:fs';

import { beforeAll, beforeEach, describe, expect, it, suite } from 'vitest';

import { FileTree } from '@app/main.js';
import { testSetup } from '@test-setup';
import { coreActionsObject } from '@test-utils/core-actions-object.js';
import { deleteDir } from '@test-utils/delete-dir.js';
import {
  getTestFileActions,
  type TestFileActionsFn,
} from '@test-utils/file-actions.js';
import { fileDataArray } from '@test-utils/file-data-array.js';
import { tree } from '@test-utils/tree.js';

import { TestEnum } from './test.enum.js';

import type { TreeInterface } from '@app-types/tree.types.js';

const { setup, joinPath } = testSetup(TestEnum.CoreFileActions, import.meta);

enum CoreFileActionsTest {
  ObjectProperties = 'object-properties',
  GetPath = 'get-path',
  Exists = 'exists',
  Read = 'read',
  Write = 'write',
  Clear = 'clear',
}

suite('core file actions', { concurrent: false }, () => {
  beforeAll(() => setup());

  let fileTree: FileTree<TreeInterface>;
  let testFileActions: TestFileActionsFn;
  let getDescribePath: (...args: string[]) => string;

  function describeSetup(testName: string): void {
    beforeEach(() => {
      getDescribePath = (...args) => joinPath(testName, ...args);
      const testPath = getDescribePath();
      fileTree = new FileTree(testPath, tree);
      testFileActions = getTestFileActions(fileTree);

      fs.mkdirSync(testPath);
      return (): void => {
        deleteDir(testPath);
      };
    });
  }

  describe('core file action properties', () => {
    describeSetup(CoreFileActionsTest.ObjectProperties);

    it('should have core file actions', () => {
      testFileActions((actions) => {
        expect(actions).toEqual(coreActionsObject.file);
      });
    });
  });

  describe('getPath core file action', () => {
    describeSetup(CoreFileActionsTest.GetPath);

    it('should return file path', () => {
      testFileActions((actions, { fileName, pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        expect(actions.getPath()).toBe(filePath);
      });
    });
  });

  describe('read core file action', () => {
    describeSetup(CoreFileActionsTest.Read);

    it('should read file data', () => {
      testFileActions((actions, { fileName, pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        const dirPath = getDescribePath(...pathDirs);
        fs.mkdirSync(dirPath, { recursive: true });

        fileDataArray.forEach((fileData) => {
          fs.writeFileSync(filePath, fileData);
          expect(actions.read()).toBe(fileData);
        });
      });
    });
  });

  describe('write core file action', () => {
    describeSetup(CoreFileActionsTest.Write);

    it('should write data to the file', () => {
      testFileActions((actions, { fileName, pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        const dirPath = getDescribePath(...pathDirs);

        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, '');

        fileDataArray.forEach((fileData) => {
          actions.write(fileData);
          const data = fs.readFileSync(filePath, 'utf-8');
          expect(data).toBe(fileData);
        });
      });
    });
  });

  describe('clear core file action', () => {
    describeSetup(CoreFileActionsTest.Clear);

    it('should clear file data', () => {
      testFileActions((actions, { fileName, pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        const dirPath = getDescribePath(...pathDirs);
        fs.mkdirSync(dirPath, { recursive: true });

        fileDataArray.forEach((fileData) => {
          fs.writeFileSync(filePath, fileData);
          actions.clear();
          const data = fs.readFileSync(filePath, 'utf-8');
          expect(data).toBe('');
        });
      });
    });
  });
});
