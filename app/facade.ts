import type { RendererContract } from "../renderer/contract";
import type { ApplicationLifecycle } from "./lifecycle";

export interface ApplicationFacade {
  renderer: RendererContract;
  shutdown(): void;
}

export function createApplicationFacade(
  renderer: RendererContract,
  lifecycle: ApplicationLifecycle,
): ApplicationFacade {
  return {
    renderer,

    shutdown() {
      lifecycle.shutdown();
    },
  };
}
