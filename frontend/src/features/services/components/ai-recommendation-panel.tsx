"use client";

import React, { useState } from "react";
import {
  fetchAIRecommendation,
  ProviderInput,
  RecommendationResponse,
} from "../api/ai-recommendation";

interface AIRecommendationPanelProps {
  providers: ProviderInput[];
}

export const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = ({
  providers,
}) => {
  const [requirement, setRequirement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requirement.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAIRecommendation({ requirement, providers });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching recommendation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-2 text-xl font-bold tracking-tight">AI Service Assistant</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Describe what service you need in natural language, and AI will evaluate the best match.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full rounded-md border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          rows={3}
          placeholder="e.g., I need an affordable software development company in Addis Ababa for a small business."
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading || !requirement.trim()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Analyzing Providers..." : "Get AI Recommendation"}
        </button>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Recommendation Results Output */}
      {result && (
        <div className="mt-6 rounded-md border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-base">Recommendation Result</h4>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Match Score: {result.match_score}%
            </span>
          </div>

          <p className="text-sm leading-relaxed">{result.recommendation}</p>

          {result.reasons.length > 0 && (
            <div>
              <span className="text-xs font-bold uppercase text-muted-foreground">
                Key Reasons
              </span>
              <ul className="mt-1 list-disc list-inside text-sm space-y-1">
                {result.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {result.alternatives.length > 0 && (
            <div>
              <span className="text-xs font-bold uppercase text-muted-foreground">
                Considered Alternatives
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.alternatives.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};