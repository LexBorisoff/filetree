/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect } from 'vitest';

/**
 * Expects the provided object's methods to be any function
 */
export function anyFunction(obj: object): object {
  let result: object = {};

  function convertValue<T>(value: T): any {
    if (value instanceof Function) {
      return expect.any(Function);
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return anyFunction(value);
    }

    if (Array.isArray(value)) {
      return value.map((i) => convertValue(i));
    }

    return value;
  }

  Object.entries(obj).forEach(([key, value]) => {
    result = {
      ...result,
      [key]: convertValue(value),
    };
  });

  return result;
}
