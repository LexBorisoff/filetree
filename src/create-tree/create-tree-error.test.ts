import path from 'node:path';
import url from 'node:url';

import { describe, expect, it } from 'vitest';

import { CreateTreeError } from './create-tree-error.js';

const TEST_NAME = 'file-core-actions';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const TEST_PATH = path.join(__dirname, `__test__${TEST_NAME}`);

describe('CreateTreeError error class', () => {
  let asDirReason: string;
  let asFileReason: string;

  const fileErrors = [
    new CreateTreeError('file', TEST_PATH),
    new CreateTreeError('file', TEST_PATH, 'testing'),
    new CreateTreeError('file', TEST_PATH, ({ pathExistsAsDir }) => {
      asDirReason = pathExistsAsDir;
      return pathExistsAsDir;
    }),
  ];

  const dirErrors = [
    new CreateTreeError('dir', TEST_PATH),
    new CreateTreeError('dir', TEST_PATH, 'testing'),
    new CreateTreeError('dir', TEST_PATH, ({ pathExistsAsFile }) => {
      asFileReason = pathExistsAsFile;
      return pathExistsAsFile;
    }),
  ];

  it('returns correct error type', () => {
    fileErrors.forEach((error) => {
      expect(error.type).toBe('file');
    });

    dirErrors.forEach((error) => {
      expect(error.type).toBe('dir');
    });
  });

  it('returns correct path', () => {
    [...fileErrors, ...dirErrors].forEach((error) => {
      expect(error.path).toBe(TEST_PATH);
    });
  });

  it('returns correct reason', () => {
    const fileReasons = [
      'Cannot create file',
      'Cannot create file: testing',
      `Cannot create file: ${asDirReason}`,
    ];

    const dirReasons = [
      'Cannot create directory',
      'Cannot create directory: testing',
      `Cannot create directory: ${asFileReason}`,
    ];

    fileErrors.forEach((error, i) => {
      expect(error.message).toBe(fileReasons[i]);
    });

    dirErrors.forEach((error, i) => {
      expect(error.message).toBe(dirReasons[i]);
    });
  });
});
