import type { SearchEngine } from "../search/engine";
import type { DocumentMetadata } from "../search/metadata";
import { readFile } from "node:fs/promises";

export class DocumentService {
  constructor(
    private engine: SearchEngine,
  ) {}

  async list(): Promise<DocumentMetadata[]> {
    const documents = await this.engine.all();

    return documents.map((document) => ({
      path: document.path,
      filename: document.filename,
      workspace: document.workspace,
      extension:
        document.filename.split(".").pop() ?? "",
      size: document.content.length,
      modifiedAt: Date.now(),
    }));
  }

  async read(
    path: string,
  ): Promise<string | null> {
    try {
      return await readFile(path, "utf-8");
    } catch {
      return null;
    }
  }
}
