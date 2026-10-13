"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2Icon, SparklesIcon, WandIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import { useRecommend, useSemanticSearch } from "../api/use-ai-search";

const BUDGET_OPTIONS = [
  { value: "", label: "Any budget" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/**
 * Semantic search and recommendations.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426). Shown alongside the
 * keyword filters rather than replacing them: lexical filtering on industry and
 * location is exact and cheap, while this surface is for "I need something that
 * does X" queries the keyword path cannot express.
 *
 * Both panels are submit-driven rather than live, so neither spends a model call
 * per keystroke.
 */
export function AiSearchPanels() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");

  const semanticSearch = useSemanticSearch();
  const recommend = useRecommend();

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim()) semanticSearch.mutate(query.trim());
  }

  function handleRecommend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (category.trim()) {
      recommend.mutate({
        category: category.trim(),
        budget: budget || undefined,
        location: location.trim() || undefined,
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
              Semantic search
            </h2>
            <p className="text-sm text-muted-foreground">
              Describe what you need in your own words and get ranked matches.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              id="ai-search-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. someone to run my cloud backups"
              aria-label="Describe the service you need"
            />
            <Button type="submit" loading={semanticSearch.isPending}>
              <SparklesIcon />
              Search
            </Button>
          </form>

          {semanticSearch.isError && (
            <AlertMessage tone="error">
              {semanticSearch.error instanceof Error
                ? semanticSearch.error.message
                : "Semantic search failed."}
            </AlertMessage>
          )}

          {semanticSearch.data && semanticSearch.data.length === 0 && (
            <EmptyState
              icon={SparklesIcon}
              title="No semantic matches"
              description="Try rephrasing, or use the keyword filters above."
            />
          )}

          {semanticSearch.data && semanticSearch.data.length > 0 && (
            <ul className="space-y-2">
              {semanticSearch.data.map((hit, index) => (
                <li key={`${hit.id ?? hit.name}-${index}`} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{hit.name}</span>
                    <Badge variant="muted">{Math.round((hit.score ?? 0) * 100)}% match</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{hit.reason}</p>
                  {hit.id && (
                    <Link
                      href={`/organizations/${hit.id}`}
                      className="mt-1.5 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      View profile
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <WandIcon className="size-4 text-primary" aria-hidden="true" />
              Recommendations
            </h2>
            <p className="text-sm text-muted-foreground">
              Tell us the category and budget, and get a shortlist with reasons.
            </p>
          </div>

          <form onSubmit={handleRecommend} className="space-y-3">
            <Field id="ai-recommend-category" label="Category">
              <Input
                id="ai-recommend-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="e.g. cloud hosting"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="ai-recommend-budget" label="Budget">
                <Select
                  id="ai-recommend-budget"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                >
                  {BUDGET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="ai-recommend-location" label="Location">
                <Input
                  id="ai-recommend-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="City"
                />
              </Field>
            </div>

            <Button type="submit" loading={recommend.isPending} className="w-full">
              {recommend.isPending ? (
                <>
                  <Loader2Icon className="animate-spin" aria-hidden="true" />
                  Building shortlist…
                </>
              ) : (
                <>
                  <WandIcon />
                  Get recommendations
                </>
              )}
            </Button>
          </form>

          {recommend.isError && (
            <AlertMessage tone="error">
              {recommend.error instanceof Error
                ? recommend.error.message
                : "Could not build recommendations."}
            </AlertMessage>
          )}

          {recommend.data && recommend.data.length === 0 && (
            <EmptyState
              icon={WandIcon}
              title="No recommendations"
              description="No provider matched that category and budget."
            />
          )}

          {recommend.data && recommend.data.length > 0 && (
            <ol className="space-y-2">
              {recommend.data.map((item, index) => (
                <li key={item.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      <span className="mr-2 text-sm text-muted-foreground">#{index + 1}</span>
                      {item.name}
                    </span>
                    <Badge variant="accent">{Math.round(item.score * 100)}% fit</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                  <Link
                    href={`/organizations/${item.id}`}
                    className="mt-1.5 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    View profile
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
