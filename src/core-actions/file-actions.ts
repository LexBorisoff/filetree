import fs from 'node:fs';

import { getFileData } from '@utils/get-file-data.js';
import { readFile } from '@utils/read-file.js';

import { FileTree } from '../main.js';

export const fileActions = FileTree.fileActions((targetFile) => ({
  /**
   * Returns the path of the target file.
   */
  getPath(): string {
    return targetFile.path;
  },

  /**
   * Reads the contents of the target file.
   *
   * @returns
   * - file data as a `string`
   * - `null` if the file cannot be read
   */
  read(): string | null {
    return readFile(targetFile.path);
  },

  /**
   * Writes data to the target file.
   *
   * @param data data string to write
   */
  write<Data>(data: Data): void {
    fs.writeFileSync(targetFile.path, getFileData(data));
  },

  /**
   * Clears the contents of the target file.
   */
  clear(): void {
    this.write('');
  },
}));
