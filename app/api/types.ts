import type { SearchResult } from "../../search/types";
import type { DocumentMetadata } from "../../search/metadata";
import type { Workspace } from "../../workspace/types";

export interface ApplicationApi {
  search(
    query: string,
  ): Promise<SearchResult[]>;

  getDocuments(): Promise<DocumentMetadata[]>;

  getWorkspaces(): Workspace[];
}
