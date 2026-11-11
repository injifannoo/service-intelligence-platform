export type ComparisonSummary = {
  overview: string;
  picks: { name: string; bestFor: string; tradeoff: string }[];
  verdict: string;
};
