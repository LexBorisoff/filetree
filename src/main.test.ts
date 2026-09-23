import { expect, it, beforeEach, describe, suite, vi } from 'vitest';

import { FileTree } from './main.js';
import * as objectTreeModule from './object-tree/build-object-tree.js';

import type { ActionsRecord } from '@app-types/action.types.js';
import type {
  DirObjectInterface,
  ObjectTreeType,
  TreeInterface,
} from '@app-types/tree.types.js';

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
    // accessing from root
    let file = actions((root) => root.file1);
    expect(file).toBeDefined();
    expect(file).toBe(fileActions);

    file = actions((root) => root.dir1['file2.txt']);
    expect(file).toBeDefined();
    expect(file).toBe(fileActions);

    file = actions((root) => root.dir1.dir2['file3.md']);
    expect(file).toBeDefined();
    expect(file).toBe(fileActions);

    // destructuring
    file = actions(({ file1 }) => file1);
    expect(file).toBeDefined();
    expect(file).toBe(fileActions);

    file = actions(({ dir1 }) => dir1['file2.txt']);
    expect(file).toBeDefined();
    expect(file).toBe(fileActions);

    file = actions(({ dir1: { 'file2.txt': file2 } }) => file2);
    expect(file).toBeDefined();
    expect(file).toBe(fileActions);
  });

  it('should return single dir actions', () => {
    // accessing from root
    let dir = actions((root) => root);
    expect(dir).toBeDefined();
    expect(dir).toBe(dirActions);

    dir = actions((root) => root.dir1);
    expect(dir).toBeDefined();
    expect(dir).toBe(dirActions);

    dir = actions((root) => root.dir1.dir2);
    expect(dir).toBeDefined();
    expect(dir).toBe(dirActions);

    // destructuring
    dir = actions(({ dir1 }) => dir1);
    expect(dir).toBeDefined();
    expect(dir).toBe(dirActions);

    dir = actions(({ dir1: { dir2 } }) => dir2);
    expect(dir).toBeDefined();
    expect(dir).toBe(dirActions);
  });

  it('should return a tuple of file and dir actions', () => {
    // accessing from root
    let [r, f1, d1, f2, d2, f3] = actions((root) => [
      root,
      root.file1,
      root.dir1,
      root.dir1['file2.txt'],
      root.dir1.dir2,
      root.dir1.dir2['file3.md'],
    ]);

    expect(f1).toBe(fileActions);
    expect(f2).toBe(fileActions);
    expect(f3).toBe(fileActions);

    expect(r).toBe(dirActions);
    expect(d1).toBe(dirActions);
    expect(d2).toBe(dirActions);

    // destructuring
    [f1, d1] = actions(({ dir1, file1 }) => [file1, dir1]);
    expect(f1).toBe(fileActions);
    expect(d1).toBe(dirActions);

    [f2, d2] = actions(({ dir1: { dir2, 'file2.txt': file2 } }) => [
      file2,
      dir2,
    ]);
    expect(f2).toBe(fileActions);
    expect(d2).toBe(dirActions);
  });

  it('should return null when actions are not set', () => {
    // accessing from root
    let r = noActions((root) => root);
    let f1 = noActions((root) => root.file1);
    let f2 = noActions((root) => root.dir1['file2.txt']);
    let f3 = noActions((root) => root.dir1.dir2['file3.md']);
    let d1 = noActions((root) => root.dir1);
    let d2 = noActions((root) => root.dir1.dir2);
    expect(f1).toBeNull();
    expect(f2).toBeNull();
    expect(f3).toBeNull();
    expect(r).toBeNull();
    expect(d1).toBeNull();
    expect(d2).toBeNull();

    [r, f1, d1, f2, d2, f3] = noActions((root) => [
      root,
      root.file1,
      root.dir1,
      root.dir1['file2.txt'],
      root.dir1.dir2,
      root.dir1.dir2['file3.md'],
    ]);
    expect(f1).toBeNull();
    expect(f2).toBeNull();
    expect(f3).toBeNull();
    expect(r).toBeNull();
    expect(d1).toBeNull();
    expect(d2).toBeNull();

    // destructuring
    f1 = noActions(({ file1 }) => file1);
    d1 = noActions(({ dir1 }) => dir1);
    expect(f1).toBeNull();
    expect(f1).toBeNull();

    f2 = noActions(({ dir1: { 'file2.txt': file2 } }) => file2);
    d2 = noActions(({ dir1: { dir2 } }) => dir2);
    expect(f2).toBeNull();
    expect(d2).toBeNull();

    [f1, d1] = noActions(({ file1, dir1 }) => [file1, dir1]);
    expect(f1).toBeNull();
    expect(d1).toBeNull();

    [f2, d2] = noActions(({ dir1: { 'file2.txt': file2, dir2 } }) => [
      file2,
      dir2,
    ]);
    expect(f2).toBeNull();
    expect(d2).toBeNull();
  });

  it('should return null when accessing invalid tree property', () => {
    let invalid = actions(() => ({ value: '' }));
    expect(invalid).toBeNull();

    [invalid] = actions(() => [{ value: '' }]);
    expect(invalid).toBeNull();
  });
});

suite('using actions', () => {
  const rootPath = '/path/to/root';
  const f1Path = rootPath + '/file1';
  const f2Path = rootPath + '/dir1/file2.txt';
  const f3Path = rootPath + '/dir1/dir2/file3.md';
  const d1Path = rootPath + '/dir1';
  const d2Path = rootPath + '/dir1/dir2';

  const tree = {
    file1: 'File 1 data',
    dir1: {
      ['file2.txt']: 'File 2 data',
      dir2: {
        ['file3.md']: 'File 3 data',
      },
    },
  } satisfies TreeInterface;

  const fileTree = new FileTree(rootPath, tree);

  describe('using file actions', () => {
    const fileActions = FileTree.fileActions((file) => ({
      getFileType() {
        return file.type;
      },
      getFilePath() {
        return file.path;
      },
    }));
    const actions = fileTree.use({ file: fileActions });

    it('should return type "file"', () => {
      // accessing from root
      let f1 = actions((root) => root.file1);
      let f2 = actions((root) => root.dir1['file2.txt']);
      expect(f1.getFileType()).toBe('file');
      expect(f2.getFileType()).toBe('file');

      // destructuring
      [f1, f2] = actions(({ file1, dir1 }) => [file1, dir1['file2.txt']]);
      expect(f1.getFileType()).toBe('file');
      expect(f2.getFileType()).toBe('file');

      [f2] = actions(({ dir1: { 'file2.txt': file2 } }) => [file2]);
      expect(f2.getFileType()).toBe('file');
    });

    it('should return file path', () => {
      // accessing from root
      let f1 = actions((root) => root.file1);
      let f2 = actions((root) => root.dir1['file2.txt']);
      expect(f1.getFilePath()).toBe(f1Path);
      expect(f2.getFilePath()).toBe(f2Path);

      // destructuring
      [f1, f2] = actions(({ file1, dir1 }) => [file1, dir1['file2.txt']]);
      [f2] = actions(({ dir1: { 'file2.txt': file2 } }) => [file2]);
      expect(f1.getFilePath()).toBe(f1Path);
      expect(f2.getFilePath()).toBe(f2Path);

      [f2] = actions(({ dir1: { 'file2.txt': file2 } }) => [file2]);
      expect(f2.getFilePath()).toBe(f2Path);
    });

    it('should return null when tree file is invalid', () => {
      const sym = Symbol();
      const invalidFileTree = new FileTree(rootPath, {
        file1: 123 as unknown as string,
        [sym]: '',
      });
      const invalidActions = invalidFileTree.use({ file: fileActions });

      // accessing from root
      let f1 = invalidActions((root) => root.file1);
      let f2 = invalidActions((root) => root[sym]);
      expect(f1).toBeNull();
      expect(f2).toBeNull();

      [f1, f2] = invalidActions((root) => [root.file1, root[sym]]);
      expect(f1).toBeNull();
      expect(f2).toBeNull();

      // destructuring
      f1 = invalidActions(({ file1 }) => file1);
      f2 = invalidActions(({ [sym]: file2 }) => file2);
      expect(f1).toBeNull();
      expect(f2).toBeNull();

      [f1, f2] = invalidActions(({ file1, [sym]: file2 }) => [file1, file2]);
      expect(f1).toBeNull();
      expect(f2).toBeNull();
    });

    it('should return null when type is not "file"', () => {
      const invalidResult: DirObjectInterface<typeof tree> = {
        type: 'dir',
        path: rootPath,
        children: {
          file1: { type: 'invalid' as 'file', path: f1Path },
          dir1: {
            type: 'dir',
            path: d1Path,
            children: {
              'file2.txt': { type: 'invalid' as 'file', path: f2Path },
              dir2: {
                type: 'dir',
                path: d2Path,
                children: {
                  'file3.md': { type: 'invalid' as 'file', path: f3Path },
                },
              },
            },
          },
        },
      };

      const spy = vi
        .spyOn(objectTreeModule, 'buildObjectTree')
        .mockReturnValue(invalidResult);

      const invalidActions = fileTree.use({ file: fileActions });

      // accessing from root
      let f1 = invalidActions((root) => root.file1);
      let f2 = invalidActions((root) => root.dir1['file2.txt']);
      let f3 = invalidActions((root) => root.dir1.dir2['file3.md']);
      expect(f1).toBeNull();
      expect(f2).toBeNull();
      expect(f3).toBeNull();

      [f1, f2, f3] = invalidActions((root) => [
        root.file1,
        root.dir1['file2.txt'],
        root.dir1.dir2['file3.md'],
      ]);
      expect(f1).toBeNull();
      expect(f2).toBeNull();
      expect(f3).toBeNull();

      // destructuring
      [f1, f2] = invalidActions(({ file1, dir1 }) => [
        file1,
        dir1['file2.txt'],
      ]);
      expect(f1).toBeNull();
      expect(f2).toBeNull();

      [f2] = invalidActions(({ dir1: { 'file2.txt': file2 } }) => [file2]);
      expect(f2).toBeNull();

      spy.mockRestore();
    });
  });

  describe('using dir actions', () => {
    const dirActions = FileTree.dirActions((dir) => ({
      getDirType() {
        return dir.type;
      },
      getDirPath() {
        return dir.path;
      },
      getDirChildren() {
        return dir.children;
      },
    }));
    const actions = fileTree.use({ dir: dirActions });

    it('should return type "dir"', () => {
      // accessing from root
      const r = actions((root) => root);
      let d1 = actions((root) => root.dir1);
      let d2 = actions((root) => root.dir1.dir2);

      expect(r.getDirType()).toBe('dir');
      expect(d1.getDirType()).toBe('dir');
      expect(d2.getDirType()).toBe('dir');

      // destructuring
      [d1, d2] = actions(({ dir1 }) => [dir1, dir1.dir2]);
      expect(d1.getDirType()).toBe('dir');
      expect(d2.getDirType()).toBe('dir');

      [d2] = actions(({ dir1: { dir2 } }) => [dir2]);
      expect(d2.getDirType()).toBe('dir');
    });

    it('should return dir path', () => {
      // accessing from root
      let r = actions((root) => root);
      let d1 = actions((root) => root.dir1);
      let d2 = actions((root) => root.dir1.dir2);
      expect(r.getDirPath()).toBe(rootPath);
      expect(d1.getDirPath()).toBe(d1Path);
      expect(d2.getDirPath()).toBe(d2Path);

      [r, d1, d2] = actions((root) => [root, root.dir1, root.dir1.dir2]);
      expect(r.getDirPath()).toBe(rootPath);
      expect(d1.getDirPath()).toBe(d1Path);
      expect(d2.getDirPath()).toBe(d2Path);

      // destructuring
      [d1, d2] = actions(({ dir1 }) => [dir1, dir1.dir2]);
      expect(d1.getDirPath()).toBe(d1Path);
      expect(d2.getDirPath()).toBe(d2Path);

      [d2] = actions(({ dir1: { dir2 } }) => [dir2]);
      expect(d2.getDirPath()).toBe(d2Path);
    });

    it('should return dir children', () => {
      const d2Children: ObjectTreeType<(typeof tree)['dir1']['dir2']> = {
        'file3.md': { type: 'file', path: f3Path },
      };

      const d1Children: ObjectTreeType<(typeof tree)['dir1']> = {
        'file2.txt': { type: 'file', path: f2Path },
        dir2: { type: 'dir', path: d2Path, children: d2Children },
      };

      const rootChildren: ObjectTreeType<typeof tree> = {
        file1: { type: 'file', path: f1Path },
        dir1: { type: 'dir', path: d1Path, children: d1Children },
      };

      // accessing from root
      let r = actions((root) => root);
      let d1 = actions((root) => root.dir1);
      let d2 = actions((root) => root.dir1.dir2);
      expect(r.getDirChildren()).toEqual(rootChildren);
      expect(d1.getDirChildren()).toEqual(d1Children);
      expect(d2.getDirChildren()).toEqual(d2Children);

      [r, d1, d2] = actions((root) => [root, root.dir1, root.dir1.dir2]);
      expect(r.getDirChildren()).toEqual(rootChildren);
      expect(d1.getDirChildren()).toEqual(d1Children);
      expect(d2.getDirChildren()).toEqual(d2Children);

      // destructuring
      [d1, d2] = actions(({ dir1 }) => [dir1, dir1.dir2]);
      expect(d1.getDirChildren()).toEqual(d1Children);
      expect(d2.getDirChildren()).toEqual(d2Children);

      [d2] = actions(({ dir1: { dir2 } }) => [dir2]);
      expect(d2.getDirChildren()).toEqual(d2Children);
    });

    it('should return null when type is not "dir"', () => {
      const localTree = {
        dir1: { dir2: {} },
      } satisfies TreeInterface;

      const invalidResult: DirObjectInterface<typeof localTree> = {
        type: 'invalid' as 'dir',
        path: '',
        children: {
          dir1: {
            type: 'invalid' as 'dir',
            path: '',
            children: {
              dir2: {
                type: 'invalid' as 'dir',
                path: '',
                children: {},
              },
            },
          },
        },
      };

      const spy = vi
        .spyOn(objectTreeModule, 'buildObjectTree')
        .mockReturnValueOnce(invalidResult);

      const localFileTree = new FileTree('/', localTree);
      const invalidActions = localFileTree.use({ dir: () => ({}) });

      // accessing from root
      let r = invalidActions((root) => root);
      let d1 = invalidActions((root) => root.dir1);
      let d2 = invalidActions((root) => root.dir1.dir2);
      expect(r).toBeNull();
      expect(d1).toBeNull();
      expect(d2).toBeNull();

      [r, d1, d2] = invalidActions((root) => [root, root.dir1, root.dir1.dir2]);
      expect(r).toBeNull();
      expect(d1).toBeNull();
      expect(d2).toBeNull();

      // destructuring
      d1 = invalidActions(({ dir1 }) => dir1);
      d1 = invalidActions(({ dir1: { dir2 } }) => dir2);
      expect(d1).toBeNull();
      expect(d2).toBeNull();

      [d1, d2] = invalidActions(({ dir1 }) => [dir1, dir1.dir2]);
      expect(d1).toBeNull();
      expect(d2).toBeNull();

      [d2] = invalidActions(({ dir1: { dir2 } }) => [dir2]);
      expect(d2).toBeNull();

      spy.mockRestore();
    });
  });
});
