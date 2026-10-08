import { buildObjectTree } from './object-tree/build-object-tree.js';

import type {
  DirActionsFn,
  FileActionsFn,
  ActionsRecord,
} from '@app-types/action.types.js';
import type {
  DirObjectInterface,
  FileObjectInterface,
  ProxyFileNode,
  ProxyTree,
  TreeInterface,
} from '@app-types/tree.types.js';

interface ActionsInterface<
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> {
  file?: FileActionsFn<FileActions>;
  dir?: DirActionsFn<DirActions>;
}

type ProxyTreeTarget = ProxyFileNode | ProxyTree<TreeInterface>;
type TargetObject =
  | FileObjectInterface
  | DirObjectInterface<TreeInterface>
  | undefined;

type ActionsTuple<
  T extends readonly ProxyTreeTarget[],
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> = {
  [K in keyof T]: T[K] extends ProxyFileNode
    ? FileActions
    : T[K] extends ProxyTree<TreeInterface>
      ? DirActions
      : never;
};

export type ActionsFn<
  Tree extends TreeInterface,
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> = <const TreeTargets extends ProxyTreeTarget | readonly ProxyTreeTarget[]>(
  cb: (tree: ProxyTree<Tree>) => TreeTargets,
) => TreeTargets extends ProxyFileNode
  ? FileActions
  : TreeTargets extends ProxyTree<TreeInterface>
    ? DirActions
    : TreeTargets extends readonly ProxyTreeTarget[]
      ? ActionsTuple<TreeTargets, FileActions, DirActions>
      : never;

function isTreeTargetArray(
  target: ProxyTreeTarget | readonly ProxyTreeTarget[],
): target is readonly ProxyTreeTarget[] {
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
    const proxy = new Proxy(targetTree, {
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
          const fileNode: ProxyFileNode = { value };
          Object.defineProperty(fileNode, TARGET_SYM, {
            value: child,
            writable: true,
          });

          return fileNode;
        }

        return value;
      },
    });

    return proxy as unknown as ProxyTree<T>;
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
  }: ActionsInterface<FileActions, DirActions>): ActionsFn<
    Tree,
    FileActions,
    DirActions
  > {
    type Actions = ActionsFn<Tree, FileActions, DirActions>;
    type ActionsCb = (
      tree: ProxyTree<Tree>,
    ) => ProxyTreeTarget | readonly ProxyTreeTarget[];
    type ActionsReturn = FileActions | DirActions | null;

    const rootTree = this.#tree;
    const rootObjectTree = buildObjectTree(this.#rootPath, this.#tree);

    function getTargetObjects(
      cb: ActionsCb,
    ): TargetObject | TargetObject[] | undefined {
      const proxyTree = buildProxyTree(rootTree, rootObjectTree);
      const targets = cb(proxyTree);
      let targetObjects: TargetObject | TargetObject[] = [];

      if (isTreeTargetArray(targets)) {
        targetObjects = targets.map((target) =>
          target === proxyTree
            ? rootObjectTree
            : Object.getOwnPropertyDescriptor(target, TARGET_SYM)?.value,
        );
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
          if (targetObject == null) return null;

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

      if (targetObjects == null) return null;

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
