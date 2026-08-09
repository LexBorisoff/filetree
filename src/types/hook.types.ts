import type {
  DirTargetInterface,
  FileTargetInterface,
  TreeInterface,
} from './tree.types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HookFn = (...args: any[]) => any;
export type HooksRecord = Record<string, HookFn | undefined>;

export type FileHooksFn<FileHooks extends HooksRecord> = (
  targetFile: FileTargetInterface,
) => FileHooks;

export type DirHooksFn<DirHooks extends HooksRecord> = (
  targetDir: DirTargetInterface<TreeInterface>,
) => DirHooks;
