import type { SearchResult } from "../search/types";
import type { DocumentMetadata } from "../search/metadata";
import type { Workspace } from "../workspace/types";

export interface KnowledgeDAO {
  search(
    query: string,
  ): Promise<SearchResult[]>;

  listDocuments(): Promise<DocumentMetadata[]>;

  readDocument(
    path: string,
  ): Promise<string | null>;

  listWorkspaces(): Workspace[];
}
