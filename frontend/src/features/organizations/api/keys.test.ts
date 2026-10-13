import { describe, expect, it } from "vitest";

import { organizationKeys } from "./use-organization";

describe("organization query keys", () => {
  it("keys the list by its filters so two filter sets do not share a cache entry", () => {
    expect(organizationKeys.list({ industry: "Software" })).not.toEqual(
      organizationKeys.list({ industry: "AI" }),
    );
  });

  it("treats an empty filter object as its own key", () => {
    expect(organizationKeys.list({})).toEqual(organizationKeys.list({}));
  });

  it("nests detail keys under the all key so they invalidate together", () => {
    // `useInvalidateOrganizations` invalidates `organizationKeys.all`, which only
    // reaches the detail key because it is a prefix match. A detached key would
    // silently stop the profile refreshing after a mutation.
    const all = organizationKeys.all;
    const detail = organizationKeys.detail("org-a");

    expect(all.every((part, index) => detail[index] === part)).toBe(true);
    expect(detail).toContain("org-a");
  });

  it("scopes AI task keys by organization so one tenant's task is never reused", () => {
    // docs/08_Development_Roadmap.md:533 rates cross-tenant leakage as Critical.
    expect(organizationKeys.aiSummaryTask("org-a", "task-1")).not.toEqual(
      organizationKeys.aiSummaryTask("org-b", "task-1"),
    );
  });
});