"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  Building2Icon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/site-config";
import { useSemanticSearch, useSearchUiStore } from "@/features/search";

/**
 * AI-powered Semantic Search for the Hero Section.
 *
 * Translates natural language descriptions (e.g. "cloud migration experts with high rating")
 * directly into semantically-ranked provider recommendations with AI reasoning and match scores.
 * Also allows hitting Enter to transition into the main search workspace.
 */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const semanticSearch = useSemanticSearch();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsOpen(true);
    semanticSearch.mutate(trimmed);
  }

  function handleViewAllResults() {
    const trimmed = query.trim();
    useSearchUiStore.getState().setFilters({ query: trimmed || undefined });
    router.push(ROUTES.search);
  }

  const results = semanticSearch.data ?? [];
  const hasResults = results.length > 0;
  const isNoMatch =
    semanticSearch.isSuccess && !semanticSearch.isPending && results.length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form
        onSubmit={handleSearch}
        role="search"
        className="flex w-full items-center gap-2 rounded-2xl border border-primary/20 bg-card p-2 shadow-lg ring-1 ring-primary/10 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
      >
        <Label htmlFor="hero-search" className="sr-only">
          What service or capability are you looking for?
        </Label>
        <span className="ml-2 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <SparklesIcon className="size-4" aria-hidden="true" />
        </span>
        <Input
          id="hero-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Describe what you need in plain words (e.g. cloud backup with 24/7 support)"
          className="h-11 flex-1 border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            aria-label="Clear query"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={semanticSearch.isPending || !query.trim()}
          className="shrink-0 gap-1.5 px-5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {semanticSearch.isPending ? (
            <>
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              <span>Analyzing…</span>
            </>
          ) : (
            <>
              <SparklesIcon className="size-4" aria-hidden="true" />
              <span>AI Search</span>
            </>
          )}
        </Button>
      </form>

      {/* Semantic Results Dropdown */}
      {isOpen && (semanticSearch.isPending || hasResults || isNoMatch || semanticSearch.isError) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[26rem] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <SparklesIcon className="size-3.5" />
              Semantic Matches &amp; Reasoning
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>

          {/* Loading state */}
          {semanticSearch.isPending && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Loader2Icon className="size-6 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">
                AI is searching providers matching &quot;{query}&quot;…
              </p>
            </div>
          )}

          {/* Error state */}
          {semanticSearch.isError && (
            <div className="py-4 text-center text-xs text-destructive">
              Could not complete AI semantic search. Please try again.
            </div>
          )}

          {/* Empty state */}
          {isNoMatch && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No direct semantic match found. Try describing specific service needs.
            </div>
          )}

          {/* Result items */}
          {hasResults && (
            <ul className="mt-3 space-y-2.5">
              {results.slice(0, 5).map((hit, idx) => (
                <li
                  key={`${hit.id ?? hit.name}-${idx}`}
                  className="group rounded-xl border border-border/80 bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-muted/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Building2Icon className="size-4 text-primary shrink-0" />
                      {hit.name}
                    </span>
                    {hit.score !== undefined && (
                      <Badge variant="accent" className="text-[10px]">
                        {Math.round((hit.score ?? 0) * 100)}% Match
                      </Badge>
                    )}
                  </div>

                  {hit.reason && (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {hit.reason}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between pt-1">
                    {hit.id ? (
                      <Link
                        href={`/organizations/${hit.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        onClick={() => setIsOpen(false)}
                      >
                        View profile &amp; services
                        <ArrowRightIcon className="size-3" />
                      </Link>
                    ) : (
                      <span />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Footer jump to full search */}
          {hasResults && (
            <div className="mt-3 border-t border-border pt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewAllResults}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all in full search catalog →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
