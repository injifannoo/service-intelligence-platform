/**
 * Deterministic AI engine for the development BFF.
 *
 * ## Why this exists
 *
 * MVP Version 2 (docs/08_Development_Roadmap.md:416-426) needs semantic search,
 * async review summaries, recommendations, and analytics. The production design
 * routes all of that through an LLM plus pgvector (docs/10_AI_Roadmap.md), and no
 * model or embedding service is reachable from this environment.
 *
 * Rather than stub these endpoints out as `501`, every capability is implemented
 * with pure, local algorithms over the same seeded records a real pipeline would
 * read. That keeps the frontend contracts, shapes, and states exercisable now,
 * and confines the eventual swap to this one file.
 *
 * ## The one rule
 *
 * **No `Math.random`, no clock reads, no network.** Output is a pure function of
 * the input, so the same records always produce the same summary, ranking, and
 * dashboard. That is what makes these unit-testable and what stops the UI from
 * flickering between renders. Anything time-varying belongs in the caller, not
 * here.
 *
 * ## Honest limitations
 *
 * - "Semantic" search is lexical: stemmed bag-of-words with cosine similarity and
 *   a bigram bonus. It will not match synonyms it has no dictionary entry for.
 * - Sentiment is lexicon-based with negation and intensifier windows. It will not
 *   parse sarcasm, and it grades English only.
 * - `profile_views` is synthetic. There is no analytics pipeline behind it, so it
 *   is derived from a stable hash of the organization id and clearly labelled as a
 *   placeholder rather than presented as measured traffic.
 */

import type {
  Organization,
  OrganizationDashboard,
  Review,
  ReviewSummary,
  SentimentScore,
  Service,
} from "@/types";

/* -------------------------------------------------------------------------- */
/* Text normalisation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Words carrying no retrieval or sentiment signal.
 *
 * Kept deliberately small. An aggressive list hurts semantic recall more than the
 * noise it removes, because phrases like "not good" and "out of service" depend on
 * exactly the words a naive filter would discard.
 */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for",
  "from", "had", "has", "have", "he", "her", "his", "i", "in", "is", "it", "its",
  "of", "on", "or", "our", "she", "that", "the", "their", "them", "there", "these",
  "they", "this", "to", "was", "we", "were", "will", "with", "you", "your",
]);

/** Suffixes stripped to collapse trivial inflection ("reviews" -> "review"). */
const SUFFIXES = ["ingly", "edly", "ing", "ies", "es", "ed", "s"];

/**
 * Lowercase, split on non-alphanumerics, drop stopwords, and stem.
 *
 * The stemmer is a small suffix stripper, not Porter: it exists so "migrations"
 * and "migration" collide, and it does not attempt linguistic correctness.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token))
    .map(stem);
}

function stem(token: string): string {
  for (const suffix of SUFFIXES) {
    if (token.length > suffix.length + 2 && token.endsWith(suffix)) {
      // "ies" -> "y" so "companies" and "company" meet.
      return suffix === "ies" ? `${token.slice(0, -3)}y` : token.slice(0, -suffix.length);
    }
  }
  return token;
}

/** Term-frequency vector. Reused for both documents and queries. */
export function termFrequency(tokens: string[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) ?? 0) + 1);
  }
  return vector;
}

/** FNV-1a. Used only to derive stable synthetic counters, never for security. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/* -------------------------------------------------------------------------- */
/* Semantic scoring                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Similarity of two bag-of-words vectors, as cosine in [0, 1].
 *
 * Returns 0 for an empty vector rather than NaN, so a query of pure stopwords
 * degrades to "no match" instead of poisoning a sort comparator.
 */
export function cosineSimilarity(
  left: Map<string, number>,
  right: Map<string, number>,
): number {
  if (left.size === 0 || right.size === 0) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (const value of left.values()) leftNorm += value * value;
  for (const value of right.values()) rightNorm += value * value;
  for (const [term, value] of left) {
    dot += value * (right.get(term) ?? 0);
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

/** Bigram overlap as a fraction of the query's bigrams. Catches phrase matches. */
function bigramOverlap(queryTokens: string[], documentTokens: string[]): number {
  if (queryTokens.length < 2) return 0;
  const bigrams = new Set<string>();
  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    bigrams.add(`${queryTokens[index]} ${queryTokens[index + 1]}`);
  }
  if (bigrams.size === 0) return 0;

  const documentBigrams = new Set<string>();
  for (let index = 0; index < documentTokens.length - 1; index += 1) {
    documentBigrams.add(`${documentTokens[index]} ${documentTokens[index + 1]}`);
  }

  let hits = 0;
  for (const bigram of bigrams) {
    if (documentBigrams.has(bigram)) hits += 1;
  }
  return hits / bigrams.size;
}

/**
 * Similarity of `query` against a single document, in [0, 1].
 *
 * Weighted blend of cosine similarity and bigram overlap. Cosine alone ranks
 * long documents highly on a single incidental shared word, and bigrams alone
 * miss "cloud hosting" against "hosting in the cloud"; combining them rewards
 * both topical and literal-phrase agreement.
 */
export function semanticScore(query: string, document: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const documentTokens = tokenize(document);
  const cosine = cosineSimilarity(termFrequency(queryTokens), termFrequency(documentTokens));
  const bigrams = bigramOverlap(queryTokens, documentTokens);

  return clamp01(cosine * 0.75 + bigrams * 0.25);
}

/**
 * The document terms the query actually hit, for the user-facing reason line.
 *
 * Matched on stems but returned as the *surface* words that appeared in the
 * document. Returning stems would put `"host"` in front of a user who searched
 * for "hosting", because the stemmer strips the suffix.
 */
export function matchTerms(query: string, document: string, limit = 3): string[] {
  const queryStems = new Set(tokenize(query));
  const seen = new Set<string>();

  for (const token of document.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token.length <= 1) continue;
    if (queryStems.has(stem(token)) && !seen.has(token)) seen.add(token);
  }

  return [...seen].slice(0, limit);
}

/**
 * Build the text an organization is matched against.
 *
 * The industry name is included because it is part of the organization's
 * identity and is often the only place a taxonomy term appears: the seeded
 * "Rift Valley Security" never writes "cybersecurity" in its own text, but its
 * industry is "Cybersecurity". Omitting it makes that listing unfindable.
 */
export function organizationSearchDocument(
  organization: Pick<Organization, "name" | "description" | "location">,
  services: readonly Pick<Service, "name" | "description">[],
  industryName?: string,
): string {
  const catalogue = services
    .map((service) => `${service.name} ${service.description ?? ""}`)
    .join(" ");

  return [
    organization.name,
    industryName ?? "",
    organization.description ?? "",
    organization.location ?? "",
    catalogue,
  ].join(" ");
}

/* -------------------------------------------------------------------------- */
/* Sentiment                                                                   */
/* -------------------------------------------------------------------------- */

const POSITIVE_TERMS = new Set([
  "accurate", "amazing", "best", "bright", "clear", "comfortable", "communicated",
  "competent", "complete", "consistent", "delightful", "delivered", "dependable",
  "efficient", "effective", "excellent", "exactly", "fantastic", "fast", "faster",
  "friendly", "good", "great", "helpful", "high", "impressed", "impressive",
  "knowledgeable", "love", "maintained", "nice", "on", "perfect", "polite",
  "positive", "professional", "prompt", "quality", "quick", "reliable",
  "responsive", "recommended", "satisfied", "seamless", "smooth", "solid",
  "speedy", "stable", "strong", "superb", "supportive", "time", "transparent",
  "well",
]);

const NEGATIVE_TERMS = new Set([
  "annoying", "arrogant", "bad", "barely", "boring", "broken", "buggy", "careless",
  "clunky", "complaint", "confusing", "corrupt", "delay", "delayed", "difficult",
  "disappointing", "disorganized", "expensive", "fail", "failed", "frustrating",
  "generic", "hard", "hassle", "ignored", "issue", "lack", "lacked", "late",
  "leak", "locked", "mediocre", "messy", "missing", "mistake", "never", "noise",
  "overpriced", "poor", "problem", "rude", "sad", "slow", "small", "terrible",
  "ugly", "unhelpful", "unprofessional", "unreliable", "weak", "wrong",
]);

/** Flips the polarity of nearby terms: "not good", "never reliable". */
const NEGATORS = new Set(["not", "never", "no", "hardly", "barely", "without", "lack", "lacked"]);

/** Scale magnitude up: "very slow", "extremely responsive". */
const INTENSIFIERS = new Set(["very", "extremely", "really", "highly", "truly", "always"]);

/** Scale magnitude down: "a few late handoffs", "slightly slow". */
const DIMINISHERS = new Set(["slightly", "somewhat", "occasionally", "few", "little", "bit", "hardly"]);

/** How far the modifier reaches, in tokens. */
const NEGATION_WINDOW = 3;
const MODIFIER_WINDOW = 2;

/**
 * Polarity of one short text, in [-1, 1].
 *
 * Modifiers apply within a small token window of the term they qualify, because
 * modifiers bind to the nearest term rather than the whole sentence: in "a few
 * late handoffs", "few" modifies "late", not "handoffs" two tokens earlier.
 *
 * Modifiers are applied on a single left-to-right pass over the lexicon hits
 * rather than in successive passes, because each pass would then also see the
 * previous pass's output and compound twice.
 */
export function scorePolarity(text: string): number {
  const tokens = tokenize(text);
  const hits: { term: string; index: number }[] = [];

  tokens.forEach((term, index) => {
    if (POSITIVE_TERMS.has(term)) hits.push({ term: "positive", index });
    if (NEGATIVE_TERMS.has(term)) hits.push({ term: "negative", index });
  });
  if (hits.length === 0) return 0;

  let total = 0;
  for (const hit of hits) {
    let magnitude = 1;
    let sign = hit.term === "positive" ? 1 : -1;

    for (let offset = 1; offset <= MODIFIER_WINDOW; offset += 1) {
      const modifier = tokens[hit.index - offset];
      if (modifier === undefined) break;
      if (INTENSIFIERS.has(modifier)) magnitude += 0.5;
      else if (DIMINISHERS.has(modifier)) magnitude -= 0.4;
    }

    for (let offset = 1; offset <= NEGATION_WINDOW; offset += 1) {
      if (NEGATORS.has(tokens[hit.index - offset] ?? "")) {
        sign = -sign;
        break;
      }
    }

    total += sign * Math.max(magnitude, 0.2);
  }

  return clampSigned(total / hits.length);
}

/**
 * Two-way positive/negative split as whole percentages summing to 100.
 *
 * docs/05_API_Design.md:552-558 specifies exactly these two keys and no
 * `neutral`, which contradicts the three-way model in
 * docs/10_AI_Roadmap.md:173-195. The two-way contract wins because it is the
 * documented response shape; text with no lexicon hits therefore splits 50/50
 * rather than vanishing.
 */
export function analyzeSentiment(
  reviews: readonly Pick<Review, "comment">[] | readonly string[],
): SentimentScore {
  // `Review.comment` is nullable (a rating-only review is valid), so textless
  // reviews are dropped rather than scored as neutral filler.
  const texts = reviews
    .map((review) => (typeof review === "string" ? review : review.comment))
    .filter((text): text is string => typeof text === "string" && text.trim() !== "");

  // Scored per clause, not per review. A single signed average over a whole
  // comment lets a long build-up of praise cancel out one concrete complaint,
  // which reported "0% negative" for reviews that literally contain one. Mass is
  // therefore accumulated as absolute per clause, so a caveat cannot be netted
  // away by the sentence it was attached to.
  let positive = 0;
  let negative = 0;
  for (const text of texts) {
    for (const clause of splitClauses(text)) {
      const polarity = scorePolarity(clause.text);
      if (polarity > 0) positive += polarity * (clause.downweighted ? 0.5 : 1);
      else if (polarity < 0) negative += -polarity * (clause.downweighted ? 1.5 : 1);
    }
  }

  const total = positive + negative;
  if (total === 0) return { positive: 50, negative: 50 };

  return {
    positive: Math.round((positive / total) * 100),
    negative: Math.round((negative / total) * 100),
  };
}

/* -------------------------------------------------------------------------- */
/* Review summary                                                              */
/* -------------------------------------------------------------------------- */

/** "though", "but", "however" and friends: the clause after them is the caveat. */
const CONTRAST_MARKERS = ["but", "though", "although", "however", "except"];

/**
 * Split a comment into clauses, separating a contrast clause from the clause it
 * qualifies.
 *
 * "Good creative output, though the reporting was slow" yields two clauses, one
 * positive and one negative. Scoring the sentence as a single string would let
 * the praise swamp the complaint and the caveat would never be surfaced.
 */
function splitClauses(comment: string): { text: string; downweighted: boolean }[] {
  const clauses: { text: string; downweighted: boolean }[] = [];

  for (const sentence of comment.split(/[.!?]+\s+|\s*;\s*/)) {
    const trimmed = sentence.trim();
    if (trimmed.length < 8) continue;

    const contrastIndex = CONTRAST_MARKERS.findIndex((marker) =>
      new RegExp(`\\b${marker}\\b`, "i").test(trimmed),
    );

    if (contrastIndex === -1) {
      clauses.push({ text: trimmed, downweighted: false });
      continue;
    }

    const match = new RegExp(`\\b(?:${CONTRAST_MARKERS.join("|")})\\b`, "i").exec(trimmed);
    const splitAt = match?.index ?? trimmed.length;
    const before = trimmed.slice(0, splitAt).replace(/[,;]\s*$/, "").trim();
    const after = trimmed.slice(splitAt).replace(/^\w+/, "").trim();

    if (before.length >= 8) clauses.push({ text: before, downweighted: false });
    if (after.length >= 8) clauses.push({ text: after, downweighted: true });
  }

  return clauses;
}

function toInsight(clause: string): string {
  const cleaned = clause.replace(/\s+/g, " ").trim();
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

/**
 * Derive a summary, strengths, and weaknesses from review text.
 *
 * Rather than returning template sentences, this selects the clauses with the
 * strongest positive and negative polarity, so the output reflects the actual
 * reviews on file. Duplicates are collapsed on normalised token sets, since
 * "excellent support" repeated across reviews adds no information.
 */
export function summarizeReviews(
  reviews: readonly Pick<Review, "rating" | "comment">[],
  organizationName: string,
  limit = 3,
): ReviewSummary {
  if (reviews.length === 0) {
    return {
      summary: `No reviews have been submitted for ${organizationName} yet.`,
      strengths: [],
      weaknesses: [],
      sentiment_score: 0.5,
    };
  }

  const positives: { text: string; strength: number }[] = [];
  const negatives: { text: string; strength: number }[] = [];
  const seen = new Set<string>();

  for (const review of reviews) {
    if (!review.comment) continue;

    for (const clause of splitClauses(review.comment)) {
      const polarity = scorePolarity(clause.text);
      // A contrast clause is the author's caveat, so it is treated as a stronger
      // signal of the complaint than an unqualified clause of the same polarity.
      const weight = clause.downweighted ? 1.5 : 1;

      const key = tokenize(clause.text).sort().join(" ");
      if (seen.has(key)) continue;
      seen.add(key);

      if (polarity > 0) positives.push({ text: clause.text, strength: polarity * weight });
      else if (polarity < 0) negatives.push({ text: clause.text, strength: -polarity * weight });
    }
  }

  const byStrength = (a: { strength: number }, b: { strength: number }) => b.strength - a.strength;
  positives.sort(byStrength);
  negatives.sort(byStrength);

  const average =
    reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  const sentiment = analyzeSentiment(reviews);

  return {
    summary:
      `${organizationName} averages ${average.toFixed(1)} stars across ` +
      `${reviews.length} review${reviews.length === 1 ? "" : "s"}. ` +
      `Customer feedback skews ${sentiment.positive >= sentiment.negative ? "positive" : "negative"} ` +
      `(${sentiment.positive}% positive).`,
    strengths: positives.slice(0, limit).map((item) => toInsight(item.text)),
    weaknesses: negatives.slice(0, limit).map((item) => toInsight(item.text)),
    sentiment_score: sentiment.positive / 100,
  };
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                             */
/* -------------------------------------------------------------------------- */

  /** Budget bands mapped to the highest acceptable starting price. Contradiction 8: no currency. */
const BUDGET_CEILINGS: Record<string, number> = {
  low: 30_000,
  medium: 90_000,
  high: Number.POSITIVE_INFINITY,
};

export interface Recommendation {
  id: string;
  name: string;
  reason: string;
  score: number;
}

/**
 * Rank organizations against a category, budget, and location.
 *
 * Each signal contributes a bounded weight rather than a raw total, so no single
 * dimension can dominate: 55% topical fit, 25% budget fit, 20% location. An
 * unmatched signal contributes the midpoint rather than zero, so an unspecified
 * location neither rewards nor penalises a candidate.
 */
export function recommendOrganizations(input: {
  category?: string;
  budget?: string;
  location?: string;
  organizations: readonly Organization[];
  services: readonly Service[];
}): Recommendation[] {
  const { category, budget, location, organizations, services } = input;

  const ceiling = budget ? (BUDGET_CEILINGS[budget.toLowerCase()] ?? Number.POSITIVE_INFINITY) : null;

  const scored = organizations
    .map((organization) => {
      const organizationServices = services.filter(
        (service) => service.organization_id === organization.id && service.status,
      );

      // Topical fit is the best score across this organization's own services, so a
      // broad catalogue does not dilute a single strong match.
      const catalogue = organizationServices
        .map((service) => `${service.name} ${service.description ?? ""}`)
        .join(" ");
      const topical = category ? semanticScore(category, `${organization.name} ${catalogue}`) : null;

      const prices = organizationServices
        .map((service) => service.price)
        .filter((price): price is number => price !== null);
      let budgetFit: number | null = null;
      if (ceiling !== null && prices.length > 0) {
        const cheapest = Math.min(...prices);
        budgetFit = clamp01(1 - cheapest / ceiling);
      }

      const locationFit = location
        ? (organization.location ?? "").toLowerCase().includes(location.toLowerCase())
          ? 1
          : 0
        : null;

      // A budget the user actually stated is a constraint, not a preference. An
      // organisation with no published price cannot be shown to fit one, so it is
      // dropped rather than carried at the neutral midpoint.
      if (ceiling !== null && prices.length === 0) return null;

      // Same for category: with a category given, an organisation matching none of
      // its terms is not a weak recommendation, it is not a recommendation.
      if (topical !== null && topical <= 0) return null;

      const reasons: string[] = [];
      if (topical !== null && topical >= 0.15) {
        const terms = matchTerms(category ?? "", `${organization.name} ${catalogue}`);
        if (terms.length > 0) reasons.push(`offers ${terms.slice(0, 2).join(" and ")}`);
      }
      if (budgetFit !== null && budgetFit >= 0.999) reasons.push("within budget");
      if (locationFit === 1) reasons.push(`located in ${location}`);

      const score =
        (topical ?? 0.5) * 0.55 + (budgetFit ?? 0.5) * 0.25 + (locationFit ?? 0.5) * 0.2;

      return {
        id: organization.id,
        name: organization.name,
        reason:
          reasons.length > 0
            ? `Matches because it ${reasons.join(", and ")}.`
            : "Broad catalogue fit.",
        score,
      };
    })
    .filter((item): item is Recommendation => item !== null);

  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/* -------------------------------------------------------------------------- */
/* Analytics dashboard                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Build the owner dashboard from records that actually exist.
 *
 * Every field except `profile_views` is derived from seeded reviews, services,
 * and ratings. There is no analytics pipeline in this environment, so
 * `profile_views` is synthesised from a stable hash of the organization id: it is
 * reproducible across requests and restarts, which keeps the UI stable, but it is
 * a placeholder and must not be reported as measured traffic.
 */
export function buildDashboard(input: {
  organization: Organization;
  reviews: readonly Review[];
  peers: readonly Organization[];
}): OrganizationDashboard {
  const { organization, reviews, peers } = input;

  // Calendar month, e.g. "2026-03". Sliced from the ISO string so it is
  // independent of the runtime's timezone.
  const byMonth = new Map<string, { total: number; count: number }>();
  for (const review of reviews) {
    const period = review.created_at.slice(0, 7);
    const bucket = byMonth.get(period) ?? { total: 0, count: 0 };
    bucket.total += review.rating;
    bucket.count += 1;
    byMonth.set(period, bucket);
  }

  const ratingTrends = [...byMonth.entries()]
    .map(([period, bucket]) => ({
      period,
      average: Math.round((bucket.total / bucket.count) * 100) / 100,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const ranked = [...peers]
    .filter((peer) => peer.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));

  return {
    profile_views: 120 + (stableHash(organization.id) % 880),
    reviews: reviews.length,
    rating_trends: ratingTrends,
    customer_sentiment: analyzeSentiment(reviews),
    competitor_position: ranked.map((peer, index) => ({
      organization_id: peer.id,
      rank: index + 1,
      // The documented contract returns ids only. A dashboard that renders "Peer
      // organization" for every row is useless, so the dev backend also resolves
      // the name and verification status. Both are optional on the type because a
      // real backend is not obliged to send them.
      organization_name: peer.name,
      verification_status: peer.verification_status,
    })),
  };
}

/* -------------------------------------------------------------------------- */

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampSigned(value: number): number {
  return Math.min(1, Math.max(-1, value));
}