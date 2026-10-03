import type { ApplicationContext } from "./context";

export interface ApplicationLifecycle {
  shutdown(): void;
}

export function createLifecycle(
  context: ApplicationContext & {
    watchers: { close(): void }[];
  },
): ApplicationLifecycle {
  return {
    shutdown() {
      for (const watcher of context.watchers) {
        watcher.close();
      }
    },
  };
}
