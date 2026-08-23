import { expect, it, beforeEach, describe } from 'vitest';

import { FileTree } from './main.js';

import type { ActionsRecord } from '@app-types/action.types.js';
import type { TreeInterface } from '@app-types/tree.types.js';

describe('FileTree instance', () => {
  const rootPath = '/path/to/root';
  const tree = {} satisfies TreeInterface;
  let fileTree: FileTree<typeof tree>;

  beforeEach(() => {
    fileTree = new FileTree(rootPath, tree);
  });

  it('should be defined ', () => {
    expect(fileTree).toBeDefined();
    expect(fileTree).toBeInstanceOf(FileTree);
  });

  it('should have correct tree property value', () => {
    expect(fileTree.tree).toBe(tree);
  });

  it('should have correct rootPath property value', () => {
    expect(fileTree.rootPath).toBe(rootPath);
  });
});

describe('.fileActions static method', () => {
  const fn = (): ActionsRecord => ({});
  const fileActions = FileTree.fileActions(fn);

  it('should return a function', () => {
    expect(fileActions).toBeDefined();
    expect(fileActions).toBeTypeOf('function');
  });

  it('should return its argument', () => {
    expect(fileActions).toBe(fn);
  });
});

describe('.dirActions static method', () => {
  const fn = (): ActionsRecord => ({});
  const dirActions = FileTree.dirActions(fn);

  it('should return a function', () => {
    expect(dirActions).toBeDefined();
    expect(dirActions).toBeTypeOf('function');
  });

  it('should return its argument', () => {
    expect(dirActions).toBe(fn);
  });
});

describe('.use instance method', () => {
  const rootPath = '/path/to/root';
  const tree = {} satisfies TreeInterface;
  let fileTree: FileTree<typeof tree>;

  beforeEach(() => {
    fileTree = new FileTree(rootPath, tree);
  });

  it('should be a method', () => {
    expect(fileTree.use).toBeTypeOf('function');
  });

  it('should return a function', () => {
    const actions = fileTree.use({});
    expect(actions).toBeDefined();
    expect(actions).toBeTypeOf('function');
  });
});

describe('actions returned from .use instance method', () => {
  const tree = {
    file1: 'File 1 data',
    dir1: {
      ['file2.txt']: 'File 2 data',
      dir2: {
        ['file3.md']: 'File 3 data',
      },
    },
  } satisfies TreeInterface;
  const fileTree = new FileTree('', tree);

  const fileActions = { testFileAction(): void {} };
  const dirActions = { testDirAction(): void {} };

  const actions = fileTree.use({
    file: () => fileActions,
    dir: () => dirActions,
  });
  const noActions = fileTree.use({});

  it('should return single file actions', () => {
    const file1 = actions((root) => root.file1);
    expect(file1).toBeDefined();
    expect(file1).toBe(fileActions);

    const file2 = actions((root) => root.dir1['file2.txt']);
    expect(file2).toBeDefined();
    expect(file2).toBe(fileActions);

    const file3 = actions((root) => root.dir1.dir2['file3.md']);
    expect(file3).toBeDefined();
    expect(file3).toBe(fileActions);
  });

  it('should return single dir actions', () => {
    const rootDir = actions((root) => root);
    expect(rootDir).toBeDefined();
    expect(rootDir).toBe(dirActions);

    const dir1 = actions((root) => root.dir1);
    expect(dir1).toBeDefined();
    expect(dir1).toBe(dirActions);

    const dir2 = actions((root) => root.dir1.dir2);
    expect(dir2).toBeDefined();
    expect(dir2).toBe(dirActions);
  });

  it('should return a tuple of file and dir actions', () => {
    const [rootDir, file1, dir1, file2, dir2, file3] = actions((root) => [
      root,
      root.file1,
      root.dir1,
      root.dir1['file2.txt'],
      root.dir1.dir2,
      root.dir1.dir2['file3.md'],
    ]);

    expect(file1).toBe(fileActions);
    expect(file2).toBe(fileActions);
    expect(file3).toBe(fileActions);

    expect(rootDir).toBe(dirActions);
    expect(dir1).toBe(dirActions);
    expect(dir2).toBe(dirActions);
  });

  it('should return null when actions are not set', () => {
    let rootDir = noActions((root) => root);
    let file1 = noActions((root) => root.file1);
    let file2 = noActions((root) => root.dir1['file2.txt']);
    let file3 = noActions((root) => root.dir1.dir2['file3.md']);
    let dir1 = noActions((root) => root.dir1);
    let dir2 = noActions((root) => root.dir1.dir2);

    expect(file1).toBeNull();
    expect(file2).toBeNull();
    expect(file3).toBeNull();

    expect(rootDir).toBeNull();
    expect(dir1).toBeNull();
    expect(dir2).toBeNull();

    [rootDir, file1, dir1, file2, dir2, file3] = noActions((root) => [
      root,
      root.file1,
      root.dir1,
      root.dir1['file2.txt'],
      root.dir1.dir2,
      root.dir1.dir2['file3.md'],
    ]);

    expect(file1).toBeNull();
    expect(file2).toBeNull();
    expect(file3).toBeNull();

    expect(rootDir).toBeNull();
    expect(dir1).toBeNull();
    expect(dir2).toBeNull();
  });

  it('should return null when accessing invalid tree property', () => {
    let invalid = actions(() => '');
    expect(invalid).toBeNull();

    [invalid] = actions(() => ['']);
    expect(invalid).toBeNull();
  });
});
