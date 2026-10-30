import type * as React from "react";

/**
 * Test stub for `next/link`.
 *
 * Aliased per-module in `vitest.config.ts`. A single `"next"` alias does not
 * work: Vite's string alias does prefix matching, so `next/link` would resolve to
 * `<stub>/link`, which does not exist.
 *
 * Renders a plain anchor so assertions can read the real `href`. Next-only props
 * are dropped because the DOM warns on unknown attributes.
 */

type LinkOnlyProps =
  | "prefetch"
  | "replace"
  | "scroll"
  | "passHref"
  | "legacyBehavior"
  | "shallow"
  | "locale"
  | "as";

const LINK_ONLY: readonly LinkOnlyProps[] = [
  "prefetch",
  "replace",
  "scroll",
  "passHref",
  "legacyBehavior",
  "shallow",
  "locale",
  "as",
];

export default function Link({
  href,
  children,
  ...props
}: { href: string; children?: React.ReactNode } & Omit<
  React.ComponentProps<"a">,
  "href"
>) {
  const anchorProps: Record<string, unknown> = { ...props };
  for (const key of LINK_ONLY) delete anchorProps[key];

  return (
    <a href={href} {...anchorProps}>
      {children}
    </a>
  );
}
