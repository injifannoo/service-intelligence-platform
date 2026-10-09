import { describe, expect, it } from "vitest";

import { adminKeys } from "./use-admin";

// `landingRouteForRole` is covered in src/config/site-config.test.ts, next to the
// implementation. This file covers only the admin cache keys.

describe("admin query keys", () => {
  it("keys the user list by its filters so two filter sets do not share a cache entry", () => {
    expect(adminKeys.users({ query: "a" })).not.toEqual(adminKeys.users({ query: "b" }));
  });

  it("distinguishes an active filter from an absent one", () => {
    // `status: false` is a real filter (deactivated accounts), not a missing one,
    // so it must not collide with the unfiltered list.
    expect(adminKeys.users({ status: false })).not.toEqual(adminKeys.users({}));
  });

  it("nests stats and users under the all key so they invalidate together", () => {
    // An admin mutation invalidates `adminKeys.all`; a detached key would silently
    // stop the table refreshing after a role change.
    for (const key of [adminKeys.stats(), adminKeys.users({})]) {
      expect(adminKeys.all.every((part, index) => key[index] === part)).toBe(true);
    }
  });
});
