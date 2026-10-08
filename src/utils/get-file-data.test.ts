import { afterEach, describe, expect, it, vi } from 'vitest';

import { getFileData } from './get-file-data.js';

describe('getFileData function', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns same data for string and ArrayBufferView', () => {
    const data1 = 'File data 1';
    const data2 = new DataView(new ArrayBuffer(16));

    expect(getFileData(data1)).toBe(data1);
    expect(getFileData(data2)).toBe(data2);
  });

  it('stringifies non-string and non-ArrayBufferView data', () => {
    const spy = vi.spyOn(JSON, 'stringify');
    const data = [1, true, null, undefined, {}, function temp() {}];

    data.forEach((d, i) => {
      getFileData(d);
      expect(spy).toHaveBeenNthCalledWith(i + 1, d);
    });
  });
});
