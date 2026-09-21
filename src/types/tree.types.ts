export type FileType = string;

export interface TreeInterface {
  [key: string]: FileType | TreeInterface;
}

export interface PathInterface {
  path: string;
}

export interface FileObjectInterface extends PathInterface {
  type: 'file';
}

export interface DirObjectInterface<Tree extends TreeInterface>
  extends PathInterface {
  type: 'dir';
  children: ObjectTreeType<Tree>;
}

export type ObjectTreeType<Tree extends TreeInterface> = {
  [key in keyof Tree]: Tree[key] extends FileType
    ? FileObjectInterface
    : Tree[key] extends TreeInterface
      ? DirObjectInterface<Tree[key]>
      : never;
};

export interface FileProxyNode {
  readonly value: string;
}

export type ProxyTree<Tree extends TreeInterface> = {
  [key in keyof Tree]: Tree[key] extends FileType
    ? FileProxyNode
    : Tree[key] extends TreeInterface
      ? ProxyTree<Tree[key]>
      : Tree[key];
};
