import type { SearchEngine } from "./engine";
import type { SearchDocument, SearchResult } from "./types";

import { MemorySearchStore } from "./memory-store";

export class TantivySearchEngine implements SearchEngine {
  private store = new MemorySearchStore();

  constructor(
    private storagePath: string,
  ) {}

  async index(document: SearchDocument): Promise<void> {
    this.store.add(document);

    console.log(
      "Indexed:",
      document.filename,
      "storage:",
      this.storagePath,
    );
  }

  async remove(path: string): Promise<void> {
    this.store.remove(path);

    console.log(
      "Removed:",
      path,
    );
  }

  async search(query: string): Promise<SearchResult[]> {
    console.log(
      "Search query:",
      query,
    );

    return [];
  }
}
