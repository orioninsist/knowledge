import type { ApplicationApi } from "./types";
import type { KnowledgeDAO } from "../../kdao";

export function createApplicationApi(
  knowledge: KnowledgeDAO,
): ApplicationApi {
  return {
    search(query) {
      return knowledge.search(query);
    },

    getDocuments() {
      return knowledge.documents();
    },

    getWorkspaces() {
      return knowledge.workspaces();
    },
  };
}
