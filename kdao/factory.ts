import { SearchService } from "../search/service";
import { DocumentService } from "../documents/service";
import type { Workspace } from "../workspace/types";
import { KnowledgeService } from "./service";

export function createKnowledgeService(
  search: SearchService,
  documents: DocumentService,
  workspaces: Workspace[],
) {
  return new KnowledgeService(
    search,
    documents,
    workspaces,
  );
}
