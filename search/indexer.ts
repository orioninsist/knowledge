import { extname } from "node:path";

import type { FileEntry } from "../workspace/types";
import type { SearchEngine } from "./engine";
import type { SearchDocument } from "./types";

const SEARCHABLE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".ts",
  ".js",
  ".tsx",
  ".jsx",
  ".css",
  ".html",
]);

export function isSearchableFile(
  file: FileEntry,
): boolean {
  return SEARCHABLE_EXTENSIONS.has(
    extname(file.name).toLowerCase(),
  );
}

export async function createDocument(
  file: FileEntry,
  workspace: string,
): Promise<SearchDocument | null> {
  if (!isSearchableFile(file)) {
    return null;
  }

  const content = await Bun.file(file.path).text();

  return {
    path: file.path,
    filename: file.name,
    content,
    workspace,
  };
}

export async function indexFiles(
  files: FileEntry[],
  workspace: string,
  engine: SearchEngine,
): Promise<void> {
  for (const file of files) {
    const document = await createDocument(
      file,
      workspace,
    );

    if (!document) {
      continue;
    }

    await engine.index(document);
  }
}
