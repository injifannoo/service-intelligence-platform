import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": src("./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    /**
     * Next.js compiles `next/link` and `next/navigation` into the client bundle;
     * Vitest has no such handling, and the real modules cannot be resolved
     * outside a Next build.
     *
     * The aliases must be per-module. A single `"next"` entry would match by
     * prefix and resolve `next/link` to `<stub>/link`, which fails to resolve.
     *
     * Only modules actually imported by components are stubbed. Anything else
     * fails loudly rather than being swallowed by a catch-all.
     */
    alias: [
      { find: /^next\/link$/, replacement: src("./src/test/stubs/next-link.tsx") },
      { find: /^next\/navigation$/, replacement: src("./src/test/stubs/next-navigation.ts") },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary"],
      // The Definition of Done requires tests to pass, not 100% coverage. These
      // thresholds guard the logic that is expensive to verify by hand while
      // tolerating thin passthrough modules.
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 50,
        statements: 60,
      },
    },
  },
});
