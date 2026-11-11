import MiniSearch from "minisearch";
import { parseIntent, rank, type Intent, type Rankable, type Scored } from "@/lib/search";

const STOP_WORDS = new Set(["the", "for", "and", "with", "need", "want", "company", "provider", "team", "find", "someone", "that", "can", "my", "a", "to", "in"]);
const SYNONYMS: Record<string, string[]> = {
  website: ["web", "platform"], websites: ["web", "platform"],
  hacker: ["security", "pentest"], hacking: ["security", "pentest"],
  secure: ["security", "cybersecurity"], protection: ["security"],
  shop: ["e-commerce", "web"], store: ["e-commerce", "web"],
  smartphone: ["mobile", "app"], application: ["app"],
  infrastructure: ["cloud", "devops"], automation: ["software", "erp"],
};

/** Local synonym expansion, not an embedding or paid model call. */
export function interpretLocally(query: string): Intent {
  const tokens = query.toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter(Boolean);
  const expanded = tokens.flatMap((token) => SYNONYMS[token] ?? []);
  const intent = parseIntent([...tokens, ...expanded].join(" "));
  return { ...intent, raw: query, keywords: [...new Set([...tokens, ...expanded])].filter((token) => !STOP_WORDS.has(token) && token.length > 2) };
}

export function smartRank<T extends Rankable>(intent: Intent, organizations: T[]): Scored<T>[] {
  const base = rank(intent, organizations);
  if (!intent.keywords.length) return base;
  const index = new MiniSearch({
    fields: ["name", "category", "services", "tagline", "industries"],
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: "OR", boost: { category: 2, services: 2 } },
  });
  index.addAll(organizations.map((org, id) => ({ ...org, id, services: org.services.join(" "), industries: org.industries.join(" ") })));
  const matches = index.search(intent.keywords.join(" "));
  const best = Math.max(...matches.map((match) => match.score), 1);
  const scores = new Map(matches.map((match) => [organizations[Number(match.id)], match]));
  return base.map((result) => {
    const match = scores.get(result.org);
    if (!match) return result;
    const categoryMatch = Object.values(match.match).some((fields) => fields.includes("category"));
    return { ...result, score: result.score + Math.round((match.score / best) * 40) + (categoryMatch ? 30 : 0), reasons: [...result.reasons, `Matches ${match.terms.slice(0, 3).join(", ")}`] };
  }).sort((a, b) => b.score - a.score);
}