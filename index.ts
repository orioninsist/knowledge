import { ensureStorage } from "./search/storage";
import { TantivySearchEngine } from "./search/tantivy";

const storage = await ensureStorage("./storage/index");

const engine = new TantivySearchEngine(storage);

await engine.index({
  path: "/notes/test.md",
  filename: "test.md",
  content: "Docker and Linux notes",
  workspace: "Notes",
});
