import type { RendererContract } from "../../renderer/contract";

export interface ApplicationApi {
  renderer: RendererContract;
}

export function createApplicationApi(
  renderer: RendererContract,
): ApplicationApi {
  return {
    renderer,
  };
}
