import { join, resolve } from "node:path";
import { updateDocsPath } from "./docs-indexer";

const input = process.argv[2];
if (!input) {
  console.error("Usage: bun scripts/update-docs-path.ts /absolute/path.md");
  process.exit(2);
}

const ROOT = resolve(process.env.KNOWLEDGE_DOCS_ROOT ?? "/home/murat/Media/5-Documentation");
const DB_PATH = process.env.KNOWLEDGE_DOCS_DB_PATH ?? join(process.cwd(), ".runtime", "docs", "docs.db");
const IGNORES = String(process.env.KNOWLEDGE_DOCS_IGNORE ?? join(ROOT, "Knowledge"))
  .split(":").map((item) => item.trim()).filter(Boolean).map((item) => resolve(item));

const result = updateDocsPath({ root: ROOT, ignores: IGNORES, dbPath: DB_PATH }, input);
console.log(`${result}: ${input}`);
