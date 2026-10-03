import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

import type { FileEntry } from "./types";

export const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "storage",
]);

export function isIgnoredPath(path: string): boolean {
  const parts = path.split(/[\\/]+/);

  return parts.some((part) =>
    IGNORED_DIRECTORIES.has(part)
  );
}

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

      return !isIgnoredPath(relativePath);
    })
    .map((file) => ({
      name: file.name,
      path: join(path, file.parentPath, file.name),
      extension: extname(file.name),
    }));
}
