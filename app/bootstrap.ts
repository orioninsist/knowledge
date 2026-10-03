import type { ApplicationContext } from "./context";
import { loadConfig } from "../core/config/loader";
import { indexWorkspaceOnStartup } from "../indexing/startup";
import { ensureStorage } from "../search/storage";
import { SearchService } from "../search/service";
import { DocumentService } from "../documents/service";
import { TantivySearchEngine } from "../search/tantivy";
import { watchWorkspace } from "../watcher/watcher";
import { loadWorkspaces } from "../workspace/manager";
import { createRendererRuntime } from "./api/runtime";
import { KnowledgeService } from "../kdao";
import { createLifecycle } from "./lifecycle";
import { createApplicationFacade } from "./facade";
import { createLifecycle } from "./lifecycle";
import { createApplicationFacade } from "./facade";

export async function bootstrap(): Promise<ApplicationContext & { watchers: ReturnType<typeof watchWorkspace>[] }> {
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

  const search = new SearchService(
    engine,
  );

  const documents = new DocumentService(
    engine,
  );

  const knowledge = new KnowledgeService(
    search,
    documents,
    workspaces,
  );

  const api = createRendererRuntime(
    {
      config,
      workspaces,
      engine,
      knowledge,
      api: undefined as never,
    },
    knowledge,
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

  const lifecycle = createLifecycle({
    config,
    workspaces,
    engine,
    search,
    documents,
    api,
    watchers,
  });

  const facade = createApplicationFacade(
    api,
    lifecycle,
  );

  return createApplicationFacade(
    api,
    lifecycle,
  );
}
