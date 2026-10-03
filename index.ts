import { ensureStorage } from "./search/storage";
import { TantivySearchEngine } from "./search/tantivy";

const storage = await ensureStorage(
  "./storage/index",
);

const engine = new TantivySearchEngine(storage);

await engine.search("test");
