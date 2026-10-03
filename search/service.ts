import type { SearchEngine } from "./engine";
import type { SearchResult } from "./types";

export class SearchService {
  constructor(
    private engine: SearchEngine,
  ) {}

  async query(
    text: string,
  ): Promise<SearchResult[]> {
    if (!text.trim()) {
      return [];
    }

    return this.engine.search(
      text.trim(),
    );
  }
}
