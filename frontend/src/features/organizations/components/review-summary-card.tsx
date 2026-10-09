"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";

import { AlertMessage } from "@/components/shared/alert-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAiReviewSummaryTask, useRequestAiReviewSummary } from "../api/use-organization";

/**
 * Async AI review summary.
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426).
 *
 * The request returns a task id, not a summary, so this renders the whole task
 * lifecycle rather than a single spinner: queued, running, settled, and failed
 * are all distinct. Generation is user-initiated rather than automatic because
 * it costs a model call, and silently spending one on every page view would be
 * the wrong default.
 *
 * Visible to every viewer, not just the owner: it summarises public reviews, and
 * hiding it would remove the feature's main customer-facing value.
 */
export function ReviewSummaryCard({ organizationId }: { organizationId: string }) {
  const [taskId, setTaskId] = useState<string | null>(null);

  const requestSummary = useRequestAiReviewSummary();
  const task = useAiReviewSummaryTask(organizationId, taskId);

  const status = task.data?.status;
  const summary = task.data?.result;

  function handleGenerate() {
    requestSummary.mutate(organizationId, {
      onSuccess: (data) => setTaskId(data.task_id),
    });
  }

  const isRunning = requestSummary.isPending || (status === "PENDING" || status === "PROCESSING");
  const hasFailed = status === "FAILURE" || requestSummary.isError;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            AI review summary
          </CardTitle>
          <CardDescription>
            Generated from the reviews on file. Generation runs in the background.
          </CardDescription>
        </div>

        <Button
          size="sm"
          onClick={handleGenerate}
          loading={isRunning}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <Loader2Icon className="animate-spin" aria-hidden="true" />
              Generating…
            </>
          ) : (
            <>
              <SparklesIcon />
              {summary ? "Regenerate" : "Generate summary"}
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {requestSummary.isError && (
          <AlertMessage tone="error">
            {requestSummary.error instanceof Error
              ? requestSummary.error.message
              : "Could not start the summary."}
          </AlertMessage>
        )}

        {hasFailed && !requestSummary.isError && (
          <AlertMessage tone="error">The summary job did not complete. Try again.</AlertMessage>
        )}

        {isRunning && !summary && (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-16 w-full" />
            <span className="sr-only" role="status">
              Generating the review summary.
            </span>
          </div>
        )}

        {/*
          Deliberately not gated on `!isRunning`. While a regeneration is in
          flight the previously generated summary stays on screen; the button
          already shows the spinner and is disabled. Hiding the summary here
          blanked the card body until the new result arrived, which reads as the
          card having lost its content.
        */}
        {summary && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Derived from on-file reviews</Badge>
              {typeof summary.sentiment_score === "number" && (
                <span className="text-xs text-muted-foreground">
                  Sentiment {Math.round(summary.sentiment_score * 100)}% positive
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">{summary.summary}</p>

            {summary.strengths.length > 0 && (
              <InsightList
                tone="positive"
                icon={ThumbsUpIcon}
                heading="Strengths"
                items={summary.strengths}
              />
            )}

            {summary.weaknesses.length > 0 && (
              <InsightList
                tone="negative"
                icon={ThumbsDownIcon}
                heading="Weaknesses"
                items={summary.weaknesses}
              />
            )}
          </>
        )}

        {!summary && !isRunning && !hasFailed && !requestSummary.isError && (
          <p className="text-sm text-muted-foreground">
            No summary generated yet for this organization.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InsightList({
  heading,
  items,
  icon: Icon,
  tone,
}: {
  heading: string;
  items: string[];
  icon: typeof ThumbsUpIcon;
  tone: "positive" | "negative";
}) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Icon
          className={tone === "positive" ? "size-4 text-success" : "size-4 text-destructive"}
          aria-hidden="true"
        />
        {heading}
      </h3>
      <ul className="space-y-1.5 pl-6">
        {items.map((item) => (
          <li key={item} className="list-disc text-sm text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}