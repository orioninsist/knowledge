import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";

import { indexFiles } from "../search/indexer";
import type { SearchEngine } from "../search/engine";

export async function handleFileChange(
  path: string,
  workspace: string,
  engine: SearchEngine,
): Promise<void> {
  try {
    const fileStat = await stat(path);

    if (!fileStat.isFile()) {
      return;
    }

    const name = basename(path);

    await indexFiles(
      [
        {
          name,
          path,
          extension: extname(name),
        },
      ],
      workspace,
      engine,
    );
  } catch {
    console.log("File removed:", path);
  }
}
