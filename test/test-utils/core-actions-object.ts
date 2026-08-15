import { expect } from 'vitest';

import type { CoreActionsType } from '@core-actions/core-actions.types.js';

type ActionsObjectType<T extends object> = Record<
  keyof T,
  ReturnType<typeof expect.any>
>;

function buildActionsObject<T extends object>(
  methodNames: (keyof T)[],
): ActionsObjectType<T> {
  return methodNames.reduce<T>(
    (acc, method) => ({ ...acc, [method]: expect.any(Function) }),
    {} as T,
  );
}

const fileActionMethods: (keyof CoreActionsType['file'])[] = [
  'clear',
  'getPath',
  'read',
  'write',
];

const dirActionMethods: (keyof CoreActionsType['dir'])[] = [
  'dirCreate',
  'dirDelete',
  'exists',
  'fileClear',
  'fileCreate',
  'fileDelete',
  'fileRead',
  'fileWrite',
  'getPath',
];

export const coreActionsObject = {
  file: buildActionsObject(fileActionMethods),
  dir: buildActionsObject(dirActionMethods),
};
