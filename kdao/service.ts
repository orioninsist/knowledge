import type { KnowledgeDAO } from "./types";
import type { SearchService } from "../search/service";
import type { DocumentService } from "../documents/service";
import type { Workspace } from "../workspace/types";

export class KnowledgeService implements KnowledgeDAO {
  constructor(
    private searchService: SearchService,
    private documentService: DocumentService,
    private workspaceList: Workspace[],
  ) {}

  search(query: string) {
    return this.searchService.query(query);
  }

  documents() {
    return this.documentService.list();
  }

  workspaces() {
    return this.workspaceList;
  }
}
