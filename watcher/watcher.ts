import { watch } from "node:fs";

export type FileChangeEvent = {
  type: "add" | "change" | "remove";
  path: string;
};

export function watchWorkspace(
  path: string,
  callback: (event: FileChangeEvent) => void,
) {
  const watcher = watch(
    path,
    {
      recursive: true,
    },
    (eventType, filename) => {
      if (!filename) {
        return;
      }

      callback({
        type:
          eventType === "rename"
            ? "change"
            : "change",
        path: filename,
      });
    },
  );

  return watcher;
}
