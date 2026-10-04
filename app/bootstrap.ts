import type { ApplicationContext } from "./context";
import { loadConfig } from "../core/config/loader";
import { indexWorkspaceOnStartup } from "../indexing/startup";
import { ensureStorage } from "../search/storage";
import { createSearchService } from "../search";
import { createDocumentService } from "../documents";
import { TantivySearchEngine } from "../search/tantivy";
import { watchWorkspace } from "../watcher/watcher";
import { loadWorkspaces } from "../workspace/manager";
import { createKnowledgeService } from "../kdao";
import { createLifecycle } from "./lifecycle";

export async function bootstrap(): Promise<ApplicationContext> {
  const config = await loadConfig();

  const workspaces = await loadWorkspaces(
    config,
  );

  const storage = await ensureStorage(
    config.search.index_path,
  );

  const engine = new TantivySearchEngine(
    storage,
  );

  await engine.init();

  const search = createSearchService(
    engine,
  );

  const documents = createDocumentService(
    engine,
  );

  const knowledge = createKnowledgeService(
    search,
    documents,
    workspaces,
  );

  const activeWorkspaces =
    workspaces.filter(
      (workspace) => workspace.exists,
    );

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

  console.log(
    "initial indexing complete",
  );

  const watchers = config.search.watch
    ? activeWorkspaces.map((workspace) =>
        watchWorkspace(
          workspace.path,
          workspace.name,
          engine,
        )
      )
    : [];

  const lifecycle = createLifecycle(
    watchers,
  );

  return {
    knowledge,
    lifecycle,
  };
}
