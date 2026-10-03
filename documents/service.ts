import type { SearchEngine } from "../search/engine";
import type { DocumentMetadata } from "../search/metadata";

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
}
