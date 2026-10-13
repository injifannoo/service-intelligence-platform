import { beforeEach, describe, expect, it } from "vitest";

import {
  getHomepageSettings,
  resetDevBackend,
  updateHomepageSettings,
} from "@/lib/dev-backend/store";

/**
 * Homepage settings invariants.
 *
 * The store is a document of defaults plus a merge of boolean toggles. These
 * tests assert the merge is safe against malformed input, because an admin
 * client and a public reader share the same stored object.
 */
describe("homepage settings", () => {
  beforeEach(() => {
    resetDevBackend();
  });

  it("starts with every section visible", () => {
    const settings = getHomepageSettings();
    expect(Object.values(settings.sections).every(Boolean)).toBe(true);
    expect(Object.keys(settings.sections)).toHaveLength(8);
  });

  it("persists a section being switched off", () => {
    updateHomepageSettings({ sections: { hero: false } });
    expect(getHomepageSettings().sections.hero).toBe(false);
    expect(getHomepageSettings().sections.metrics).toBe(true);
  });

  it("leaves untouched sections alone on a partial update", () => {
    updateHomepageSettings({ sections: { finalCta: false, categories: false } });
    const settings = getHomepageSettings();
    expect(settings.sections.finalCta).toBe(false);
    expect(settings.sections.categories).toBe(false);
    expect(settings.sections.whyChoose).toBe(true);
  });

  it("ignores unknown keys", () => {
    const before = getHomepageSettings().sections;
    updateHomepageSettings({ sections: { notASection: false } as never });
    expect(getHomepageSettings().sections).toEqual(before);
  });

  it("ignores non-boolean values", () => {
    updateHomepageSettings({ sections: { hero: "off" as never } });
    expect(getHomepageSettings().sections.hero).toBe(true);
  });

  it("restores every section when the backend is reseeded", () => {
    resetDevBackend();
    const settings = getHomepageSettings();
    expect(Object.values(settings.sections).every(Boolean)).toBe(true);
  });
});