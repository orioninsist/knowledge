export interface ApplicationLifecycle {
  shutdown(): void;
}

export function createLifecycle(
  watchers: { close(): void }[],
): ApplicationLifecycle {
  return {
    shutdown() {
      for (const watcher of watchers) {
        watcher.close();
      }
    },
  };
}
