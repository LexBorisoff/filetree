import { dirActions } from './dir-actions.js';
import { fileActions } from './file-actions.js';

export const coreActions = {
  file: fileActions,
  dir: dirActions,
} as const;
