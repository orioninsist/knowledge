import type { SearchDocument, SearchResult } from "./types";

export class MemorySearchStore {
  private documents = new Map<string, SearchDocument>();

  add(document: SearchDocument): void {
    this.documents.set(document.path, document);
  }

  remove(path: string): void {
    this.documents.delete(path);
  }

  search(query: string): SearchResult[] {
    const normalized = query.toLowerCase();

    return Array.from(this.documents.values())
      .filter((document) => {
        return (
          document.filename.toLowerCase().includes(normalized) ||
          document.content.toLowerCase().includes(normalized)
        );
      })
      .map((document) => ({
        path: document.path,
        filename: document.filename,
        score: 1,
      }));
  }

  all(): SearchDocument[] {
    return Array.from(this.documents.values());
  }
}
