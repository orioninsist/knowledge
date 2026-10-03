import { stat } from "node:fs/promises";
import { dirname, basename, extname } from "node:path";

import { scanWorkspace } from "../workspace/scanner";
import { indexFiles } from "../search/indexer";
import type { SearchEngine } from "../search/engine";

export async function handleFileChange(
  path: string,
  workspace: string,
  engine: SearchEngine,
): Promise<void> {
  try {
    await stat(path);

    const files = await scanWorkspace(dirname(path));

    const file = files.find(
      (item) => item.name === basename(path),
    );

    if (!file) {
      return;
    }

    await indexFiles(
      [
        {
          ...file,
          extension: extname(file.name),
        },
      ],
      workspace,
      engine,
    );
  } catch {
    console.log("File removed:", path);
  }
}
