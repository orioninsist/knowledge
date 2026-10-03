import { access } from "node:fs/promises";

import type { Config } from "../core/config/schema";
import type { Workspace } from "./types";

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function loadWorkspaces(
  config: Config,
): Promise<Workspace[]> {
  return Promise.all(
    config.workspaces.map(async (workspace) => ({
      name: workspace.name,
      path: workspace.path,
      exists: await pathExists(workspace.path),
    })),
  );
}
