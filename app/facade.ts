import type { ApplicationApi } from "./api/types";
import type { ApplicationLifecycle } from "./lifecycle";
import type { ApplicationApi } from "./api";
import { createApplicationApi } from "./api";

export interface ApplicationFacade {
  api: ApplicationApi;
  shutdown(): void;
}

export function createApplicationFacade(
  api: ApplicationApi,
  lifecycle: ApplicationLifecycle,
): ApplicationFacade {
  return {
    api: createApplicationApi(api),

    shutdown() {
      lifecycle.shutdown();
    },
  };
}
