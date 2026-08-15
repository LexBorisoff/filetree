import { expect, test } from 'vitest';

import { createTree } from '@app/create-tree/create-tree.js';
import * as index from '@app/index.js';
import { FileTree } from '@app/main.js';

test('file manager index file', () => {
  const values = [FileTree, createTree];

  values.forEach((value) => {
    expect(Object.values(index).includes(value)).toBe(true);
  });

  Object.values(index).forEach((value) => {
    expect(values.includes(value)).toBe(true);
  });
});
