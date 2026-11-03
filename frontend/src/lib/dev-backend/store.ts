/**
 * Development-only in-memory backend.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Django backend has no implemented slices (`config/urls.py` registers only
 * `admin/`, and `backend/features/organization/*` are empty), and there is no
 * Postgres or Docker in the local environment. Without this, `src/lib/api-client.ts`
 * has no reachable origin and every screen is permanently in an error state.
 *
 * This stands in for the Django API. Responses deliberately use the exact
 * `{ success, data, pagination }` envelope, exact error codes, and exact status
 * codes from docs/05_API_Design.md, so switching `NEXT_PUBLIC_USE_DEV_BACKEND`
 * to `false` once the backend lands requires no changes in any feature slice.
 *
 * Where the docs are silent or self-contradictory this file follows the
 * resolutions recorded in `src/types/index.ts`, and every such place is noted
 * inline.
 *
 * SECURITY
 * --------
 * Tokens here are base64 payloads with a placeholder signature. They are NOT
 * cryptographically signed and prove nothing. Every route that touches this
 * module is gated to non-production (see `dev-backend/http.ts`).
 */
import type {
  AssignableAdminRole,
  AuditLog,
  CustomerTier,
  HomepageSectionKey,
  HomepageSettings,
  HomepageSettingsUpdate,
  Industry,
  ModerationReport,
  Organization,
  OrganizationTier,
  RatingDimension,
  ReportedReview,
  Review,
  ReviewScores,
  Service,
  User,
  UserRole,
  VerificationClaim,
  VerificationDocumentType,
  VerificationStatus,
} from "@/types";
import { ASSIGNABLE_ADMIN_ROLES, HOMEPAGE_SECTIONS, RATING_DIMENSIONS, USER_ROLES } from "@/types";

import { summarizeReviews } from "./ai";

export interface StoredUser extends User {
  password: string;
  /**
   * The organization this user manages. NOT a column in docs/04 — see
   * contradiction 5 in src/types/index.ts. The backend owns this mapping.
   */
  organization_id: string | null;
}

export interface AiTask {
  task_id: string;
  organization_id: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILURE";
  created_at: number;
  result: { summary: string; strengths: string[]; weaknesses: string[] } | null;
}

export interface DevDatabase {
  users: StoredUser[];
  industries: Industry[];
  organizations: Organization[];
  services: Service[];
  reviews: Review[];
  verifications: VerificationClaim[];
  reports: ReportedReview[];
  auditLogs: AuditLog[];
  tasks: AiTask[];
  /**
   * Optional so a store mitt by Turbopack before the settings slice existed can
   * be upgraded lazily instead of resetting every registered user.
   */
  settings?: HomepageSettings;
}

declare global {
  var __asipDevDb: DevDatabase | undefined;
  var __asipRevoked: Set<string> | undefined;
}

/**
 * Held on `globalThis` so the store survives Turbopack's dev-server module
 * reloads. Without this, every file edit would reset registered users.
 */
function db(): DevDatabase {
  if (!globalThis.__asipDevDb) {
    globalThis.__asipDevDb = seed();
  }
  return globalThis.__asipDevDb;
}

const DEMO_PASSWORD = "Password123!";

function seed(): DevDatabase {
  const now = new Date().toISOString();
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  // docs/08:314-326 seeds Technology Services only, with these sub-examples.
  // docs/08:532 makes this a firm rollout constraint, so the taxonomy is not
  // expanded to the later phases (Hospitality, Healthcare, ...) here.
  const industries: Industry[] = [
    {
      id: id(21),
      name: "Software",
      description: "Software companies and product engineering providers.",
    },
    {
      id: id(22),
      name: "AI",
      description: "Artificial intelligence and machine learning providers.",
    },
    {
      id: id(23),
      name: "IT Services",
      description: "IT infrastructure, support, and systems integration.",
    },
    {
      id: id(24),
      name: "Digital Agency",
      description: "Digital marketing, brand, and content agencies.",
    },
    {
      id: id(25),
      name: "Cybersecurity",
      description: "Security audits, penetration testing, and compliance.",
    },
  ];

  const organizations: Organization[] = [
    {
      id: id(11),
      name: "Addis Software Works",
      description:
        "Custom web and mobile product engineering for Ethiopian enterprises, with a distributed delivery team.",
      industry_id: id(21),
      location: "Addis Ababa",
      phone: "+251 11 555 0101",
      website: "https://example.com/addis-software",
      verification_status: "VERIFIED",
      tier: "PREMIUM",
      rating: null,
      created_at: now,
    },
    {
      id: id(12),
      name: "Blue Nile Digital Agency",
      description: "Brand identity, performance marketing, and content production.",
      industry_id: id(24),
      location: "Addis Ababa",
      phone: "+251 11 555 0102",
      website: "https://example.com/bluenile",
      verification_status: "VERIFIED",
      tier: "VERIFIED",
      rating: null,
      created_at: now,
    },
    {
      id: id(13),
      name: "Habesha Cloud Services",
      description: "Managed cloud hosting, backups, and 24/7 infrastructure monitoring.",
      industry_id: id(23),
      location: "Bahir Dar",
      phone: "+251 22 555 0103",
      website: "https://example.com/habesha-cloud",
      verification_status: "PENDING",
      tier: "REGISTERED",
      rating: null,
      created_at: now,
    },
    {
      id: id(14),
      name: "Sidama Data Labs",
      description: "Analytics pipelines, data warehousing, and machine-learning model deployment.",
      industry_id: id(22),
      location: "Hawassa",
      phone: "+251 46 555 0104",
      website: "https://example.com/sidama-data",
      verification_status: "VERIFIED",
      tier: "VERIFIED",
      rating: null,
      created_at: now,
    },
    {
      id: id(15),
      name: "Rift Valley Security",
      description: "Penetration testing, security audits, and compliance readiness.",
      industry_id: id(25),
      location: "Adama",
      phone: "+251 22 555 0105",
      website: "https://example.com/rift-security",
      verification_status: "REJECTED",
      tier: "REGISTERED",
      rating: null,
      created_at: now,
    },
    {
      id: id(16),
      name: "Amhara IT Consultancy",
      description: "IT strategy, systems integration, and staff technical training.",
      industry_id: id(23),
      location: "Bahir Dar",
      phone: "+251 22 555 0106",
      website: "https://example.com/amhara-it",
      verification_status: "PENDING",
      tier: "REGISTERED",
      rating: null,
      created_at: now,
    },
  ];

  const services: Service[] = [
    {
      id: id(31),
      organization_id: id(11),
      name: "Custom Web Application",
      description: "End-to-end web application build with a 12-week delivery cycle.",
      price: 85000,
      status: true,
    },
    {
      id: id(32),
      organization_id: id(11),
      name: "Mobile App Development",
      description: "Cross-platform mobile applications for iOS and Android.",
      price: 60000,
      status: true,
    },
    {
      id: id(33),
      organization_id: id(11),
      name: "Legacy System Modernisation",
      description: "Incremental migration of legacy backends to current frameworks.",
      price: 120000,
      status: true,
    },
    {
      id: id(34),
      organization_id: id(12),
      name: "Brand Identity Package",
      description: "Logo, palette, typography, and brand guidelines.",
      price: 25000,
      status: true,
    },
    {
      id: id(35),
      organization_id: id(12),
      name: "Performance Marketing",
      description: "Monthly paid acquisition management and reporting.",
      price: 18000,
      status: true,
    },
    {
      id: id(36),
      organization_id: id(13),
      name: "Managed Hosting",
      description: "Managed VPS hosting with 99.9% uptime commitment.",
      price: 9000,
      status: true,
    },
    {
      id: id(37),
      organization_id: id(14),
      name: "Data Warehouse Build",
      description: "Warehouse modelling, ETL pipelines, and dashboards.",
      price: 140000,
      status: true,
    },
    {
      id: id(38),
      organization_id: id(15),
      name: "Penetration Test",
      description: "Authenticated penetration test with a remediation report.",
      price: 45000,
      status: true,
    },
  ];

  const review = (
    n: number,
    userId: string,
    orgId: string,
    rating: number,
    comment: string,
    author: string,
    author_tier?: CustomerTier,
  ): Review => ({
    id: id(40 + n),
    user_id: userId,
    organization_id: orgId,
    rating,
    ratings: fillRatings(rating),
    comment,
    verified: true,
    created_at: new Date(Date.parse(now) - n * 86_400_000).toISOString(),
    author_name: author,
    author_tier: author_tier ?? "CUSTOMER",
  });

  const users: StoredUser[] = [
    {
      id: id(1),
      name: "Demo Customer",
      email: "customer@asip.dev",
      password: DEMO_PASSWORD,
      role: "CUSTOMER",
      customer_tier: "CUSTOMER",
      status: true,
      created_at: now,
      organization_id: null,
    },
    {
      id: id(5),
      name: "Demo Verified Customer",
      email: "verified@asip.dev",
      password: DEMO_PASSWORD,
      role: "CUSTOMER",
      customer_tier: "VERIFIED_CUSTOMER",
      status: true,
      created_at: now,
      organization_id: null,
    },
    {
      id: id(6),
      name: "Demo Premium Customer",
      email: "premium@asip.dev",
      password: DEMO_PASSWORD,
      role: "CUSTOMER",
      customer_tier: "PREMIUM_CUSTOMER",
      status: true,
      created_at: now,
      organization_id: null,
    },
    {
      id: id(2),
      name: "Demo Owner",
      email: "owner@asip.dev",
      password: DEMO_PASSWORD,
      role: "ORGANIZATION_OWNER",
      status: true,
      created_at: now,
      organization_id: id(11),
    },
    {
      id: id(7),
      name: "Demo Moderator",
      email: "moderator@asip.dev",
      password: DEMO_PASSWORD,
      role: "MODERATOR",
      status: true,
      created_at: now,
      organization_id: null,
    },
    {
      id: id(3),
      name: "Demo Admin",
      email: "admin@asip.dev",
      password: DEMO_PASSWORD,
      role: "ADMIN",
      status: true,
      created_at: now,
      organization_id: null,
    },
    {
      id: id(4),
      name: "Demo Super Admin",
      email: "superadmin@asip.dev",
      password: DEMO_PASSWORD,
      role: "SUPER_ADMIN",
      status: true,
      created_at: now,
      organization_id: null,
    },
  ];

  const reviews: Review[] = [
    review(1, id(1), id(11), 5, "Delivered a complex billing system on time and communicated well throughout.", "Demo Customer", "CUSTOMER"),
    review(2, id(5), id(11), 4, "Strong engineering team. A few late handoffs during discovery.", "Demo Verified Customer", "VERIFIED_CUSTOMER"),
    review(3, id(6), id(12), 5, "Good creative output, exceptional strategy and fast execution.", "Demo Premium Customer", "PREMIUM_CUSTOMER"),
    review(4, id(1), id(13), 3, "Hosting is reliable but support response times are slow at peak.", "Demo Customer", "CUSTOMER"),
    review(5, id(5), id(14), 5, "Rebuilt our reporting stack and the dashboards are dramatically faster.", "Demo Verified Customer", "VERIFIED_CUSTOMER"),
    review(6, id(1), id(15), 2, "Report was generic and missed two findings we already knew about.", "Demo Customer", "CUSTOMER"),
    review(7, id(2), id(12), 5, "Excellent brand work, delivered exactly to the agreed brief.", "Demo Owner", "CUSTOMER"),
  ];

  return {
    users,
    industries,
    organizations,
    services,
    reviews,
    verifications: [],
    reports: [],
    auditLogs: [],
    tasks: [],
    settings: { sections: defaultHomepageSettings() },
  };
}

/**
 * Every section starts visible. Only what an admin explicitly switches off is
 * hidden, so a fresh environment matches the fully-featured homepage.
 */
function defaultHomepageSettings(): Record<HomepageSectionKey, boolean> {
  return Object.fromEntries(HOMEPAGE_SECTIONS.map((key) => [key, true])) as Record<
    HomepageSectionKey,
    boolean
  >;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export function findUserByEmail(email: string): StoredUser | undefined {
  const needle = email.trim().toLowerCase();
  return db().users.find((user) => user.email.toLowerCase() === needle);
}

export function findUserById(userId: string): StoredUser | undefined {
  return db().users.find((user) => user.id === userId);
}

export function createUser(input: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}): StoredUser {
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: input.role ?? "CUSTOMER",
    status: true,
    created_at: new Date().toISOString(),
    organization_id: null,
  };
  db().users.push(user);
  return user;
}

export function updateUser(
  userId: string,
  patch: { name?: string; email?: string; customer_tier?: CustomerTier },
): StoredUser | undefined {
  const user = findUserById(userId);
  if (!user) return undefined;
  if (patch.name !== undefined) user.name = patch.name;
  if (patch.email !== undefined) user.email = patch.email.trim().toLowerCase();
  if (patch.customer_tier !== undefined) user.customer_tier = patch.customer_tier;
  return user;
}

/* -------------------------------------------------------------------------- */
/* User administration (admin area)                                            */
/* -------------------------------------------------------------------------- */

/**
 * Roles assignable from the admin area.
 *
 * `ASSIGNABLE_ADMIN_ROLES` itself lives in `@/types` and is re-exported here, so
 * the admin UI and this store cannot disagree about which roles exist.
 * `CUSTOMER` and `ORGANIZATION_OWNER` are deliberately absent. Ownership is a
 * consequence of an organization being created for a user, not a privilege an
 * admin assigns, so allowing it here would let an admin hand themselves a tenant.
 */
export { ASSIGNABLE_ADMIN_ROLES };
export type { AssignableAdminRole };

export function isAssignableAdminRole(value: unknown): value is AssignableAdminRole {
  return typeof value === "string" && (ASSIGNABLE_ADMIN_ROLES as readonly string[]).includes(value);
}

export interface UserFilters {
  /** Case-insensitive match against name and email. */
  query?: string;
  role?: UserRole;
  /** Only active or only deactivated accounts. */
  status?: boolean;
}

export function listUsers(filters: UserFilters = {}): StoredUser[] {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return db()
    .users.filter((user) => {
      if (filters.role !== undefined && user.role !== filters.role) return false;
      if (filters.status !== undefined && user.status !== filters.status) return false;
      if (!query) return true;
      return (
        user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Creates an admin-tier account.
 *
 * There is deliberately no public path to this: `createUser` is the registration
 * path and is called without a role, so it can only ever produce CUSTOMER. Admin
 * accounts arrive either from the seed or from here, which is Super Admin only.
 */
export function createAdminUser(input: {
  name: string;
  email: string;
  password: string;
  role: AssignableAdminRole;
}): StoredUser {
  const user: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: input.role,
    status: true,
    created_at: new Date().toISOString(),
    organization_id: null,
  };
  db().users.push(user);
  return user;
}

/** Passwords are never returned by the API; this strips the field for responses. */
export function toPublicUser(user: StoredUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    customer_tier: user.customer_tier ?? (user.role === "CUSTOMER" ? "CUSTOMER" : undefined),
    status: user.status,
    created_at: user.created_at,
    organization_id: user.organization_id,
  };
}

/**
 * Aggregate counts for the admin overview.
 *
 * Counts are computed from the in-memory store on each request rather than cached,
 * so the dashboard cannot drift from the data after a mutation.
 */
export function platformStats() {
  const users = db().users;
  const organizations = db().organizations;
  const services = db().services;
  const reviews = db().reviews;

  const byRole = USER_ROLES.reduce<Record<string, number>>((accumulator, role) => {
    accumulator[role] = users.filter((user) => user.role === role).length;
    return accumulator;
  }, {});

  return {
    users: {
      total: users.length,
      active: users.filter((user) => user.status).length,
      deactivated: users.filter((user) => !user.status).length,
      by_role: byRole,
    },
    organizations: {
      total: organizations.length,
      verified: organizations.filter((org) => org.verification_status === "VERIFIED").length,
      pending: organizations.filter((org) => org.verification_status === "PENDING").length,
      rejected: organizations.filter((org) => org.verification_status === "REJECTED").length,
    },
    services: {
      total: services.length,
      active: services.filter((service) => service.status).length,
    },
    reviews: {
      total: reviews.length,
      // Reports live in their own array rather than on the review record, so the
      // moderation queue size is the report count, not a per-review flag.
      reported: db().reports.length,
    },
    verifications: {
      pending: db().verifications.filter((claim) => claim.status === "PENDING").length,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Industries                                                                 */
/* -------------------------------------------------------------------------- */

export function listIndustries(): Industry[] {
  return db().industries;
}

export function findIndustryByName(name: string): Industry | undefined {
  const needle = name.trim().toLowerCase();
  return db().industries.find((industry) => industry.name.toLowerCase() === needle);
}

/* -------------------------------------------------------------------------- */
/* Organizations                                                              */
/* -------------------------------------------------------------------------- */

export function listOrganizations(): Organization[] {
  return db().organizations;
}

export function findOrganization(id: string): Organization | undefined {
  return db().organizations.find((organization) => organization.id === id);
}

export function createOrganization(input: {
  name: string;
  industry_id: string | null;
  description?: string;
  location?: string;
  phone?: string;
  website?: string;
  ownerId?: string;
}): Organization {
  const organization: Organization = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description ?? null,
    industry_id: input.industry_id,
    location: input.location ?? null,
    phone: input.phone ?? null,
    website: input.website ?? null,
    // New registrations are never pre-verified; an admin must approve them.
    verification_status: "PENDING",
    tier: "REGISTERED",
    rating: null,
    created_at: new Date().toISOString(),
  };
  db().organizations.unshift(organization);

  // Closes the gap in docs/04, where Organization has no owner_id.
  if (input.ownerId) {
    const owner = findUserById(input.ownerId);
    if (owner) {
      owner.organization_id = organization.id;
      // Registering a business is what makes an account an Organization Owner
      // (docs/04:265, docs/11:456 "IsOrganizationOwner"). Only a plain customer
      // is promoted: an admin who creates an organization keeps their role.
      if (owner.role === "CUSTOMER") owner.role = "ORGANIZATION_OWNER";
    }
  }

  return organization;
}

export function updateOrganization(
  id: string,
  patch: Partial<Organization>,
): Organization | undefined {
  const organization = findOrganization(id);
  if (!organization) return undefined;
  Object.assign(organization, patch);
  return organization;
}

/**
 * Backend-computed aggregate rating.
 *
 * docs/04 has no `average_rating` column on Organization or Service, yet
 * docs/05:310 filters on `rating` and 05:329 returns it. The real backend owns
 * this; the frontend must never derive it. See contradiction 6.
 */
export function ratingFor(organizationId: string): number | null {
  const ratings = db()
    .reviews.filter((review) => review.organization_id === organizationId)
    .map((review) => review.rating);
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, value) => total + value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function reviewCountFor(organizationId: string): number {
  return db().reviews.filter((review) => review.organization_id === organizationId).length;
}

/** Returns the organisation with its computed rating attached. */
export function withRating(organization: Organization): Organization {
  return { ...organization, rating: ratingFor(organization.id) };
}

/* -------------------------------------------------------------------------- */
/* Services (docs/04_Database_Design.md:318-333)                               */
/* -------------------------------------------------------------------------- */

export function listServices(organizationId?: string): Service[] {
  const all = db().services;
  return organizationId
    ? all.filter((service) => service.organization_id === organizationId)
    : all;
}

export function findService(id: string): Service | undefined {
  return db().services.find((service) => service.id === id);
}

export function createService(input: {
  organization_id: string;
  name: string;
  description?: string;
  price?: number;
}): Service {
  const service: Service = {
    id: crypto.randomUUID(),
    organization_id: input.organization_id,
    name: input.name,
    description: input.description ?? null,
    price: input.price ?? null,
    status: true,
  };
  db().services.push(service);
  return service;
}

export function updateService(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    price?: number | null;
    status?: boolean;
  },
): Service | undefined {
  const service = findService(id);
  if (!service) return undefined;

  // Only the keys present in the payload are touched, so a partial update cannot
  // silently blank a field the caller did not send.
  if (input.name !== undefined) service.name = input.name;
  if (input.description !== undefined) service.description = input.description;
  if (input.price !== undefined) service.price = input.price;
  if (input.status !== undefined) service.status = input.status;

  return service;
}

export function deleteService(id: string): boolean {
  const database = db();
  const before = database.services.length;
  database.services = database.services.filter((service) => service.id !== id);
  return database.services.length < before;
}

/* -------------------------------------------------------------------------- */
/* Reviews (docs/04_Database_Design.md:337-353)                                */
/* -------------------------------------------------------------------------- */

/**
 * Builds the full per-dimension score set.
 *
 * docs/04:357-375 names the Rating vocabulary but defines no columns, so the
 * five scores ride on the review row. Any dimension the caller omits defaults
 * to the overall `rating`, which keeps a rating-only review coherent.
 */
function fillRatings(overall: number, partial?: Partial<ReviewScores>): ReviewScores {
  return RATING_DIMENSIONS.reduce<ReviewScores>(
    (scores, dimension) => {
      scores[dimension] = partial?.[dimension] ?? overall;
      return scores;
    },
    {} as ReviewScores,
  );
}

export function listReviews(organizationId?: string): Review[] {
  const all = [...db().reviews].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  return organizationId
    ? all.filter((review) => review.organization_id === organizationId)
    : all;
}

export function findReview(id: string): Review | undefined {
  return db().reviews.find((review) => review.id === id);
}

export function createReview(input: {
  organization_id: string;
  user_id: string;
  author_name: string;
  rating: number;
  comment?: string;
  ratings?: Partial<ReviewScores>;
}): Review {
  const review: Review = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    organization_id: input.organization_id,
    rating: input.rating,
    ratings: fillRatings(input.rating, input.ratings),
    comment: input.comment ?? null,
    // docs/04:352 leaves `verified` undefined; customers have not been vetted,
    // so a self-submitted review is unverified.
    verified: false,
    created_at: new Date().toISOString(),
    author_name: input.author_name,
  };
  db().reviews.unshift(review);
  return review;
}

/**
 * Edit a review in place (docs/02:181).
 *
 * Only the keys present in the payload are touched, so a request that omits
 * `comment` cannot blank it — `comment` is nullable on purpose (docs/04:351
 * allows a rating-only review) and that is not the same as clearing it.
 */
export function updateReview(
  id: string,
  input: { rating?: number; comment?: string | null; ratings?: Partial<ReviewScores> },
): Review | undefined {
  const review = findReview(id);
  if (!review) return undefined;

  if (input.rating !== undefined) {
    review.rating = input.rating;
    // The documented overall integer and the overall dimension stay in
    // agreement: editing the star moves both.
    review.ratings.overall_experience = input.rating;
  }
  if (input.comment !== undefined) review.comment = input.comment;
  if (input.ratings) {
    for (const dimension of Object.keys(input.ratings) as RatingDimension[]) {
      if (input.ratings[dimension] !== undefined) {
        review.ratings[dimension] = input.ratings[dimension] as number;
      }
    }
  }

  return review;
}

/**
 * Remove a review (docs/02:182).
 *
 * Any report filed against it goes too. Reports are keyed by `review_id` and
 * `admin/stats` counts them straight off the array, so leaving an orphan behind
 * would report a moderation backlog the queue itself no longer shows.
 */
export function deleteReview(id: string): boolean {
  const database = db();
  const before = database.reviews.length;

  database.reviews = database.reviews.filter((review) => review.id !== id);
  database.reports = database.reports.filter((report) => report.review_id !== id);

  return database.reviews.length < before;
}

export function reportReview(reviewId: string, reason: string, note?: string): void {
  db().reports.push({
    review_id: reviewId,
    reason,
    note: note ?? null,
    reported_at: new Date().toISOString(),
  });
}

export function isReviewReported(reviewId: string): boolean {
  return db().reports.some((report) => report.review_id === reviewId);
}

/* -------------------------------------------------------------------------- */
/* Content moderation (docs/02:127, docs/02:314-315, docs/09 Sprint 6)         */
/* -------------------------------------------------------------------------- */

/**
 * Store-level name for `ModerationReport`.
 *
 * The type lives in `src/types/index.ts` because it is a wire shape — the admin
 * queue is read through `GET /api/v1/admin/reports/`, not through this module —
 * and it carries the note about the report being keyed by `review_id`.
 */
export type ModerationEntry = ModerationReport;

/**
 * The abuse-reporting queue required by docs/02:127 ("manual abuse reporting
 * queues to catch spam or fraudulent reviews").
 *
 * Reports whose review has already been removed are dropped rather than
 * returned, so a resolved item cannot reappear after the review is gone.
 */
export function listReportedReviews(): ModerationEntry[] {
  const entries: ModerationEntry[] = [];

  for (const report of db().reports) {
    const review = findReview(report.review_id);
    if (!review) continue;
    entries.push({
      ...report,
      review,
      organization_id: review.organization_id,
      organization_name: findOrganization(review.organization_id)?.name ?? null,
    });
  }

  return entries.sort(
    (a, b) => Date.parse(b.reported_at) - Date.parse(a.reported_at),
  );
}

/**
 * Clears a report without touching the review: the report was not actionable.
 *
 * Discarding a report rather than deleting it on first sight keeps moderation
 * reversible up until the review itself is removed.
 */
export function dismissReviewReport(reviewId: string): ReportedReview | undefined {
  const reports = db().reports;
  const index = reports.findIndex((report) => report.review_id === reviewId);
  if (index < 0) return undefined;
  return reports.splice(index, 1)[0];
}

/**
 * Removes the review outright — docs/02:315 "Fraudulent reviews are removed" —
 * and clears the report with it, so a removed review cannot be re-surfaced by a
 * stale queue row.
 */
export function removeReview(reviewId: string): Review | undefined {
  const reviews = db().reviews;
  const index = reviews.findIndex((review) => review.id === reviewId);
  if (index < 0) return undefined;

  const [removed] = reviews.splice(index, 1);
  dismissReviewReport(reviewId);
  return removed;
}

/* -------------------------------------------------------------------------- */
/* Verification (docs/04_Database_Design.md:379-393)                           */
/* -------------------------------------------------------------------------- */

export function listVerifications(): VerificationClaim[] {
  return [...db().verifications].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
}

export function findVerificationByOrganization(organizationId: string): VerificationClaim | undefined {
  return db().verifications.find(
    (claim) => claim.organization_id === organizationId,
  );
}

export function createVerificationClaim(input: {
  organization_id: string;
  document_type: VerificationDocumentType | string;
  document_url: string;
}): VerificationClaim {
  const claim: VerificationClaim = {
    id: crypto.randomUUID(),
    organization_id: input.organization_id,
    document_type: String(input.document_type),
    document_url: input.document_url,
    status: "PENDING",
    verified_at: null,
    created_at: new Date().toISOString(),
  };
  db().verifications.unshift(claim);
  return claim;
}

/** Approve or reject a claim and mirror the outcome onto the organization. */
export function decideVerification(
  claimId: string,
  decision: Extract<VerificationStatus, "VERIFIED" | "REJECTED">,
): VerificationClaim | undefined {
  const claim = db().verifications.find((entry) => entry.id === claimId);
  if (!claim) return undefined;

  claim.status = decision;
  claim.verified_at = decision === "VERIFIED" ? new Date().toISOString() : null;

  const organization = findOrganization(claim.organization_id);
  if (organization) organization.verification_status = decision;

  return claim;
}

/* -------------------------------------------------------------------------- */
/* Audit log (docs/04_Database_Design.md:626-628)                              */
/* -------------------------------------------------------------------------- */

export function recordAudit(input: {
  user_id: string;
  action: string;
  resource_id: string;
}): AuditLog {
  const entry: AuditLog = {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    action: input.action,
    resource_id: input.resource_id,
    timestamp: new Date().toISOString(),
    user_name: findUserById(input.user_id)?.name,
  };
  db().auditLogs.unshift(entry);
  // Bound the array so a long dev session cannot grow without limit.
  db().auditLogs = db().auditLogs.slice(0, 100);
  return entry;
}

export function listAuditLogs(): AuditLog[] {
  return db().auditLogs;
}

/* -------------------------------------------------------------------------- */
/* Tokens                                                                     */
/* -------------------------------------------------------------------------- */

function base64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

/**
 * Issued-token denylist, keyed by subject.
 *
 * Stateless JWTs cannot be revoked, so logout records the subject here and
 * `requireUser` treats it as unauthenticated. A real deployment uses a refresh
 * denylist or short-lived access tokens instead, but the dev BFF must still make
 * "sign out" actually sign out, or the UI lies about the user's session state.
 */
function revokedSet(): Set<string> {
  // Held on `globalThis` for the same reason as the database above: a module
  // scope Set would be empty again after a Turbopack dev reload, which would
  // silently un-revoke a logged-out user.
  if (!globalThis.__asipRevoked) {
    globalThis.__asipRevoked = new Set<string>();
  }
  return globalThis.__asipRevoked;
}

export function revokeSubject(subject: string): void {
  revokedSet().add(subject);
}

export function isSubjectRevoked(subject: string): boolean {
  return revokedSet().has(subject);
}

export function issueTokens(user: StoredUser): {
  access_token: string;
  refresh_token: string;
} {
  // A fresh token pair clears any prior revocation for this user, so signing in
  // again restores access.
  revokedSet().delete(user.id);

  const payload = base64url(
    JSON.stringify({ sub: user.id, role: user.role, exp: Date.now() + 3_600_000 }),
  );
  return {
    access_token: `${payload}.dev-signature`,
    refresh_token: `${base64url(JSON.stringify({ sub: user.id, type: "refresh" }))}.dev-signature`,
  };
}

/**
 * True when a token is a refresh token rather than an access token.
 *
 * The dev issuer embeds `type: "refresh"` only in refresh tokens, so a refresh
 * token presented as a bearer credential can be rejected. Real JWTs carry a
 * `type` claim too, but the check is here rather than in `requireUser` because
 * a dev-only guard should not change the shape of the shared helper.
 */
export function isRefreshToken(token: string): boolean {
  const [payload] = token.split(".");
  if (!payload) return false;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { type?: string };
    return claims.type === "refresh";
  } catch {
    return false;
  }
}

export function readTokenSubject(token: string): string | null {
  const [payload] = token.split(".");
  if (!payload) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    if (typeof decoded.sub !== "string") return null;
    if (typeof decoded.exp === "number" && decoded.exp < Date.now()) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Async AI tasks (docs/10_AI_Roadmap.md:199-207)                              */
/* -------------------------------------------------------------------------- */

/** How long a summary job "runs" before it settles, so polling is observable. */
const AI_TASK_DURATION_MS = 3000;

export function createAiTask(organizationId: string): AiTask {
  const task: AiTask = {
    task_id: crypto.randomUUID(),
    organization_id: organizationId,
    status: "PENDING",
    created_at: Date.now(),
    result: null,
  };
  db().tasks.unshift(task);
  db().tasks = db().tasks.slice(0, 50);
  return task;
}

export function findAiTask(taskId: string): AiTask | undefined {
  const task = db().tasks.find((entry) => entry.task_id === taskId);
  if (!task) return undefined;

  // Time-based transition, mirroring a Celery worker completing out of band.
  if (task.status === "PENDING" || task.status === "PROCESSING") {
    const elapsed = Date.now() - task.created_at;
    if (elapsed < 1000) {
      task.status = "PENDING";
    } else if (elapsed < AI_TASK_DURATION_MS) {
      task.status = "PROCESSING";
    } else {
      const organization = findOrganization(task.organization_id);
      task.status = "SUCCESS";
      task.result = summarizeReviews(
        listReviews(task.organization_id),
        organization?.name ?? "This organization",
      );
    }
  }

  return task;
}

export function resetDevBackend(): void {
  globalThis.__asipDevDb = seed();
}

/* -------------------------------------------------------------------------- */
/* Homepage settings (site configuration)                                      */
/* -------------------------------------------------------------------------- */

function homepageSettings(): HomepageSettings {
  const database = db();
  database.settings ??= { sections: defaultHomepageSettings() };
  return database.settings;
}

export function getHomepageSettings(): HomepageSettings {
  return homepageSettings();
}

/**
 * Applies a partial set of section toggles.
 *
 * Only recognised section keys with boolean values are accepted; anything else
 * is ignored so a stale client can never corrupt the stored config.
 */
export function updateHomepageSettings(
  input: HomepageSettingsUpdate,
): HomepageSettings {
  const settings = homepageSettings();
  for (const key of HOMEPAGE_SECTIONS) {
    const value = input.sections[key];
    if (value === undefined) continue;
    if (typeof value !== "boolean") continue;
    settings.sections[key] = value;
  }
  return settings;
}
