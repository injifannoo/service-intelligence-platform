import { useEffect } from "react";
import { btnGhost } from "@/components/shared/site";
import type { OrgView } from "@/lib/metrics";
import { useComparisonSummary } from "../api/use-comparison-summary";

export function AiComparisonSummary({ orgs }: { orgs: OrgView[] }) {
  const m = useComparisonSummary();
  const key = orgs.map((o) => o.id).join(",");
  useEffect(() => {
    m.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <section className="mt-10 rounded-lg border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-xs text-accent">AI comparison</p>
          <h2 className="text-2xl">Which one fits you?</h2>
        </div>
        <button className={btnGhost} disabled={m.isPending} onClick={() => m.mutate(orgs)}>
          {m.isPending ? "Analyzing…" : m.data ? "Regenerate" : "Generate AI summary"}
        </button>
      </div>
      {m.error && <p className="mt-4 text-sm text-destructive">{(m.error as Error).message}</p>}
      {m.data && (
        <div className="mt-5 space-y-5">
          <p className="text-muted-foreground">{m.data.overview}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {m.data.picks.map((p) => (
              <div key={p.name} className="rounded-md border p-4">
                <p className="font-display text-lg">{p.name}</p>
                <p className="mt-1 text-sm"><span className="text-success">Best for:</span> {p.bestFor}</p>
                <p className="mt-1 text-sm"><span className="text-destructive">Trade-off:</span> {p.tradeoff}</p>
              </div>
            ))}
          </div>
          <p className="rounded-md bg-primary/5 p-4 text-sm font-medium text-primary">{m.data.verdict}</p>
          <p className="text-xs text-muted-foreground">AI recommendations are advisory only. Confirm details with providers.</p>
        </div>
      )}
    </section>
  );
}
