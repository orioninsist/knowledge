import type { Config } from "../core/config/schema";
import type { Workspace } from "../workspace/types";
import type { SearchEngine } from "../search/engine";
import type { ApplicationApi } from "./api/types";
import type { KnowledgeDAO } from "../kdao";
import type { ApplicationFacade } from "./facade";

export interface ApplicationContext {
  config: Config;
  workspaces: Workspace[];
  engine: SearchEngine;
  knowledge: KnowledgeDAO;
  api: ApplicationApi;
  facade: ApplicationFacade;
}
