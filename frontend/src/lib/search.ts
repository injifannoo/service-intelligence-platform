export type Rankable = {
  name: string;
  tagline: string;
  category: string;
  services: string[];
  industries: string[];
  priceTier: number;
  responseHours: number;
  verified: boolean;
  trustScore: number;
  rating: number;
  sentiment: { positive: number };
};

export type Intent = {
  raw: string;
  keywords: string[];
  industries: string[];
  categories: string[];
  budget?: 1 | 2 | 3 | undefined;
  fastResponse: boolean;
  verifiedOnly: boolean;
};

const INDUSTRY_WORDS = [
  "fintech",
  "banking",
  "telecom",
  "startups",
  "startup",
  "e-commerce",
  "ecommerce",
  "education",
  "government",
  "healthcare",
  "hospital",
  "ngos",
  "agriculture",
  "manufacturing",
  "hospitality",
];

const CATEGORY_HINTS: Record<string, string[]> = {
  "Software Development": ["software", "web", "platform", "api", "develop", "build"],
  "Mobile Apps": ["mobile", "app", "flutter", "android", "ios", "mvp"],
  "IT Consulting": ["erp", "odoo", "consult", "strategy"],
  "Cloud & DevOps": ["cloud", "devops", "hosting", "kubernetes", "migration", "aws"],
  Cybersecurity: ["security", "pentest", "penetration", "audit", "soc"],
  "UI/UX Design": ["design", "ux", "ui", "research"],
  "Digital Marketing": ["marketing", "seo", "ads", "telegram", "social"],
  "Data & AI": ["data", "ai", "machine", "analytics", "dashboard", "nlp", "amharic"],
};

export function parseIntent(q: string): Intent {
  const s = q.toLowerCase();
  const keywords = s.split(/[^a-z0-9-]+/).filter((w) => w.length > 2);
  const industries = INDUSTRY_WORDS.filter((w) => s.includes(w)).map((w) =>
    w === "startup"
      ? "startups"
      : w === "ecommerce"
        ? "e-commerce"
        : w === "hospital"
          ? "healthcare"
          : w,
  );
  const categories = Object.entries(CATEGORY_HINTS)
    .filter(([, hints]) => hints.some((h) => s.includes(h)))
    .map(([c]) => c);
  let budget: Intent["budget"];
  if (/(cheap|affordable|low budget|budget|startup budget|inexpensive)/.test(s)) budget = 1;
  else if (/(premium|enterprise|best quality|top)/.test(s)) budget = 3;
  return {
    raw: q,
    keywords,
    industries: [...new Set(industries)],
    categories,
    budget,
    fastResponse: /(fast|quick|urgent|responsive)/.test(s),
    verifiedOnly: /(verified|trusted|certified)/.test(s),
  };
}

export type Scored<T extends Rankable = Rankable> = { org: T; score: number; reasons: string[] };

/** Explainable ranking: every point awarded produces a human-readable reason. */
export function rank<T extends Rankable>(intent: Intent, orgs: T[]): Scored<T>[] {
  return orgs
    .map((org) => {
      let score = org.trustScore * 0.4 + org.rating * 6;
      const reasons: string[] = [];
      const hay = [org.name, org.tagline, org.category, ...org.services, ...org.industries]
        .join(" ")
        .toLowerCase();

      if (intent.categories.includes(org.category)) {
        score += 25;
        reasons.push(`Specializes in ${org.category}`);
      }
      const ind = org.industries.filter((i) => intent.industries.includes(i.toLowerCase()));
      if (ind.length) {
        score += 20 * ind.length;
        reasons.push(`Experience in ${ind.join(", ")}`);
      }
      const kw = intent.keywords.filter((k) => hay.includes(k)).length;
      score += kw * 3;
      if (intent.budget) {
        const diff = Math.abs(org.priceTier - intent.budget);
        score += diff === 0 ? 15 : diff === 1 ? 0 : -15;
        if (diff === 0)
          reasons.push(intent.budget === 1 ? "Fits a tight budget" : "Premium-tier provider");
      }
      if (intent.fastResponse) {
        if (org.responseHours <= 12) {
          score += 12;
          reasons.push(`Responds in ~${org.responseHours}h`);
        } else score -= 8;
      }
      if (intent.verifiedOnly && !org.verified) score -= 40;
      if (org.trustScore >= 90) reasons.push(`Trust score ${org.trustScore}`);
      if (!reasons.length) reasons.push(`${org.sentiment.positive}% positive sentiment`);
      return { org, score: Math.round(score), reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export function matchPercent(scored: Scored<Rankable>[], s: Scored<Rankable>) {
  const max = scored[0]?.score || 1;
  return Math.max(40, Math.min(99, Math.round((s.score / max) * 97)));
}
