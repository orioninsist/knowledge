import type { SearchEngine } from "./engine";
import type { SearchDocument, SearchResult } from "./types";

import { FileSearchStore } from "./file-store";

export class TantivySearchEngine implements SearchEngine {
  private store: FileSearchStore;

  constructor(
    private storagePath: string,
  ) {
    this.store = new FileSearchStore(
      `${storagePath}/documents.json`,
    );
  }

  async init(): Promise<void> {
    await this.store.load();
  }

  async index(
    document: SearchDocument,
  ): Promise<void> {
    await this.store.add(document);

    console.log(
      "Indexed:",
      document.filename,
    );
  }

  async remove(
    path: string,
  ): Promise<void> {
    await this.store.remove(path);

    console.log(
      "Removed:",
      path,
    );
  }

  async all(): Promise<SearchDocument[]> {
    return this.store.all();
  }

  async search(
    query: string,
  ): Promise<SearchResult[]> {
    const normalized =
      query.toLowerCase();

    return this.store
      .all()
      .filter((document) =>
        document.filename
          .toLowerCase()
          .includes(normalized) ||
        document.content
          .toLowerCase()
          .includes(normalized)
      )
      .map((document) => ({
        path: document.path,
        filename: document.filename,
        workspace: document.workspace,
        score: 1,
      }));
  }
}
