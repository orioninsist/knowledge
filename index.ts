import { loadConfig } from "./core/config/loader";
import { indexWorkspaceOnStartup } from "./indexing/startup";
import { ensureStorage } from "./search/storage";
import { TantivySearchEngine } from "./search/tantivy";
import { watchWorkspace } from "./watcher/watcher";
import { SearchService } from "./search/service";
import { loadWorkspaces } from "./workspace/manager";

const config = await loadConfig();
const workspaces = await loadWorkspaces(config);

const storage = await ensureStorage(
  config.search.index_path,
);

const engine = new TantivySearchEngine(storage);

const search = new SearchService(engine);

const activeWorkspaces = workspaces.filter(
  (workspace) => workspace.exists,
);

for (const workspace of workspaces) {
  if (!workspace.exists) {
    console.log(
      "workspace missing:",
      workspace.name,
      workspace.path,
    );
  }
}

console.log("initial indexing...");

for (const workspace of activeWorkspaces) {
  console.log(
    "indexing workspace:",
    workspace.name,
  );

  await indexWorkspaceOnStartup(
    workspace.path,
    workspace.name,
    engine,
  );
}

console.log("initial indexing complete");

const results = await search.query("linux");

console.log(results);

const watchers = config.search.watch
  ? activeWorkspaces.map((workspace) =>
      watchWorkspace(
        workspace.path,
        workspace.name,
        engine,
      )
    )
  : [];

if (watchers.length > 0) {
  console.log("watching...");
}

process.on("SIGINT", () => {
  for (const watcher of watchers) {
    watcher.close();
  }

  process.exit();
});
