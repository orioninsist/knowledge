import type { Config } from "../core/config/schema";
import type { Workspace } from "../workspace/types";
import type { SearchEngine } from "../search/engine";
import type { SearchService } from "../search/service";

export interface ApplicationContext {
  config: Config;
  workspaces: Workspace[];
  engine: SearchEngine;
  search: SearchService;
}
