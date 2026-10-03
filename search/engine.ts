import type { SearchDocument, SearchResult } from "./types";

export interface SearchEngine {
  index(document: SearchDocument): Promise<void>;

  remove(path: string): Promise<void>;

  search(query: string): Promise<SearchResult[]>;

  all(): Promise<SearchDocument[]>;
}
