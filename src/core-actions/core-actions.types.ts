import type { coreActions } from './core-actions.js';
import type {
  DirActionsFn,
  FileActionsFn,
  ActionsRecord,
} from '@app-types/action.types.js';

export type FileActionsType<Fn extends FileActionsFn<ActionsRecord>> =
  Fn extends FileActionsFn<infer H> ? H : ActionsRecord;

export type DirActionsType<Fn extends DirActionsFn<ActionsRecord>> =
  Fn extends DirActionsFn<infer H> ? H : ActionsRecord;

export type CoreActionsType = {
  file: FileActionsType<typeof coreActions.file>;
  dir: DirActionsType<typeof coreActions.dir>;
};
