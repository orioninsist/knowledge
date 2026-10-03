import type { ApplicationContext } from "../app/context";
import type { SearchResult } from "../search/types";
import type { Workspace } from "../workspace/types";

export interface RendererContract {
  getWorkspaces(): Workspace[];

  getDocuments(): Promise<import("../search/metadata").DocumentMetadata[]>;

  search(
    query: string,
  ): Promise<SearchResult[]>;
}

export function createRendererContract(
  context: ApplicationContext,
): RendererContract {
  return {
    getWorkspaces() {
      return context.workspaces;
    },

    async getDocuments() {
      return context.documents.list();
    },

    async search(query: string) {
      return context.search.query(query);
    },
  };
}
