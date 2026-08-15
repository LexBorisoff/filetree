import { expect, test } from 'vitest';

import { ActionError } from '@app/errors/action.errors.js';

test('ActionError class', () => {
  const reason = 'testing';
  const error = new ActionError(reason);

  expect(error).toBeDefined();
  expect(error).toBeInstanceOf(ActionError);
  expect(error.message).toBe(reason);
});
