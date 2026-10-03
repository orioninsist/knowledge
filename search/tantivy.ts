import type { SearchEngine } from "./engine";
import type { SearchDocument, SearchResult } from "./types";

export class TantivySearchEngine implements SearchEngine {
  constructor(
    private storagePath: string,
  ) {}

  async index(document: SearchDocument): Promise<void> {
    console.log(
      "Index document:",
      document.path,
      "storage:",
      this.storagePath,
    );
  }

  async remove(path: string): Promise<void> {
    console.log("Remove document:", path);
  }

  async search(query: string): Promise<SearchResult[]> {
    console.log(
      "Search query:",
      query,
      "storage:",
      this.storagePath,
    );

    return [];
  }
}
