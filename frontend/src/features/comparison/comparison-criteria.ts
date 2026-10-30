/**
 * Comparison criteria.
 *
 * docs/02:189-199 lists what a customer compares organizations by (rating,
 * reviews, price, services, location, AI score) and docs/09:380 specifies the
 * same evaluation plus verification status. One list backs both the builder's
 * checkboxes and the matrix's row headers, so a criterion cannot be offered by
 * the form and then render as a bare, unlabelled key.
 */
export const COMPARISON_CRITERIA = [
  { value: "sentiment", label: "AI score" },
  { value: "rating", label: "Customer rating" },
  { value: "reviews", label: "Reviews" },
  { value: "price", label: "Price" },
  { value: "services", label: "Services offered" },
  { value: "location", label: "Location" },
  { value: "verification", label: "Verification status" },
] as const;

export type ComparisonCriterion = (typeof COMPARISON_CRITERIA)[number]["value"];

/**
 * Display label for a criterion echoed back by the API.
 *
 * The request accepts any string, so an unrecognized value falls through to
 * itself rather than rendering as an empty row header.
 */
export function criterionLabel(criterion: string): string {
  const match = COMPARISON_CRITERIA.find(
    (item) => item.value === criterion.trim().toLowerCase(),
  );
  return match?.label ?? criterion;
}
