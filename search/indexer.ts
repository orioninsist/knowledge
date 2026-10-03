import type { FileEntry } from "../workspace/types";
import type { SearchEngine } from "./engine";

import type { SearchDocument } from "./types";

export async function createDocument(
  file: FileEntry,
  workspace: string,
): Promise<SearchDocument> {
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

    await engine.index(document);
  }
}
