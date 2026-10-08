import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { readFile } from './read-file.js';

const KEEP_TEST_FOLDER: boolean = process.env.KEEP_TEST_FOLDER === 'true';

const TEST_NAME = 'read-file';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const TEST_PATH = path.join(__dirname, `__test__${TEST_NAME}`);

function getTestPath(...args: readonly string[]): string {
  return path.join(TEST_PATH, ...args);
}

function deleteTestDir(...dirs: readonly string[]): void {
  fs.rmSync(getTestPath(...dirs), { force: true, recursive: true });
}

describe('readFile function', () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_PATH)) {
      deleteTestDir();
    }
    fs.mkdirSync(TEST_PATH);

    return function cleanup() {
      if (!KEEP_TEST_FOLDER) {
        deleteTestDir();
      }
    };
  });

  beforeEach(({ task }) => {
    const CURRENT_TEST_PATH = getTestPath(task.id);

    if (fs.existsSync(CURRENT_TEST_PATH)) {
      deleteTestDir(task.id);
    }
    fs.mkdirSync(CURRENT_TEST_PATH);
  });

  it('reads a file', ({ task }) => {
    const filePath = getTestPath(task.id, 'file');
    const fileData = 'File data';

    fs.writeFileSync(filePath, fileData);
    expect(readFile(filePath)).toBe(fileData);
  });

  it('returns null if file does not exist', () => {
    const filePath = getTestPath('no-file');
    expect(readFile(filePath)).toBe(null);
  });

  it('returns null if fails to read file', ({ task }) => {
    const filePath = getTestPath(task.id, 'file');
    fs.mkdirSync(filePath);
    expect(readFile(filePath)).toBe(null);
  });
});
