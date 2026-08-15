import type {
  DirTargetInterface,
  FileTargetInterface,
  TreeInterface,
} from './tree.types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionFn = (...args: any[]) => any;
export type ActionsRecord = Record<string, ActionFn | undefined>;

export type FileActionsFn<FileActions extends ActionsRecord> = (
  targetFile: FileTargetInterface,
) => FileActions;

export type DirActionsFn<DirActions extends ActionsRecord> = (
  targetDir: DirTargetInterface<TreeInterface>,
) => DirActions;
