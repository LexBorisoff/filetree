import { beforeAll, beforeEach, describe, expect, it, suite } from 'vitest';

import { ActionError } from '@app/errors/action.errors.js';
import { FileTree } from '@app/main.js';
import { coreActions } from '@core-actions/core-actions.js';
import { testSetup } from '@test-setup';
import { tree } from '@test-utils/tree.js';

const { setup, testPath } = testSetup('file-tree', import.meta);

suite('FileTree - core properties', { concurrent: false }, () => {
  beforeAll(() => setup());

  let fileTree: FileTree<typeof tree>;

  beforeEach(() => {
    fileTree = new FileTree(testPath, tree);
  });

  it('should be defined', () => {
    expect(fileTree).toBeDefined();
    expect(fileTree).toBeInstanceOf(FileTree);
  });

  describe('fileTree instance properties', () => {
    it('should have correct instance properties', () => {
      expect(fileTree.tree).toBe(tree);
      expect(fileTree.rootPath).toBe(testPath);
    });
  });

  describe('use instance method', () => {
    it('should be defined', () => {
      expect(fileTree.use).toBeTypeOf('function');
    });

    it('should return undefined when target is invalid', () => {
      const actions = fileTree.use(coreActions);
      expect(() => actions(() => '')).toThrow(ActionError);
    });
  });
});
