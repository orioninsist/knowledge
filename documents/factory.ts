import type { SearchEngine } from "../search/engine";
import { DocumentService } from "./service";

export function createDocumentService(
  engine: SearchEngine,
) {
  return new DocumentService(engine);
}
