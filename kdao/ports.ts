import type { SearchResult } from "../search/types";
import type { DocumentMetadata } from "../search/metadata";

export interface SearchPort {
  query(query: string): Promise<SearchResult[]>;
}

export interface DocumentPort {
  list(): Promise<DocumentMetadata[]>;
}
