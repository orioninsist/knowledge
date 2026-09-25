import { join, resolve } from "node:path";
import { buildDocsIndex } from "./docs-indexer";

const ROOT = resolve(process.env.KNOWLEDGE_DOCS_ROOT ?? "/home/murat/Media/5-Documentation");
const PROJECT_ROOT = process.cwd();
const DB_PATH = process.env.KNOWLEDGE_DOCS_DB_PATH ?? join(PROJECT_ROOT, ".runtime", "docs", "docs.db");
const IGNORES = String(process.env.KNOWLEDGE_DOCS_IGNORE ?? join(ROOT, "Knowledge"))
  .split(":")
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => resolve(item));

const result = await buildDocsIndex({ root: ROOT, ignores: IGNORES, dbPath: DB_PATH });

console.log(`root=${ROOT}`);
console.log(`ignored=${IGNORES.join(":")}`);
console.log(`database=${DB_PATH}`);
console.log(`scanned=${result.scanned}`);
console.log(`updated=${result.updated}`);
console.log(`unchanged=${result.unchanged}`);
console.log(`deleted=${result.deleted}`);
console.log(`indexed=${result.indexed}`);
