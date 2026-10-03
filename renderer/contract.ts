import type { ApplicationContext } from "../app/context";
import type { SearchResult } from "../search/types";
import type { Workspace } from "../workspace/types";

export interface RendererContract {
  getWorkspaces(): Workspace[];

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

    async search(query: string) {
      return context.search.query(query);
    },
  };
}
