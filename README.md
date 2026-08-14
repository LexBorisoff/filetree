# `@lexjs/filetree`

![Build](https://img.shields.io/github/actions/workflow/status/LexBorisoff/filetree/release.yml)
![Codecov](https://img.shields.io/codecov/c/gh/LexBorisoff/filetree)
![NPM Version](https://img.shields.io/npm/v/@lexjs/filetree)
![Static Badge](https://img.shields.io/badge/package-ESM--only-ffe536)

Library that allows to work with the file system in Node.js by defining a tree of files and directories and a set of actions to perform on that tree, such as reading/writing a file, creating/deleting a file/directory, etc. Any Node.js operation that is performed on files and directories can be abstracted as an action.

- [Installation](#installation)
- [Usage](#usage)
  - [Instantiation](#instantiation)
  - [Actions registration](#actions-registration)
  - [Using actions](#using-actions)
- [Tree](#tree)
  - [Creating the tree in the file system](#creating-the-tree-in-the-file-system)
- [Actions](#actions)
  - [Creating actions](#creating-actions)
  - [Target file and directory objects](#target-file-and-directory-objects)
  - [Utility methods](#utility-methods)
- [Core Actions](#core-actions)
  - [Core File Actions](#core-file-actions)
  - [Core Directory Actions](#core-directory-actions)

## Installation

```bash
npm install @lexjs/filetree
```

```bash
pnpm add @lexjs/filetree
```

```bash
yarn add @lexjs/filetree
```

```bash
bun add @lexjs/filetree
```

## Usage

### Instantiation

To use `filetree`, you need to instantiate the `FileTree` class by providing it two arguments:

- a root path string
- an object representing the tree of files and directories ([see here](#tree))

```typescript
import { FileTree } from '@lexjs/filetree';

const fileTree = new FileTree('/path/to/tree/root', {
  file1: 'File 1 data',
  dir1: {
    file2: 'File 2 data',
  },
});
```

> ⚠️ It is important to create the tree in the file system, if it doesn't already exist, before using actions - [see here](#creating-the-tree-in-the-file-system).

### Actions registration

To register actions, call the `use` method on the created `FileTree` instance. The method accepts an object that defines file and directory operations.

> ⚡ Learn more about actions, how they work, and how to define them [here](#actions).  

This library exports a pre-defined object with some common file and directory operations, called `coreActions` exported from `@lexjs/filetree/core`.

```typescript
import { coreActions } from '@lexjs/filetree/core';

/* statements */

const actions = fileTree.use(coreActions);
```

> ⚡ Learn about core actions [here](#core-actions).

### Using actions

The returned value from calling the `use` method is a function that accepts a callback whose only argument is the tree, and whose return value is a property of that tree that you want to work with (the return value can also be the tree object itself representing the tree's root). You are now able to work with the tree by using actions.

```typescript
const file1 = actions((root) => root.file1);
const dir1 = actions((root) => root.dir1);

// file core actions
file1.getPath();
file1.read();
file1.write('File 1 new data');
file1.clear();

// dir core actions
dir1.getPath();
dir1.exists('file2');
dir1.dirCreate('new-dir');
dir1.dirDelete('new-dir');
dir1.fileRead('file2');
dir1.fileWrite('file2', 'File 2 new data');
dir1.fileClear('file2');
dir1.fileCreate('new-file');
dir1.fileDelete('new-file');
```

## Tree

The tree object represents a structure of files and directories that you will be working with via actions. Each property key is the name of the corresponding file or directory, and its value determines whether the property is a file or a directory:

- A ***file*** is represented as a `string` whose value is the initial content of the file. This content will be written when calling the `createTree` function ([see here](#creating-the-tree-in-the-file-system)).
- A ***directory*** is represented as an object of type `TreeInterface` and contains files and/or other directories (the tree itself is of type `TreeInterface`).

For example:

```typescript
const fileTree = new FileTree('/path/to/tree/root', {
  file1: 'File 1 data',
  'file2.html': getHtmlContent(), // returns a string
  'file3.css': getCssContent(), // returns a string
  dir1: {}, // empty directory
  dir2: {
    file5: 'File 5 data',
    'file6.js': getJsContent(), // returns a string
    dir3: {
      file7: 'File 7 data',
      'file8.sh': getBashContent(), // returns a string
    },
  },
});
```

If you are creating a standalone tree object and want to have type safety, use the `TreeInterface` type exported from `@lexjs/filetree`:

```typescript
import { FileTree, type TreeInterface } from '@lexjs/filetree';

const tree = {
  /* tree definition */
} satisfies TreeInterface;

const fileTree = new FileTree('/path/to/tree/root', tree);
```

> ⚠️ It is important to use the `satisfies` keyword instead of annotating the variable, otherwise you will not get the TypeScript autocompletion features when using the actions! Make sure your TypeScript version supports it.

### Creating the tree in the file system

If the tree that was provided when instantiating the `FileTree` class does not exist in the file system, it is important that you create it before using actions. The tree can be created by calling the `createTree` function that accepts an `FileTree` instance:

```typescript
import { createTree, FileTree } from '@lexjs/filetree';

const fileTree = new FileTree(/* ... */);

createTree(fileTree);
```

The `createTree` function traverses through the tree properties creating files and directories.

- If the file already exists, the function overwrites its contents.
- If the directory exists, the function skips it.

It returns an array of `CreateTreeError` errors.

```typescript
function createTree(fileTree: FileTree<TreeInterface>): CreateTreeError[]
```

## Actions

An action is a function that performs some operation on a given file or directory from the tree. You can create as many or as few actions as you'd like for the same tree by registering them with the `use` method on a `FileTree` instance.

The `use` method accepts an object that has 2 properties:

- `file` - a function that takes a `targetFile` object of type `FileTargetInterface` and returns an object with file actions.
- `dir` - a function that takes a `targetDir` object of type `DirTargetInterface` and returns an object with directory actions.

```typescript
// describes targetFile
interface FileTargetInterface {
  type: 'file';
  path: string;
}

// describes targetDir
interface DirTargetInterface<Tree extends TreeInterface> {
  type: 'dir';
  children: ObjectTreeType<Tree>;
  path: string;
}

type ObjectTreeType<Tree extends TreeInterface> = {
  [key in keyof Tree]: Tree[key] extends string
    ? FileTargetInterface
    : Tree[key] extends TreeInterface
      ? DirTargetInterface<Tree[key]>
      : never;
};
```

### Creating actions

Here's a small example of how to create your own actions:

```typescript
import fs from 'node:fs';
import path from 'node:path';

const fileTree = new FileTree('/root/path', {
  dir1: {
    dir2: {
      file1: 'File 1 data',
    },
  },
});

const actions = fileTree.use({
  file: (targetFile) => ({
    read() {
      return fs.readFileSync(targetFile.path, 'utf-8');
    },
    /* other file actions */
  }),
  dir: (targetDir) => ({
    readFile(fileName: string) {
      const filePath = path.resolve(targetDir.path, fileName);
      return fs.readFileSync(filePath, 'utf-8');
    },
    /* other directory actions */
  }),
});
```

### Target file and directory objects

The `file` method accepts an argument of type `FileTargetInterface` and the `dir` method accepts an argument of type `DirTargetInterface`. These arguments are objects that *represent* the selected file or directory from the tree when you call the function returned from the `use` method. Following the above example, when selecting a file and a directory like this:

```typescript
const file1 = actions((root) => root.dir1.dir2.file1);
const dir1 = actions((root) => root.dir1);
```

the `targetFile` would have the following value:

```typescript
{
  type: 'file',
  path: '/root/path/dir1/dir2/file1',
}
```

and `targetDir` would be as follows:

```typescript
{
  type: 'dir',
  path: '/root/path/dir1',
  children: {
    dir2: {
      type: 'dir',
      path: '/root/path/dir1/dir2',
      children: {
        type: 'file',
        path: '/root/path/dir1/dir2/file1',
      }
    }
  },
}
```

### Utility methods

The `FileTree` class has static utility methods that help you create actions that can be provided to the `use` method. This could be useful when you want to export common actions, or if some of your actions need to return the actions themselves, for example when creating a new file or directory.

```typescript
import fs from 'node:fs';
import path from 'node:path';
import { FileTree } from '@lexjs/filetree';

export const fileActions = FileTree.fileActions((targetFile) => ({
  read() {
    return fs.readFileSync(targetFile.path, 'utf-8');
  }
  /* other file actions */
}));

export const dirActions = FileTree.dirActions((targetDir) => ({
  createFile(fileName: string, data: string = '') {
    const filePath = path.resolve(targetDir.path, fileName);
    fs.writeFileSync(filePath, data);

    // 👇 notice that it calls fileActions
    return fileActions({
      type: 'file',
      path: filePath,
    });
  },
  createDir(dirName: string) {
    const dirPath = path.resolve(targetDir.path, dirName);
    fs.mkdirSync(dirPath);

    // 👇 notice that it calls dirActions
    return dirActions({
      type: 'dir',
      path: dirPath,
      children: {},
    });
  },
  /* other directory actions */
}));
```

This allows for the following scenario:

```typescript
import { FileTree } from '@lexjs/filetree';

const fileActions = FileTree.fileActions((targetFile) => ({ /* file actions */ }));
const dirActions = FileTree.dirActions((targetDir) => ({ /* directory actions */ }));

const fileTree = new FileTree('/path/to/tree/root', {
  dir1: {
    dir2: {
      file1: 'File 1 data',
    },
  },
});

const actions = fileTree.use({
  file: fileActions,
  dir: dirActions,
});

const root = actions((root) => root);
const newFile1 = root.createFile('new-file1', 'New file 1 data');
const data1 = newFile1.read(); // New file 1 data

const dir1 = actions((root) => root.dir1);
const newDir1 = dir1.createDir('new-dir1');
const newDir2 = newDir1.createDir('new-dir2');
const newDir3 = newDir2.createDir('new-dir3');
const newFile2 = newDir3.createFile('new-file2', 'New file 2 data');
const data2 = newFile2.read(); // New file 2 data
```

> 💡 The above example is how core actions are built under the hood.

## Core Actions

The library exports a set of common actions called `coreActions` from `@lexjs/filetree/core` that can be provided to the `use` method.

```typescript
import { FileTree } from '@lexjs/filetree';
import { coreActions } from '@lexjs/filetree/core';

const fileTree = new FileTree('/path/to/tree/root', {
  /* tree definition */
});

const actions = fileTree.use(coreActions);
```

### Core File Actions

- [`getPath`](#getpath-file-action)
- [`read`](#read)
- [`write`](#write)
- [`clear`](#clear)

### `getPath` (file action)

Returns the path of the target file.

#### *Definition*

```typescript
getPath(): string
```

#### *Example*

```typescript
const file = actions((root) => root.file);
const filePath = file.getPath();
```

### `read`

Reads the contents of the target file.

#### *Returns*

- file data as a `string`
- `null` if the file cannot be read

#### *Definition*

```typescript
read(): string | null
```

#### *Example*

```typescript
const file = actions((root) => root.file);
const fileData = file.read();
```

### `write`

Writes data to the target file. Data can be of type `string` or `NodeJS.ArrayBufferView`, otherwise it gets stringified.

#### *Definition*

```typescript
write<Data>(data: Data): void
```

#### *Example*

```typescript
const file = actions((root) => root.file);
file.write('New file data');
```

### `clear`

Clears the contents of the target file.

#### *Definition*

```typescript
clear(): void
```

#### *Example*

```typescript
const file = actions((root) => root.file);
file.clear();
```

### Core Directory Actions

- [`getPath`](#getpath-directory-action)
- [`exists`](#exists)
- [`dirCreate`](#dircreate)
- [`dirDelete`](#dirdelete)
- [`fileCreate`](#filecreate)
- [`fileDelete`](#filedelete)
- [`fileRead`](#fileread)
- [`fileWrite`](#filewrite)
- [`fileClear`](#fileclear)

### `getPath` (directory action)

Returns the path of the target directory.

#### *Definition*

```typescript
getPath(): string
```

#### *Example*

```typescript
const dir = actions((root) => root);
const dirPath = dir.getPath();
```

### `exists`

Checks if a file or directory exists inside the target directory.

#### *Definition*

```typescript
exists(name: string): boolean
```

#### *Example*

```typescript
const dir = actions((root) => root);
const fileExists = dir.exists('some-file');
const dirExists = dir.exists('some-dir');
```

### `dirCreate`

Creates a new directory inside the target directory.

#### *Returns*

- Created directory's actions
- Directory's actions if the directory already exists
- `false` if the directory could not be created

#### *Definition*

```typescript
dirCreate(dirName: string, recursive: boolean = false): DirActions | false
```

#### *Example*

```typescript
const dir = actions((root) => root);
const newDir = dir.dirCreate('new-dir');

// you can access all the directory actions on the newDir
newDir.getPath();

// even create another new directory!
const anotherDir = newDir.dirCreate('foo');
```

> In the above example, `newDir` has all the directory actions just like accessing a tree directory with a function returned by calling the `.use()` method (in our examples, we named that function `actions`).

#### *Creating a nested directory*

To create a nested directory, set the `recursive` flag to `true`:

```typescript
const dir = actions((root) => root);
const newDir = dir.dirCreate('nested/new-dir', true);
```

### `dirDelete`

Deletes a directory inside the target directory.

#### *Definition*

```typescript
dirDelete(dirName: string): void
```

#### *Example*

```typescript
const dir = actions((root) => root);
dir.dirDelete('some-dir');
```

### `fileCreate`

Creates a new file inside the target directory.

#### *Returns*

- Created file's actions
- File's actions if the file already exists
- `false` if the file could not be created

#### *Definition*

```typescript
fileCreate(fileName: string, data: unknown = ''): FileActions | false
```

> If the `data` argument is provided and the file already exists, the file will be overwritten. Data can be of type `string` or `NodeJS.ArrayBufferView`, otherwise it gets stringified.

#### *Example*

```typescript
const dir = actions((root) => root);
const newFile = dir.fileCreate('new-file', 'file data');

// you can access all the file actions on the newFile
newFile.getPath();
newFile.read();
newFile.write('updated file data');
newFile.clear();
```

> In the above example, `newFile` has all the file actions just like accessing a tree file with a function returned by calling the `.use()` method (in our examples, we named that function `actions`).

### `fileDelete`

Deletes a file inside the target directory.

#### *Definition*

```typescript
fileDelete(fileName: string): void
```

#### *Example*

```typescript
const dir = actions((root) => root);
dir.fileDelete('some-file');
```

### `fileRead`

Reads the contents of a file inside the target directory.

#### *Returns*

- file data as a `string`
- `null` if the file cannot be read

#### *Definition*

```typescript
fileRead(fileName: string): string | null
```

#### *Example*

```typescript
const dir = actions((root) => root);
const fileData = dir.fileRead('some-file');
```

### `fileWrite`

Writes new data to a file inside the target directory. Data can be of type `string` or `NodeJS.ArrayBufferView`, otherwise it gets stringified.

#### *Definition*

```typescript
fileWrite<Data>(fileName: string, data: Data): void
```

#### *Example*

```typescript
const dir = actions((root) => root);
dir.fileWrite('some-file', 'some data');
```

### `fileClear`

Clears the contents of a file inside the target directory.

#### *Definition*

```typescript
fileClear(fileName: string): void
```

#### *Example*

```typescript
const dir = actions((root) => root);
dir.fileClear('some-file');
```
