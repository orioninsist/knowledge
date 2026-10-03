import type { Config } from "../core/config/schema";
import type { Workspace } from "../workspace/types";
import type { SearchEngine } from "../search/engine";
import type { SearchService } from "../search/service";
import type { DocumentService } from "../documents/service";
import type { RendererContract } from "../renderer/contract";

export interface ApplicationContext {
  config: Config;
  workspaces: Workspace[];
  engine: SearchEngine;
  search: SearchService;
  documents: DocumentService;
  renderer: RendererContract;
}
