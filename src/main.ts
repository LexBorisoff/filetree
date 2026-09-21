import {
  type DirObjectInterface,
  type FileObjectInterface,
  type FileProxyNode,
  type ProxyTree,
  type TreeInterface,
} from '@app-types/tree.types.js';

import { buildObjectTree } from './object-tree/build-object-tree.js';

import type {
  DirActionsFn,
  FileActionsFn,
  ActionsRecord,
} from '@app-types/action.types.js';

interface ActionsInterface<
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> {
  file?: FileActionsFn<FileActions>;
  dir?: DirActionsFn<DirActions>;
}

type TreeTarget = FileProxyNode | ProxyTree<TreeInterface>;
type TargetObject = FileObjectInterface | DirObjectInterface<TreeInterface>;

type MapActions<
  T extends readonly TreeTarget[],
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> = {
  [K in keyof T]: T[K] extends FileProxyNode
    ? FileActions
    : T[K] extends ProxyTree<TreeInterface>
      ? DirActions
      : never;
};

export type ActionsFn<
  Tree extends TreeInterface,
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> = <const TreeTargets extends TreeTarget | readonly TreeTarget[]>(
  cb: (tree: ProxyTree<Tree>) => TreeTargets,
) => TreeTargets extends FileProxyNode
  ? FileActions
  : TreeTargets extends ProxyTree<TreeInterface>
    ? DirActions
    : TreeTargets extends readonly TreeTarget[]
      ? MapActions<TreeTargets, FileActions, DirActions>
      : never;

function isTreeTargetArray(
  target: TreeTarget | readonly TreeTarget[],
): target is readonly TreeTarget[] {
  return Array.isArray(target);
}

const TARGET_SYM = Symbol('target');

function buildProxyTree<R extends TreeInterface>(
  rootTree: R,
  rootObjectTree: DirObjectInterface<R>,
): ProxyTree<R> {
  function traverse<T extends TreeInterface>(
    targetTree: T,
    targetObjectTree: DirObjectInterface<T>,
  ): ProxyTree<T> {
    return new Proxy(targetTree, {
      get(obj, prop: string, receiver) {
        const value = Reflect.get(obj, prop, receiver);
        if (typeof prop === 'symbol') return value;

        const child = targetObjectTree.children[prop];

        if (
          typeof value === 'object' &&
          value != null &&
          child.type === 'dir'
        ) {
          Object.defineProperty(value, TARGET_SYM, {
            value: child,
            writable: true,
          });
          return traverse(value, child);
        }

        if (typeof value === 'string' && child?.type === 'file') {
          const fileNode: FileProxyNode = { value };
          Object.defineProperty(fileNode, TARGET_SYM, {
            value: child,
            writable: true,
          });

          return fileNode;
        }

        return value;
      },
    }) as ProxyTree<T>;
  }

  return traverse(rootTree, rootObjectTree);
}

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
    type ActionsCb = (
      tree: ProxyTree<Tree>,
    ) => TreeTarget | readonly TreeTarget[];
    type ActionsReturn = FileActions | DirActions | null;

    const rootTree = this.#tree;
    const rootObjectTree = buildObjectTree(this.#rootPath, this.#tree);

    function getTargetObjects(cb: ActionsCb): TargetObject | TargetObject[] {
      const proxyTree = buildProxyTree(rootTree, rootObjectTree);
      const targets = cb(proxyTree);
      let targetObjects: TargetObject | TargetObject[] = [];

      if (isTreeTargetArray(targets)) {
        targets.forEach((target) => {
          targetObjects = [];
          targetObjects.push(
            target === proxyTree
              ? rootObjectTree
              : Object.getOwnPropertyDescriptor(target, TARGET_SYM)?.value,
          );
        });
      } else {
        targetObjects =
          targets === proxyTree
            ? rootObjectTree
            : Object.getOwnPropertyDescriptor(targets, TARGET_SYM)?.value;
      }

      return targetObjects;
    }

    function actions(cb: ActionsCb): ActionsReturn | ActionsReturn[] {
      const targetObjects = getTargetObjects(cb);

      if (Array.isArray(targetObjects)) {
        return targetObjects.map((targetObject) => {
          const { path, type } = targetObject;

          if (type === 'file') {
            return file?.({ type: 'file', path }) ?? null;
          }

          if (type === 'dir') {
            const { children } = targetObject;
            return dir?.({ type: 'dir', children, path }) ?? null;
          }

          return null;
        });
      }

      const { path, type } = targetObjects;

      if (type === 'file') {
        return file?.({ type: 'file', path }) ?? null;
      }

      if (type === 'dir') {
        const { children } = targetObjects;
        return dir?.({ type: 'dir', path, children }) ?? null;
      }

      return null;
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
