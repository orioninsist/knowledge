import { scanWorkspace } from "../workspace/scanner";
import { indexFiles } from "../search/indexer";
import type { SearchEngine } from "../search/engine";

export async function indexWorkspaceOnStartup(
  path: string,
  name: string,
  engine: SearchEngine,
): Promise<void> {
  const files = await scanWorkspace(path);

  await indexFiles(
    files,
    name,
    engine,
  );
}
