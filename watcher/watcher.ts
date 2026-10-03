import { watch } from "node:fs";
import { access } from "node:fs/promises";

import { handleFileChange } from "./service";
import type { SearchEngine } from "../search/engine";

export type FileChangeEvent = {
  type: "add" | "change" | "remove";
  path: string;
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

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

      const fullPath = `${path}/${filename}`;

      const fileExists = await exists(fullPath);

      const event: FileChangeEvent = {
        type: fileExists
          ? eventType === "rename"
            ? "add"
            : "change"
          : "remove",
        path: fullPath,
      };

      console.log(event);

      if (event.type === "remove") {
        await engine.remove(event.path);
        return;
      }

      await handleFileChange(
        event.path,
        workspace,
        engine,
      );
    },
  );

  return watcher;
}
