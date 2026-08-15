import fs from 'node:fs';
import path from 'node:path';

import { createDir } from '@utils/create-dir.js';
import { getFileData } from '@utils/get-file-data.js';
import { readFile } from '@utils/read-file.js';

import { FileTree } from '../main.js';

import { fileActions } from './file-actions.js';

import type {
  DirTargetInterface,
  TreeInterface,
} from '@app-types/tree.types.js';

export const dirActions = FileTree.dirActions((targetDir) => {
  function getPath(name: string): string {
    return path.resolve(targetDir.path, name);
  }

  function exists(name: string): boolean {
    return fs.existsSync(getPath(name));
  }

  return {
    /**
     * Returns the path of the target directory.
     */
    getPath(): string {
      return targetDir.path;
    },

    /**
     * Checks if a file or directory exists inside the target directory.
     *
     * @param name file or directory name to check
     */
    exists(name: string): boolean {
      return exists(name);
    },

    /**
     * Creates a new directory inside the target directory.
     *
     * @param dirName directory name to create
     * @param recursive indicates whether parent folders should be created
     *
     * @returns
     * - Created directory's actions
     * - Directory's actions if the directory already exists
     * - `false` if the directory could not be created
     *
     */
    dirCreate(
      dirName: string,
      recursive = false,
    ): ReturnType<typeof dirActions> | false {
      const dirPath = getPath(dirName);
      const createdDir: DirTargetInterface<TreeInterface> = {
        type: 'dir',
        path: dirPath,
        children: {},
      };

      if (exists(dirName)) {
        return dirActions(createdDir);
      }

      try {
        createDir(dirPath, recursive);
      } catch {
        return false;
      }

      return dirActions(createdDir);
    },

    /**
     * Deletes a directory inside the target directory.
     *
     * @param dirName directory name to delete
     */
    dirDelete(dirName: string): void {
      if (exists(dirName)) {
        fs.rmSync(getPath(dirName), {
          recursive: true,
          force: true,
        });
      }
    },

    /**
     * Creates a new file inside the target directory.
     *
     * @param fileName file name to create
     * @param data data string to write. If this argument is provided and the file already exists, the file will be overwritten
     *
     * @returns
     * - Created file's actions
     * - File's actions if it already exists
     * - `false` if the file could not be created
     */
    fileCreate(
      fileName: string,
      data: unknown = '',
    ): ReturnType<typeof fileActions> | false {
      try {
        this.fileWrite(fileName, data);
      } catch {
        return false;
      }

      return fileActions({
        type: 'file',
        path: getPath(fileName),
      });
    },

    /**
     * Deletes a file inside the target directory.
     *
     * @param fileName file name to delete
     */
    fileDelete(fileName: string): void {
      if (exists(fileName)) {
        fs.rmSync(getPath(fileName));
      }
    },

    /**
     * Reads the contents of a file inside the target directory.
     *
     * @param fileName file name to read
     *
     * @returns
     * - file data as a `string`
     * - `null` if the file cannot be read
     */
    fileRead(fileName: string): string | null {
      return readFile(getPath(fileName));
    },

    /**
     * Writes new data to a file inside the target directory.
     *
     * @param fileName file name to write data to
     * @param data data string to write
     */
    fileWrite<Data>(fileName: string, data: Data): void {
      fs.writeFileSync(getPath(fileName), getFileData(data));
    },

    /**
     * Clears the contents of a file inside the target directory.
     *
     * @param fileName file name to clear
     */
    fileClear(fileName: string): void {
      if (exists(fileName)) {
        this.fileWrite(fileName, '');
      }
    },
  };
});
