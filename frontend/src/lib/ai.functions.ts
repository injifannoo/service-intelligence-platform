"use server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callJson(system: string, user: string, schema: Record<string, unknown>) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [{ type: "function", function: { name: "respond", parameters: schema } }],
      tool_choice: { type: "function", function: { name: "respond" } },
    }),
  });
  if (res.status === 429) throw new Error("AI is busy, please try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const json = await res.json();
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  return JSON.parse(args ?? "{}");
}

/** Regenerates an organization's AI review summary + sentiment from its published reviews. */
export async function refreshInsights({ data }: { data: { orgId: string } }) {
  await requireSupabaseAuth();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id,name,category")
    .eq("id", data.orgId)
    .maybeSingle();

  if (!org) throw new Error("Organization not found");

  const { data: reviews } = await supabaseAdmin
    .from("reviews")
    .select("rating, body")
    .eq("org_id", org.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(80);

  const list = reviews ?? [];
  if (!list.length) {
    await supabaseAdmin.from("ai_insights").upsert({
      org_id: org.id,
      summary: "No reviews yet.",
      strengths: [],
      issues: [],
      sentiment_positive: 0,
      sentiment_neutral: 0,
      sentiment_negative: 0,
      main_complaint: "",
      recommendation: "Invite your first customers to leave a review.",
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  const out = await callJson(
    "You analyze customer reviews of service providers in Ethiopia. Be factual, concise and neutral. Percentages must sum to 100.",
    `Organization: ${org.name} (${org.category})\nReviews:\n${list.map((r) => `- [${r.rating}/5] ${r.body}`).join("\n")}`,
    {
      type: "object",
      properties: {
        summary: { type: "string", description: "2 sentence summary of what customers say" },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "up to 3 short phrases",
        },
        issues: {
          type: "array",
          items: { type: "string" },
          description: "up to 3 short phrases",
        },
        sentiment_positive: { type: "integer" },
        sentiment_neutral: { type: "integer" },
        sentiment_negative: { type: "integer" },
        main_complaint: { type: "string" },
        recommendation: {
          type: "string",
          description: "one concrete, measurable business improvement",
        },
      },
      required: [
        "summary",
        "strengths",
        "issues",
        "sentiment_positive",
        "sentiment_neutral",
        "sentiment_negative",
        "main_complaint",
        "recommendation",
      ],
    },
  );

  await supabaseAdmin.from("ai_insights").upsert({
    org_id: org.id,
    summary: String(out.summary ?? ""),
    strengths: (out.strengths ?? []).slice(0, 3),
    issues: (out.issues ?? []).slice(0, 3),
    sentiment_positive: Number(out.sentiment_positive) || 0,
    sentiment_neutral: Number(out.sentiment_neutral) || 0,
    sentiment_negative: Number(out.sentiment_negative) || 0,
    main_complaint: String(out.main_complaint ?? ""),
    recommendation: String(out.recommendation ?? ""),
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}

/** Turns a natural-language need into structured search intent. Advisory only; falls back to local parsing on the client. */
export async function understandQuery({ data }: { data: { q: string } }) {
  const query = String(data.q ?? "").slice(0, 300);
  if (!query.trim()) return null;

  try {
    return (await callJson(
      "Extract search intent for a service-provider marketplace in Addis Ababa. Only use the allowed values.",
      query,
      {
        type: "object",
        properties: {
          categories: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "Software Development",
                "Mobile Apps",
                "IT Consulting",
                "Cloud & DevOps",
                "Cybersecurity",
                "UI/UX Design",
                "Digital Marketing",
                "Data & AI",
              ],
            },
          },
          industries: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "fintech",
                "banking",
                "telecom",
                "startups",
                "e-commerce",
                "education",
                "government",
                "healthcare",
                "ngos",
                "agriculture",
                "manufacturing",
                "hospitality",
              ],
            },
          },
          budget: {
            type: "integer",
            enum: [0, 1, 2, 3],
            description: "0 unknown, 1 affordable, 2 mid, 3 premium",
          },
          fastResponse: { type: "boolean" },
          verifiedOnly: { type: "boolean" },
          explanation: {
            type: "string",
            description: "one short sentence restating what the user needs",
          },
        },
        required: [
          "categories",
          "industries",
          "budget",
          "fastResponse",
          "verifiedOnly",
          "explanation",
        ],
      },
    )) as {
      categories: string[];
      industries: string[];
      budget: number;
      fastResponse: boolean;
      verifiedOnly: boolean;
      explanation: string;
    };
  } catch {
    return null;
  }
}

/** Side-by-side AI trade-off analysis for 2–4 providers. Advisory only; uses public profile data. */
export async function compareProviders({ data }: { data: { orgs: { name: string; facts: string }[] } }) {
  const orgs = (data.orgs ?? []).slice(0, 4).map((o) => ({
    name: String(o.name).slice(0, 120),
    facts: String(o.facts).slice(0, 1200),
  }));

  if (orgs.length < 2) throw new Error("Select at least two providers.");

  return (await callJson(
    "You compare service providers in Addis Ababa for a buyer. Be neutral, factual and concise. Only use the facts given.",
    orgs.map((o) => `## ${o.name}\n${o.facts}`).join("\n\n"),
    {
      type: "object",
      properties: {
        overview: { type: "string", description: "2 sentence overall comparison" },
        picks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              bestFor: { type: "string", description: "short phrase: who should pick this provider" },
              tradeoff: { type: "string", description: "main weakness vs the others" },
            },
            required: ["name", "bestFor", "tradeoff"],
          },
        },
        verdict: { type: "string", description: "one sentence recommendation with condition" },
      },
      required: ["overview", "picks", "verdict"],
    },
  )) as {
    overview: string;
    picks: { name: string; bestFor: string; tradeoff: string }[];
    verdict: string;
  };
}