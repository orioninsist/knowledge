import type { ApplicationContext } from "../app/context";
import type { ApplicationApi } from "../app/api/types";

export function createRendererRuntime(
  context: ApplicationContext,
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
