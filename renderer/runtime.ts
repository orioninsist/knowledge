import type { ApplicationContext } from "../app/context";
import {
  createRendererContract,
} from "./contract";

export function createRendererRuntime(
  context: ApplicationContext,
) {
  return createRendererContract(context);
}
