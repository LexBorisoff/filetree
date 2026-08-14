import { ActionError } from '@errors/action.errors.js';

import { buildObjectTree } from './object-tree/build-object-tree.js';

import type {
  DirActionsFn,
  FileActionsFn,
  ActionsRecord,
} from '@app-types/action.types.js';
import type {
  DirTargetInterface,
  FileTargetInterface,
  FileType,
  TreeInterface,
} from '@app-types/tree.types.js';

interface ActionsInterface<
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> {
  file?: FileActionsFn<FileActions>;
  dir?: DirActionsFn<DirActions>;
}

export type ActionsFn<
  Tree extends TreeInterface,
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> = <TreeTarget extends FileType | TreeInterface>(
  cb: (tree: Tree) => TreeTarget,
) => TreeTarget extends FileType
  ? FileActions
  : TreeTarget extends TreeInterface
    ? DirActions
    : never;

export class FileTree<Tree extends TreeInterface> {
  #tree: Tree;

  #rootPath: string;

  constructor(rootPath: string, tree: Tree) {
    this.#rootPath = rootPath;
    this.#tree = tree;
  }

  get tree(): Tree {
    return this.#tree;
  }

  get rootPath(): string {
    return this.#rootPath;
  }

  use<FileActions extends ActionsRecord, DirActions extends ActionsRecord>({
    file,
    dir,
  }: ActionsInterface<FileActions, DirActions> = {}): ActionsFn<
    Tree,
    FileActions,
    DirActions
  > {
    type Actions = ActionsFn<Tree, FileActions, DirActions>;
    type ActionsCb = Parameters<Actions>[0];
    type ActionsResult = ReturnType<Actions> | undefined;
    type TreeTarget = FileType | TreeInterface;
    type TargetObject = FileTargetInterface | DirTargetInterface<TreeInterface>;

    const objectTree = buildObjectTree(this.#rootPath, this.#tree);
    const tree = this.#tree;

    function getTarget(cb: ActionsCb): {
      target: TreeTarget;
      targetObject: TargetObject;
    } {
      let targetObject: TargetObject = objectTree;

      function createProxyTree<T extends TreeInterface>(
        targetTree: T,
        targetObjectTree: DirTargetInterface<T>,
      ): T {
        return new Proxy(targetTree, {
          get(obj, prop: string) {
            targetObject = targetObjectTree.children[prop];

            if (
              typeof obj[prop] === 'object' &&
              obj[prop] != null &&
              targetObject.type === 'dir'
            ) {
              return createProxyTree(obj[prop], targetObject);
            }

            return Reflect.get(obj, prop);
          },
        });
      }

      const proxyTree = createProxyTree(tree, objectTree);
      const target = cb(proxyTree);

      return { target, targetObject };
    }

    function actions(cb: ActionsCb): ActionsResult {
      const { target, targetObject } = getTarget(cb);
      const { path } = targetObject;

      if (typeof target === 'string' && targetObject.type === 'file') {
        return file?.({ type: 'file', path });
      }

      if (typeof target === 'object' && targetObject.type === 'dir') {
        const { children } = targetObject;
        return dir?.({ type: 'dir', children, path });
      }

      throw new ActionError('Invalid tree target');
    }

    return actions as Actions;
  }

  static fileActions<
    FileActions extends ActionsRecord,
    Fn extends FileActionsFn<FileActions>,
  >(fn: Fn): Fn {
    return fn;
  }

  static dirActions<
    DirActions extends ActionsRecord,
    Fn extends DirActionsFn<DirActions>,
  >(fn: Fn): Fn {
    return fn;
  }
}
