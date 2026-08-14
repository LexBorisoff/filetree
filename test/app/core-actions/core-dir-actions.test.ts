import fs from 'node:fs';

import { beforeAll, beforeEach, describe, expect, it, suite } from 'vitest';

import { FileTree } from '@app/main.js';
import { testSetup } from '@test-setup';
import { coreActionsObject } from '@test-utils/core-actions-object.js';
import { deleteDir } from '@test-utils/delete-dir.js';
import {
  getTestDirActions,
  type TestDirActionsFn,
} from '@test-utils/dir-actions.js';
import { fileDataArray } from '@test-utils/file-data-array.js';
import { tree } from '@test-utils/tree.js';

import { TestEnum } from './test.enum.js';

const { setup, joinPath } = testSetup(TestEnum.CoreDirActions, import.meta);

enum CoreDirActionsTest {
  ObjectProperties = 'object-properties',
  GetPath = 'get-path',
  Exists = 'exists',
  DirCreate = 'dir-create',
  DirDelete = 'dir-delete',
  FileCreate = 'file-create',
  FileDelete = 'file-delete',
  FileRead = 'file-read',
  FileWrite = 'file-write',
  FileClear = 'file-clear',
}

suite('core directory actions', { concurrent: false }, () => {
  beforeAll(() => setup());

  let fileTree: FileTree<typeof tree>;
  let testDirActions: TestDirActionsFn;
  let getDescribePath: (...args: string[]) => string;

  function describeSetup(testName: string): void {
    beforeEach(() => {
      getDescribePath = (...args) => joinPath(testName, ...args);
      const testPath = getDescribePath();
      fileTree = new FileTree(testPath, tree);
      testDirActions = getTestDirActions(fileTree);

      fs.mkdirSync(testPath);
      return (): void => {
        deleteDir(testPath);
      };
    });
  }

  describe('core directory action properties', () => {
    describeSetup(CoreDirActionsTest.ObjectProperties);

    it('should have core directory actions', () => {
      testDirActions((actions) => {
        expect(actions).toEqual(coreActionsObject.dir);
      });
    });
  });

  describe('getPath core directory action', () => {
    describeSetup(CoreDirActionsTest.GetPath);

    it('should return directory path', () => {
      testDirActions((actions, { pathDirs }) => {
        const result = actions.getPath();
        expect(result).toBe(getDescribePath(...pathDirs));
      });
    });
  });

  describe('exists core directory action', () => {
    describeSetup(CoreDirActionsTest.Exists);

    it('should check if files and directories exist', () => {
      const dirName = 'new-dir';
      const fileName = 'new-file';

      testDirActions((actions, { pathDirs }) => {
        expect(actions.exists(dirName)).toBe(false);
        expect(actions.exists(fileName)).toBe(false);

        const dirPath = getDescribePath(...pathDirs, dirName);
        const filePath = getDescribePath(...pathDirs, fileName);
        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, '');

        expect(actions.exists(dirName)).toBe(true);
        expect(actions.exists(fileName)).toBe(true);
      });
    });
  });

  describe('dirCreate core directory action', () => {
    describeSetup(CoreDirActionsTest.DirCreate);

    it('should create directories', () => {
      const dirName = 'new-dir';

      testDirActions((actions, { pathDirs }) => {
        const treeDirPath = getDescribePath(...pathDirs);
        const newDirPath = getDescribePath(...pathDirs, dirName);
        expect(fs.existsSync(newDirPath)).toBe(false);

        if (!fs.existsSync(treeDirPath)) {
          fs.mkdirSync(treeDirPath);
        }

        const createdDir = actions.dirCreate(dirName);
        expect(fs.existsSync(newDirPath)).toBe(true);
        expect(fs.statSync(newDirPath).isDirectory()).toBe(true);
        expect(createdDir).toEqual(coreActionsObject.dir);
      });
    });

    it('should return directory actions when creating existing directories', () => {
      const dirName = 'new-dir';

      testDirActions((actions, { pathDirs }) => {
        const newDirPath = getDescribePath(...pathDirs, dirName);

        if (!fs.existsSync(newDirPath)) {
          fs.mkdirSync(newDirPath, { recursive: true });
        }

        const result = actions.dirCreate(dirName);
        expect(result).toEqual(coreActionsObject.dir);
      });
    });

    it('should return false when creating nested directories without recursive flag', () => {
      const dirName = 'nested-dir/new-dir';
      testDirActions((actions) => {
        const result = actions.dirCreate(dirName);
        expect(result).toBe(false);
      });
    });

    it('should create directories recursively', () => {
      const dirName = 'nested-dir/new-dir';

      testDirActions((actions, { pathDirs }) => {
        const newDirPath = getDescribePath(...pathDirs, dirName);
        expect(fs.existsSync(newDirPath)).toBe(false);

        const createdDir = actions.dirCreate(dirName, true);
        expect(fs.existsSync(newDirPath)).toBe(true);
        expect(fs.statSync(newDirPath).isDirectory()).toBe(true);
        expect(createdDir).toEqual(coreActionsObject.dir);
      });
    });
  });

  describe('dirDelete core directory action', () => {
    describeSetup(CoreDirActionsTest.DirDelete);

    it('should delete directories', () => {
      const dirName = 'new-dir';

      testDirActions((actions, { pathDirs }) => {
        const dirPath = getDescribePath(...pathDirs, dirName);
        fs.mkdirSync(dirPath, { recursive: true });
        expect(fs.existsSync(dirPath)).toBe(true);

        actions.dirDelete(dirName);
        expect(fs.existsSync(dirPath)).toBe(false);
      });
    });
  });

  describe('fileCreate core directory action', () => {
    describeSetup(CoreDirActionsTest.FileCreate);

    it('should create files', () => {
      const fileName = 'new-file';

      testDirActions((actions, { pathDirs }) => {
        const dirPath = getDescribePath(...pathDirs);
        const filePath = getDescribePath(...pathDirs, fileName);
        expect(fs.existsSync(filePath)).toBe(false);

        fs.mkdirSync(dirPath, { recursive: true });
        const createdFile = actions.fileCreate(fileName);

        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.statSync(filePath).isFile()).toBe(true);
        expect(createdFile).toEqual(coreActionsObject.file);
      });
    });

    it('should return file actions when creating existing files', () => {
      const fileName = 'new-file';

      testDirActions((actions, { pathDirs }) => {
        const dirPath = getDescribePath(...pathDirs);
        const filePath = getDescribePath(...pathDirs, fileName);

        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, '');

        const createdFile = actions.fileCreate(fileName);
        expect(createdFile).toEqual(coreActionsObject.file);
      });
    });

    it('should create a nested file in an existing folder', () => {
      const nestedDirs = ['nested-dir1', 'nested-dir2'];
      const nestedFile = nestedDirs.join('/') + '/new-file';

      testDirActions((actions, { pathDirs }) => {
        const nestedFilePath = getDescribePath(...pathDirs, nestedFile);
        const nestedDirPath = getDescribePath(...pathDirs, ...nestedDirs);
        expect(fs.existsSync(nestedFilePath)).toBe(false);

        fs.mkdirSync(nestedDirPath, { recursive: true });
        const createdFile = actions.fileCreate(nestedFile);

        expect(fs.existsSync(nestedFilePath)).toBe(true);
        expect(fs.statSync(nestedFilePath).isFile()).toBe(true);
        expect(createdFile).toEqual(coreActionsObject.file);
      });
    });

    it('should return false when creating a nested file in a non-existing folder', () => {
      testDirActions((actions) => {
        const result = actions.fileCreate('nested-dir/new-file');
        expect(result).toBe(false);
      });
    });
  });

  describe('fileDelete core directory action', () => {
    describeSetup(CoreDirActionsTest.FileDelete);

    it('should delete files', () => {
      const fileName = 'new-file';

      testDirActions((actions, { pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        const dirPath = getDescribePath(...pathDirs);

        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, '');
        expect(fs.existsSync(filePath)).toBe(true);

        actions.fileDelete(fileName);
        expect(fs.existsSync(filePath)).toBe(false);
      });
    });
  });

  describe('fileRead core directory action', () => {
    describeSetup(CoreDirActionsTest.FileRead);

    it('should read files', () => {
      const fileName = 'new-file';

      testDirActions((actions, { pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        const dirPath = getDescribePath(...pathDirs);
        fs.mkdirSync(dirPath, { recursive: true });

        fileDataArray.forEach((fileData) => {
          fs.writeFileSync(filePath, fileData);
          expect(actions.fileRead(fileName)).toBe(fileData);
        });
      });
    });

    it('should return null when reading a non-existent file', () => {
      testDirActions((actions) => {
        expect(actions.fileRead('non-existent')).toBe(null);
      });
    });
  });

  describe('fileWrite core directory action', () => {
    describeSetup(CoreDirActionsTest.FileWrite);

    it('should write to files', () => {
      const fileName = 'new-file';

      testDirActions((actions, { pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        const dirPath = getDescribePath(...pathDirs);
        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(filePath, '');

        fileDataArray.forEach((fileData) => {
          actions.fileWrite(fileName, fileData);
          const data = fs.readFileSync(filePath, 'utf-8');
          expect(data).toBe(fileData);
        });
      });
    });
  });

  describe('fileClear core directory action', () => {
    describeSetup(CoreDirActionsTest.FileClear);

    it('should clear file data', () => {
      const fileName = 'new-file';

      testDirActions((actions, { pathDirs }) => {
        const filePath = getDescribePath(...pathDirs, fileName);
        const dirPath = getDescribePath(...pathDirs);
        fs.mkdirSync(dirPath, { recursive: true });

        fileDataArray.forEach((fileData) => {
          fs.writeFileSync(filePath, fileData);
          actions.fileClear(fileName);
          const data = fs.readFileSync(filePath, 'utf-8');
          expect(data).toBe('');
        });
      });
    });
  });
});
