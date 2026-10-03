import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

import type { FileEntry } from "./types";

export async function scanWorkspace(
  path: string,
): Promise<FileEntry[]> {
  const files = await readdir(path, {
    recursive: true,
    withFileTypes: true,
  });

  return files
    .filter((file) => file.isFile())
    .map((file) => ({
      name: file.name,
      path: join(path, file.parentPath, file.name),
      extension: extname(file.name),
    }));
}
