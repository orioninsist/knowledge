import { ensureStorage } from "./search/storage";
import { TantivySearchEngine } from "./search/tantivy";

const storage = await ensureStorage("./storage/index");

const engine = new TantivySearchEngine(storage);

const path = "/notes/test.md";

await engine.index({
  path,
  filename: "test.md",
  content: "Docker and Linux notes",
  workspace: "Notes",
});

await engine.remove(path);
