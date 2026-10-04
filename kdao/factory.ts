import type { SearchPort, DocumentPort } from "./ports";
import type { Workspace } from "../workspace/types";
import { KnowledgeService } from "./service";

export function createKnowledgeService(
  search: SearchPort,
  documents: DocumentPort,
  workspaces: Workspace[],
) {
  return new KnowledgeService(
    search,
    documents,
    workspaces,
  );
}
