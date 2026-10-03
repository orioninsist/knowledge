import { indexWorkspaceOnStartup } from "./indexing/startup";
import { ensureStorage } from "./search/storage";
import { TantivySearchEngine } from "./search/tantivy";
import { watchWorkspace } from "./watcher/watcher";

const workspace = {
  name: "knowledge",
  path: "./",
};

const storage = await ensureStorage("./storage/index");

const engine = new TantivySearchEngine(storage);

console.log("initial indexing...");

await indexWorkspaceOnStartup(
  workspace.path,
  workspace.name,
  engine,
);

console.log("initial indexing complete");

const watcher = watchWorkspace(
  workspace.path,
  workspace.name,
  engine,
);

console.log("watching...");

process.on("SIGINT", () => {
  watcher.close();
  process.exit();
});
