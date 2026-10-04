import { marked } from "marked";

export function renderMarkdown(
  content: string,
): string {
  return String(
    marked.parse(content, {
      async: false,
    }),
  );
}
