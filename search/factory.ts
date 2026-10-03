import { SearchService } from "./service";
import type { SearchStorage } from "./storage";

export function createSearchService(
  storage: SearchStorage,
) {
  return new SearchService(storage);
}
