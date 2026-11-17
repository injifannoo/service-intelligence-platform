export const siteConfig = {
  name: "ASIP",
  description: "AI-Powered Service Intelligence Platform — Addis Ababa, Ethiopia.",
  /** Empty = talk to Lovable Cloud / data.ts directly. Set to Django API only when USE_DEV_BACKEND is true. */
  apiBaseUrl:
    process.env.NEXT_PUBLIC_USE_DEV_BACKEND === "true"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.VITE_API_BASE_URL ?? "")
      : "",
  aiEngineUrl:
    process.env.NEXT_PUBLIC_USE_DEV_BACKEND === "true"
      ? (process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? process.env.VITE_AI_ENGINE_URL ?? "")
      : "",
  maxCompare: 4,
} as const;