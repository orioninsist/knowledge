import type { RendererContract } from "../../renderer/contract";
import type { ApplicationApi } from "./types";

export type { ApplicationApi };

export function createApplicationApi(
  renderer: RendererContract,
): ApplicationApi {
  return {
    search: renderer.search,
    getDocuments: renderer.getDocuments,
    getWorkspaces: renderer.getWorkspaces,
  };
}
