import type { FileEntry } from "../workspace/types";
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
