import type { ApplicationContext } from "../app/context";
import type { ApplicationApi } from "../app/api/types";

export function createRendererRuntime(
  context: ApplicationContext,
): ApplicationApi {
  return {
    search(query) {
      return context.search.query(query);
    },

    getDocuments() {
      return context.documents.list();
    },

    getWorkspaces() {
      return context.workspaces;
    },
  };
}
