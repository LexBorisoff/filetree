import { expect, test } from 'vitest';

import { coreActions } from '@core-actions/core-actions.js';
import * as index from '@core-actions/index.js';

test('core actions index file', () => {
  const values = [coreActions];

  values.forEach((value) => {
    expect(Object.values(index).includes(value)).toBe(true);
  });

  Object.values(index).forEach((value) => {
    expect(values.includes(value)).toBe(true);
  });
});
