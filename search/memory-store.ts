import type { SearchDocument } from "./types";

export class MemorySearchStore {
  private documents = new Map<string, SearchDocument>();

  add(document: SearchDocument): void {
    this.documents.set(document.path, document);
  }

  remove(path: string): void {
    this.documents.delete(path);
  }

  all(): SearchDocument[] {
    return Array.from(this.documents.values());
  }
}
