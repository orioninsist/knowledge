export interface SearchDocument {
  path: string;
  filename: string;
  content: string;
  workspace: string;
}

export interface SearchResult {
  path: string;
  filename: string;
  score: number;
}
