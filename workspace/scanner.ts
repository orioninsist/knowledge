import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

import type { FileEntry } from "./types";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "storage",
]);

export async function scanWorkspace(
  path: string,
): Promise<FileEntry[]> {
  const files = await readdir(path, {
    recursive: true,
    withFileTypes: true,
  });

  return files
    .filter((file) => {
      if (!file.isFile()) {
        return false;
      }

      const relativePath = join(
        file.parentPath,
        file.name,
      );

      const parts = relativePath.split("/");

      return !parts.some((part) =>
        IGNORED_DIRECTORIES.has(part)
      );
    })
    .map((file) => ({
      name: file.name,
      path: join(path, file.parentPath, file.name),
      extension: extname(file.name),
    }));
}
