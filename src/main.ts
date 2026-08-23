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

type TreeTarget = FileType | TreeInterface;
type TargetObject = FileTargetInterface | DirTargetInterface<TreeInterface>;

type MapActions<
  T extends readonly TreeTarget[],
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> = {
  [K in keyof T]: T[K] extends FileType
    ? FileActions
    : T[K] extends TreeInterface
      ? DirActions
      : never;
};

export type ActionsFn<
  Tree extends TreeInterface,
  FileActions extends ActionsRecord,
  DirActions extends ActionsRecord,
> = <const TreeTargets extends TreeTarget | readonly TreeTarget[]>(
  cb: (tree: Tree) => TreeTargets,
) => TreeTargets extends FileType
  ? FileActions
  : TreeTargets extends TreeInterface
    ? DirActions
    : TreeTargets extends readonly TreeTarget[]
      ? MapActions<TreeTargets, FileActions, DirActions>
      : never;

function isTreeTargetArray(
  target: TreeTarget | readonly TreeTarget[],
): target is readonly TreeTarget[] {
  return Array.isArray(target);
}

interface CreateProxyTreeOptions {
  rootTree: TreeInterface;
  targetObjects: TargetObject[];
  index?: number;
}

function createProxyTree<T extends TreeInterface>(
  targetTree: T,
  targetObjectTree: DirTargetInterface<T>,
  { rootTree, targetObjects, index = -1 }: CreateProxyTreeOptions,
): T {
  return new Proxy(targetTree, {
    get(obj, prop: string) {
      // when root tree is accessed, a new target object should be added
      // to targetObjects array to enable working with tuple of targets
      // returned from actions callback
      if (rootTree === targetTree) index++;
      const targetObject = targetObjectTree.children[prop];
      targetObjects[index] = targetObject;

      if (
        typeof obj[prop] === 'object' &&
        obj[prop] != null &&
        targetObject.type === 'dir'
      ) {
        return createProxyTree(obj[prop], targetObject, {
          index,
          rootTree,
          targetObjects,
        });
      }

      return Reflect.get(obj, prop);
    },
  });
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
    type ActionsCb = (tree: Tree) => TreeTarget | readonly TreeTarget[];
    type ActionsReturn = FileActions | DirActions | null;

    const objectTree = buildObjectTree(this.#rootPath, this.#tree);
    const rootTree = this.#tree;

    function getTargets(cb: ActionsCb): {
      targets: TreeTarget | readonly TreeTarget[];
      targetObjects: TargetObject[];
    } {
      const targetObjects: TargetObject[] = [objectTree];
      const proxyTree = createProxyTree(rootTree, objectTree, {
        rootTree,
        targetObjects,
      });

      const targets = cb(proxyTree);

      // when tree root is returned from actions callback, proxyTree cannot intercept it,
      // thus root object tree must be manually inserted into targetObjects at target's index
      if (isTreeTargetArray(targets)) {
        targets.forEach((target, i) => {
          if (target === proxyTree) {
            targetObjects.splice(i, 0, objectTree);
          }
        });
      }

      return { targets, targetObjects };
    }

    function actions(cb: ActionsCb): ActionsReturn | ActionsReturn[] {
      const { targets, targetObjects } = getTargets(cb);

      if (isTreeTargetArray(targets)) {
        return targets.map((target, i) => {
          const targetObject = targetObjects[i];
          const { path, type } = targetObject;

          if (typeof target === 'string' && type === 'file') {
            return file?.({ type: 'file', path }) ?? null;
          }

          if (typeof target === 'object' && type === 'dir') {
            const { children } = targetObject;
            return dir?.({ type: 'dir', children, path }) ?? null;
          }

          return null;
        });
      }

      const [targetObject] = targetObjects;
      const { path, type } = targetObject;

      if (typeof targets === 'string' && type === 'file') {
        return file?.({ type: 'file', path }) ?? null;
      }

      if (typeof targets === 'object' && type === 'dir') {
        const { children } = targetObject;
        return dir?.({ type: 'dir', children, path }) ?? null;
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
