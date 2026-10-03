import type { RendererContract } from "../../renderer/contract";

export interface ApplicationApi {
  search: RendererContract["search"];
  getDocuments: RendererContract["getDocuments"];
  getWorkspaces: RendererContract["getWorkspaces"];
}

export function createApplicationApi(
  renderer: RendererContract,
): ApplicationApi {
  return {
    search: renderer.search,
    getDocuments: renderer.getDocuments,
    getWorkspaces: renderer.getWorkspaces,
  };
}
