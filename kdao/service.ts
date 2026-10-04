import type { KnowledgeDAO } from "./types";
import type { SearchPort, DocumentPort } from "./ports";
import type { Workspace } from "../workspace/types";
import type { SearchResult } from "../search/types";
import type { DocumentMetadata } from "../search/metadata";

export class KnowledgeService implements KnowledgeDAO {
  constructor(
    private searchService: SearchPort,
    private documentService: DocumentPort,
    private workspaceList: Workspace[],
  ) {}

  search(query: string): Promise<SearchResult[]> {
    return this.searchService.query(query);
  }

  listDocuments(): Promise<DocumentMetadata[]> {
    return this.documentService.list();
  }

  readDocument(
    path: string,
  ): Promise<string | null> {
    return this.documentService.read(path);
  }

  listWorkspaces(): Workspace[] {
    return this.workspaceList;
  }
}
