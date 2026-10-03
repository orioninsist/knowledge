import { watch } from "node:fs";

import { handleFileChange } from "./service";
import type { SearchEngine } from "../search/engine";

export type FileChangeEvent = {
  type: "add" | "change" | "remove";
  path: string;
};

export function watchWorkspace(
  path: string,
  workspace: string,
  engine: SearchEngine,
) {
  const watcher = watch(
    path,
    {
      recursive: true,
    },
    async (eventType, filename) => {
      if (!filename) {
        return;
      }

      const event: FileChangeEvent = {
        type: "change",
        path: filename,
      };

      console.log(event);

      await handleFileChange(
        `${path}/${filename}`,
        workspace,
        engine,
      );
    },
  );

  return watcher;
}
