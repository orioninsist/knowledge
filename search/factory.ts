import { SearchService } from "./service";
import type { SearchEngine } from "./engine";

export function createSearchService(
  engine: SearchEngine,
) {
  return new SearchService(engine);
}
