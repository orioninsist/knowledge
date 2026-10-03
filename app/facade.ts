import type { RendererContract } from "../renderer/contract";
import type { ApplicationLifecycle } from "./lifecycle";
import type { ApplicationApi } from "./api";
import { createApplicationApi } from "./api";

export interface ApplicationFacade {
  api: ApplicationApi;
  shutdown(): void;
}

export function createApplicationFacade(
  renderer: RendererContract,
  lifecycle: ApplicationLifecycle,
): ApplicationFacade {
  return {
    api: createApplicationApi(renderer),

    shutdown() {
      lifecycle.shutdown();
    },
  };
}
