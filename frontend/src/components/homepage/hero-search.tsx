"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROUTES } from "@/config/site-config";
import { useSearchUiStore } from "@/features/search";

/**
 * Hero search box.
 *
 * The search page reads its filters from the shared UI store rather than the
 * URL, so seeding the store here is what makes this box actually land on a
 * filtered result set instead of an unfiltered one.
 */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    useSearchUiStore.getState().setFilters({ query: trimmed || undefined });
    router.push(ROUTES.search);
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-md"
    >
      <Label htmlFor="hero-search" className="sr-only">
        What service are you looking for?
      </Label>
      <SearchIcon
        className="ml-2 size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id="hero-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="What service are you looking for?"
        className="h-11 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
      />
      <Button type="submit" size="lg" className="shrink-0 px-5">
        <SearchIcon aria-hidden="true" />
        <span className="hidden sm:inline">Search</span>
      </Button>
    </form>
  );
}
