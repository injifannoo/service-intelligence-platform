// Smoke tests for the development BFF.
//
// Covers the MVP V1 endpoints in docs/05_API_Design.md: auth, organizations,
// services, reviews, verification, search, comparison, and the admin panel.
//
// Run with the dev server up:  npm run dev   then   npm run smoke

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const API = `${BASE}/api/v1`;

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ""}`);
  }
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { status: response.status, body: json };
}

const section = (title) => console.log(`\n${title}`);

const suffix = Date.now();
const PASSWORD = "Sup3rSecret!42";

const owner = { email: `owner.${suffix}@example.com`, password: PASSWORD };
const customer = { email: `customer.${suffix}@example.com`, password: PASSWORD };
// Seeded demo accounts share one password; see DEMO_PASSWORD in
// src/lib/dev-backend/store.ts.
const admin = { email: "admin@asip.dev", password: "Password123!" };

let ownerToken = null;
let customerToken = null;
let adminToken = null;
let organizationId = null;
let serviceId = null;
let reviewId = null;
let claimId = null;

async function main() {
  section("Health");
  const industries = await call("GET", "/industries/");
  check(
    "GET /industries/ returns 5 phase-one industries",
    industries.status === 200 && industries.body?.data?.length === 5,
    `status=${industries.status}`,
  );
  check(
    "industry list is Technology Services only (docs/08:314-326)",
    industries.body?.data?.every((row) =>
      ["Software", "AI", "IT Services", "Digital Agency", "Cybersecurity"].includes(row.name),
    ) === true,
  );

  section("Auth");
  const badRegister = await call("POST", "/auth/register/", {
    body: { email: "not-an-email", password: "short" },
  });
  check(
    "POST /auth/register/ rejects invalid input with field errors",
    badRegister.status === 400 &&
      badRegister.body?.error?.code === "VALIDATION_ERROR" &&
      Boolean(badRegister.body?.error?.details),
    `status=${badRegister.status} body=${JSON.stringify(badRegister.body)}`,
  );

  const registerOwner = await call("POST", "/auth/register/", {
    body: { email: owner.email, password: owner.password, name: "Smoke Owner" },
  });
  check("POST /auth/register/ creates a user", registerOwner.status === 201);

  const duplicate = await call("POST", "/auth/register/", {
    body: { email: owner.email, password: owner.password, name: "Smoke Owner" },
  });
  check(
    "duplicate email is rejected",
    duplicate.status === 400 && Boolean(duplicate.body?.error?.details?.email),
    `status=${duplicate.status} body=${JSON.stringify(duplicate.body)}`,
  );

  const registerCustomer = await call("POST", "/auth/register/", {
    body: { email: customer.email, password: customer.password, name: "Smoke Customer" },
  });
  check("customer registers", registerCustomer.status === 201);

  const login = await call("POST", "/auth/login/", {
    body: { email: owner.email, password: owner.password },
  });
  check(
    "POST /auth/login/ returns tokens",
    login.status === 200 && Boolean(login.body?.data?.access_token),
    `status=${login.status} body=${JSON.stringify(login.body)}`,
  );
  ownerToken = login.body?.data?.access_token ?? null;

  const customerLogin = await call("POST", "/auth/login/", {
    body: { email: customer.email, password: customer.password },
  });
  customerToken = customerLogin.body?.data?.access_token ?? null;

  const adminLogin = await call("POST", "/auth/login/", { body: admin });
  check("seeded admin signs in", adminLogin.status === 200, `status=${adminLogin.status}`);
  adminToken = adminLogin.body?.data?.access_token ?? null;

  const wrongPassword = await call("POST", "/auth/login/", {
    body: { email: owner.email, password: "WrongPassword1!" },
  });
  check(
    "wrong password yields 401",
    wrongPassword.status === 401,
    `status=${wrongPassword.status} body=${JSON.stringify(wrongPassword.body)}`,
  );

  section("Profile");
  const anonymousProfile = await call("GET", "/users/profile/");
  check("GET /users/profile/ requires auth", anonymousProfile.status === 401);

  const profile = await call("GET", "/users/profile/", { token: ownerToken });
  check(
    "GET /users/profile/ returns the caller",
    profile.status === 200 && profile.body?.data?.email === owner.email,
    `status=${profile.status} body=${JSON.stringify(profile.body)}`,
  );
  check(
    "profile carries organization_id (docs/04 has no owner column)",
    "organization_id" in (profile.body?.data ?? {}),
  );

  const badUpdate = await call("PUT", "/users/profile/", {
    token: ownerToken,
    body: { name: "", email: "nope" },
  });
  check(
    "PUT /users/profile/ validates name and email",
    badUpdate.status === 400 &&
      Boolean(badUpdate.body?.error?.details?.name) &&
      Boolean(badUpdate.body?.error?.details?.email),
  );

  const update = await call("PUT", "/users/profile/", {
    token: ownerToken,
    body: { name: "Smoke Owner Renamed", email: owner.email },
  });
  check(
    "PUT /users/profile/ updates the caller",
    update.status === 200 && update.body?.data?.name === "Smoke Owner Renamed",
  );

  const emailClash = await call("PUT", "/users/profile/", {
    token: ownerToken,
    body: { name: "Smoke Owner", email: customer.email },
  });
  check(
    "profile email must stay unique",
    emailClash.status === 400 && Boolean(emailClash.body?.error?.details?.email),
  );

  section("Organizations");
  const list = await call("GET", "/organizations/?page_size=50");
  check("GET /organizations/ is public", list.status === 200);
  check(
    "list is paginated",
    Array.isArray(list.body?.data) && Boolean(list.body?.pagination),
  );
  const seeded = list.body?.data ?? [];
  check("seed data is present", seeded.length > 0, `count=${seeded.length}`);

  const created = await call("POST", "/organizations/", {
    token: ownerToken,
    body: { name: "Smoke Test Org", industry: "Software", description: "temp" },
  });
  check(
    "POST /organizations/ creates an organization",
    created.status === 201 && Boolean(created.body?.data?.id),
    `status=${created.status} body=${JSON.stringify(created.body)}`,
  );
  organizationId = created.body?.data?.id ?? null;
  check("created organization starts PENDING", created.body?.data?.verification_status === "PENDING");

  const afterCreate = await call("GET", "/users/profile/", { token: ownerToken });
  check(
    "creating an organization links it to the owner",
    afterCreate.body?.data?.organization_id === organizationId,
    `profile.organization_id=${afterCreate.body?.data?.organization_id} org=${organizationId}`,
  );

  const foreign = await call("POST", "/organizations/", {
    token: customerToken,
    body: { name: "Customer Org", industry: "AI" },
  });
  check("a customer can register an organization", foreign.status === 201);
  const foreignId = foreign.body?.data?.id ?? null;

  const foreignService = await call("POST", `/organizations/${organizationId}/services/`, {
    token: customerToken,
    body: { name: "Should not exist" },
  });
  check(
    "a non-owner cannot write to another organization (docs/04:622-624)",
    foreignService.status === 403,
    `status=${foreignService.status}`,
  );

  const filtered = await call("GET", "/organizations/?industry=Software&rating=4");
  check(
    "industry and rating filters apply",
    filtered.status === 200 &&
      filtered.body.data.every(
        (row) =>
          (!row.industry || row.industry.name === "Software") && (row.rating ?? 0) >= 4,
      ),
  );

  const located = await call("GET", "/organizations/?location=addis");
  check("location filter applies", located.status === 200);

  const missing = await call("GET", "/organizations/00000000-0000-4000-8000-000000000000/");
  check("unknown organization returns 404", missing.status === 404);

  const detail = await call("GET", `/organizations/${organizationId}/`);
  check("GET /organizations/{id}/ returns detail", detail.status === 200);
  check("detail nests services", Array.isArray(detail.body?.data?.services));
  check("detail exposes the aggregate rating", "rating" in (detail.body?.data ?? {}));

  section("Services");
  const serviceList = await call("GET", `/organizations/${organizationId}/services/`);
  check("GET /organizations/{id}/services/ is public", serviceList.status === 200);

  const newService = await call("POST", `/organizations/${organizationId}/services/`, {
    token: ownerToken,
    body: { name: "Smoke Consulting", description: "test", price: 250 },
  });
  check(
    "owner adds a service",
    newService.status === 201 && Boolean(newService.body?.data?.id),
    `status=${newService.status} body=${JSON.stringify(newService.body)}`,
  );
  serviceId = newService.body?.data?.id ?? null;

  const badService = await call("POST", `/organizations/${organizationId}/services/`, {
    token: ownerToken,
    body: { description: "no name" },
  });
  check(
    "service requires a name",
    badService.status === 400 && Boolean(badService.body?.error?.details?.name),
  );

  const negativePrice = await call("POST", `/organizations/${organizationId}/services/`, {
    token: ownerToken,
    body: { name: "Bad", price: -5 },
  });
  check("price cannot be negative", negativePrice.status === 400);

  const flatServices = await call("GET", `/services/?organization_id=${organizationId}`);
  check("GET /services/ filters by organization", flatServices.status === 200);
  check(
    "service rows name their organization",
    flatServices.body?.data?.every((row) => typeof row.organization_name === "string"),
  );

  const serviceDetail = await call("GET", `/services/${serviceId}/`);
  check("GET /services/{id}/ returns the service", serviceDetail.status === 200);

  const foreignDelete = await call("DELETE", `/services/${serviceId}/`, {
    token: customerToken,
  });
  check("a non-owner cannot delete a service", foreignDelete.status === 403);

  section("Reviews");
  const noReviews = await call("POST", "/reviews/", {
    token: customerToken,
    body: { organization_id: organizationId, rating: 9, comment: "out of range" },
  });
  check(
    "rating outside 1-5 is rejected",
    noReviews.status === 400 && Boolean(noReviews.body?.error?.details?.rating),
  );

  const anonymousReview = await call("POST", "/reviews/", {
    body: { organization_id: organizationId, rating: 4 },
  });
  check("posting a review requires auth", anonymousReview.status === 401);

  const review = await call("POST", "/reviews/", {
    token: customerToken,
    body: { organization_id: organizationId, rating: 5, comment: "Excellent smoke test" },
  });
  check("a signed-in customer posts a review", review.status === 201);
  reviewId = review.body?.data?.id ?? null;

  const orgReviews = await call("GET", `/organizations/${organizationId}/reviews/`);
  check("GET /organizations/{id}/reviews/ lists reviews", orgReviews.status === 200);
  check("the new review is listed", orgReviews.body?.data?.some((row) => row.id === reviewId));

  const ratingAfter = await call("GET", `/organizations/${organizationId}/`);
  check(
    "the aggregate rating reflects the review",
    ratingAfter.body?.data?.rating === 5 && ratingAfter.body?.data?.review_count === 1,
    `rating=${ratingAfter.body?.data?.rating} count=${ratingAfter.body?.data?.review_count}`,
  );

  const report = await call("POST", `/reviews/${reviewId}/report/`, {
    token: ownerToken,
    body: { reason: "SPAM" },
  });
  check("a review can be reported", report.status === 201);

  const reportAgain = await call("POST", `/reviews/${reviewId}/report/`, {
    token: adminToken,
    body: { reason: "SPAM" },
  });
  check("the same reporter cannot report twice", reportAgain.status === 409);

  const noReason = await call("POST", `/reviews/${reviewId}/report/`, {
    token: adminToken,
    body: {},
  });
  check("a report requires a reason", noReason.status === 400);

  section("Verification");
  const anonymousClaim = await call("POST", `/organizations/${organizationId}/verify/`, {
    body: { document_type: "BUSINESS_LICENSE", document_url: "https://example.com/a.pdf" },
  });
  check("submitting a claim requires auth", anonymousClaim.status === 401);

  const badClaim = await call("POST", `/organizations/${organizationId}/verify/`, {
    token: ownerToken,
    body: { document_type: "BUSINESS_LICENSE", document_url: "not-a-url" },
  });
  check("a claim needs a valid document URL", badClaim.status === 400);

  const claim = await call("POST", `/organizations/${organizationId}/verify/`, {
    token: ownerToken,
    body: { document_type: "BUSINESS_LICENSE", document_url: "https://example.com/license.pdf" },
  });
  check("owner submits a verification claim", claim.status === 201);
  check("the claim starts PENDING", claim.body?.data?.status === "PENDING");
  claimId = claim.body?.data?.id ?? null;

  const stillPending = await call("GET", `/organizations/${organizationId}/`);
  check(
    "a submitted claim leaves the organization PENDING",
    stillPending.body?.data?.verification_status === "PENDING",
  );

  const customerQueue = await call("GET", "/admin/verifications/", { token: customerToken });
  check("a customer cannot read the admin queue", customerQueue.status === 403);

  const anonymousQueue = await call("GET", "/admin/verifications/");
  check("the admin queue requires auth", anonymousQueue.status === 401);

  const queue = await call("GET", "/admin/verifications/", { token: adminToken });
  check("an admin reads the queue", queue.status === 200);
  check(
    "the queue includes the new claim",
    queue.body?.data?.some((row) => row.id === claimId),
  );

  const approve = await call("POST", `/admin/verifications/${claimId}/`, {
    token: adminToken,
    body: { action: "APPROVE" },
  });
  check("an admin approves a claim", approve.status === 200);
  check("the claim becomes VERIFIED", approve.body?.data?.status === "VERIFIED");

  const nowVerified = await call("GET", `/organizations/${organizationId}/`);
  check(
    "the organization becomes VERIFIED",
    nowVerified.body?.data?.verification_status === "VERIFIED",
  );

  const claimAgain = await call("POST", `/organizations/${organizationId}/verify/`, {
    token: ownerToken,
    body: { document_type: "OTHER", document_url: "https://example.com/other.pdf" },
  });
  check("a verified organization cannot re-claim", claimAgain.status === 409);

  const badDecision = await call("POST", `/admin/verifications/${claimId}/`, {
    token: adminToken,
    body: { action: "MAYBE" },
  });
  check("an unknown decision is rejected", badDecision.status === 400);

  section("Search");
  const keyword = await call("GET", "/search/?query=hotel");
  check("GET /search/ accepts a query", keyword.status === 200);

  const match = await call("GET", "/search/?query=smoke");
  check(
    "search matches seeded and created text",
    match.status === 200 &&
      match.body?.data?.some((row) => row.name.toLowerCase().includes("smoke")),
  );

  const empty = await call("GET", "/search/?query=zzzznotathing");
  check("a non-matching query returns an empty page", empty.status === 200 && empty.body.data.length === 0);

  const byIndustry = await call("GET", "/search/?industry=Software");
  check("search filters by industry", byIndustry.status === 200);

  section("Comparison");
  const anonymousCompare = await call("POST", "/comparison/", {
    body: { organizations: [organizationId, foreignId], criteria: ["rating"] },
  });
  check("comparison requires auth", anonymousCompare.status === 401);

  const tooFew = await call("POST", "/comparison/", {
    token: customerToken,
    body: { organizations: [organizationId], criteria: ["rating"] },
  });
  check("comparison needs two organizations", tooFew.status === 400);

  const noCriteria = await call("POST", "/comparison/", {
    token: customerToken,
    body: { organizations: [organizationId, foreignId], criteria: [] },
  });
  check("comparison needs a criterion", noCriteria.status === 400);

  const unknownOrg = await call("POST", "/comparison/", {
    token: customerToken,
    body: {
      organizations: [organizationId, "00000000-0000-4000-8000-000000000000"],
      criteria: ["rating"],
    },
  });
  check("comparison rejects unknown organizations", unknownOrg.status === 404);

  const comparison = await call("POST", "/comparison/", {
    token: customerToken,
    body: { organizations: [organizationId, foreignId], criteria: ["rating", "services"] },
  });
  check("comparison succeeds", comparison.status === 200);
  check("comparison returns one row per organization", comparison.body?.data?.organizations?.length === 2);
  check(
    "comparison rows carry services for the matrix",
    comparison.body?.data?.organizations?.every((row) => Array.isArray(row.services)),
  );
  check("comparison echoes the criteria", comparison.body?.data?.criteria?.length === 2);

  section("Audit log");
  const customerLogs = await call("GET", "/admin/audit-logs/", { token: customerToken });
  check("a customer cannot read audit logs", customerLogs.status === 403);

  const logs = await call("GET", "/admin/audit-logs/", { token: adminToken });
  check("an admin reads audit logs", logs.status === 200);
  check(
    "the review, service, and verification actions were audited",
    ["service.created", "review.created", "verification.verified"].every((action) =>
      logs.body?.data?.some((row) => row.action === action),
    ),
    JSON.stringify(logs.body?.data?.map((row) => row.action)),
  );

  section("Cleanup");
  // Runs before logout, which revokes the owner subject and would otherwise
  // fail these checks for the wrong reason.
  const removed = await call("DELETE", `/services/${serviceId}/`, { token: ownerToken });
  check(
    "the owner deletes a service",
    removed.status === 200,
    `status=${removed.status} body=${JSON.stringify(removed.body)}`,
  );
  const gone = await call("GET", `/services/${serviceId}/`);
  check("the deleted service is gone", gone.status === 404, `status=${gone.status}`);

  section("Refresh and logout");
  // The route accepts `refresh_token` (what the real API and api-client send)
  // and falls back to `refresh`.
  const refresh = await call("POST", "/auth/refresh/", {
    body: { refresh_token: login.body?.data?.refresh_token },
  });
  check(
    "POST /auth/refresh/ rotates the access token",
    refresh.status === 200 && Boolean(refresh.body?.data?.access_token),
    `status=${refresh.status} body=${JSON.stringify(refresh.body)}`,
  );
  check("a new refresh token is issued", Boolean(refresh.body?.data?.refresh_token));

  const staleToken = await call("GET", "/users/profile/", {
    token: login.body?.data?.refresh_token,
  });
  check("a refresh token is not accepted as an access token", staleToken.status === 401);

  const badRefresh = await call("POST", "/auth/refresh/", {
    body: { refresh_token: "garbage" },
  });
  check("an invalid refresh token is rejected", badRefresh.status === 401);

  const logout = await call("POST", "/auth/logout/", { token: refresh.body?.data?.access_token });
  check("POST /auth/logout/ succeeds", logout.status === 200, `status=${logout.status}`);

  const afterLogout = await call("GET", "/users/profile/", {
    token: refresh.body?.data?.access_token,
  });
  check("the access token is revoked by logout", afterLogout.status === 401);

  const reused = await call("GET", "/users/profile/", { token: ownerToken });
  check("logout revokes the session, not just the rotated token", reused.status === 401);

  console.log(`\n${"=".repeat(52)}`);
  console.log(`${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.log("\nFailed checks:");
    for (const name of failures) console.log(`  - ${name}`);
    process.exit(1);
  }
  console.log("All smoke checks passed.");
}

main().catch((error) => {
  console.error("\nSmoke run crashed:", error);
  process.exit(1);
});
