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

async function walkDirectory(
  path: string,
): Promise<FileEntry[]> {
  const entries = await readdir(path, {
    withFileTypes: true,
  });

  const files: FileEntry[] = [];

  for (const entry of entries) {
    const entryPath = join(path, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      files.push(
        ...(await walkDirectory(entryPath)),
      );

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    files.push({
      name: entry.name,
      path: entryPath,
      extension: extname(entry.name),
    });
  }

  return files;
}

export async function scanWorkspace(
  path: string,
): Promise<FileEntry[]> {
  return walkDirectory(path);
}
