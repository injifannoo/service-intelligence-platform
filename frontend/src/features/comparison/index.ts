/**
 * Public API surface for the comparison slice.
 *
 * Features are consumed exclusively through this barrel
 * (docs/07_Project_Structure.md:219).
 */
export { ComparisonBuilder } from "./components/comparison-builder";
export { ComparisonTable } from "./components/comparison-table";

export { comparisonApi } from "./api/get-comparison";
export { comparisonKeys, useCompare } from "./api/use-comparison";

export type {
  Comparison,
  ComparisonRequest,
  ComparisonResult,
  ComparisonRow,
} from "./types";

export { COMPARISON_CRITERIA, criterionLabel } from "./comparison-criteria";
