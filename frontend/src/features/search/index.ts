/**
 * Public API surface for the search slice.
 *
 * Features are consumed exclusively through this barrel
 * (docs/07_Project_Structure.md:219).
 */
export { SearchPanel } from "./components/search-panel";

export { searchApi } from "./api/search";
export type { SearchFilters } from "./api/search";
export { searchKeys, useSearch } from "./api/use-search";

export { useSearchUiStore } from "./store/search-store";

export type { SearchResults, SemanticSearchHit } from "./types";
