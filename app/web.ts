
import type { KnowledgeDAO } from "../kdao";

export function createWebApp(
  knowledge: KnowledgeDAO,
) {
  return {
    async search(url: URL) {
      const query =
        url.searchParams.get("q") ?? "";

      return knowledge.search(query);
    },

    async documents() {
      return knowledge.listDocuments();
    },

    async document(path: string) {
      return knowledge.readDocument(path);
    },
  };
}
