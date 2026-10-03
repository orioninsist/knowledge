import type { ApplicationContext } from "../app/context";
import type {
  RendererDocument,
  RendererSearchResult,
  RendererWorkspace,
} from "./models";

export interface RendererContract {
  getWorkspaces(): RendererWorkspace[];

  getDocuments(): Promise<RendererDocument[]>;

  search(
    query: string,
  ): Promise<RendererSearchResult[]>;
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
