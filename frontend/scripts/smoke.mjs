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
const superAdmin = { email: "superadmin@asip.dev", password: "Password123!" };

let ownerToken = null;
let customerToken = null;
let adminToken = null;
let superAdminToken = null;
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
  const escalateRegister = await call("POST", "/auth/register/", {
    body: { name: "Escalator", email: `escalator.${suffix}@example.com`, password: PASSWORD, role: "SUPER_ADMIN" },
  });
  check(
    "public registration cannot self-assign a privileged role",
    escalateRegister.status === 400,
    `status=${escalateRegister.status}`,
  );

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

  // The register form signs a new account straight in, so a fresh registrant must
  // be able to obtain a session and read their own profile without an email step.
  // This is what the previous "check your inbox" screen made impossible.
  const freshEmail = `fresh.${suffix}@example.com`;
  const freshRegister = await call("POST", "/auth/register/", {
    body: { email: freshEmail, password: PASSWORD, name: "Fresh Signup" },
  });
  check("a brand-new account registers", freshRegister.status === 201);

  const freshLogin = await call("POST", "/auth/login/", {
    body: { email: freshEmail, password: PASSWORD },
  });
  check(
    "a brand-new account can sign in immediately, with no email verification step",
    freshLogin.status === 200 && Boolean(freshLogin.body?.data?.access_token),
    `status=${freshLogin.status}`,
  );

  if (freshLogin.body?.data?.access_token) {
    const freshProfile = await call("GET", "/users/profile/", {
      token: freshLogin.body.data.access_token,
    });
    check(
      "the new account starts as an active CUSTOMER",
      freshProfile.status === 200 && freshProfile.body?.data?.role === "CUSTOMER",
      `status=${freshProfile.status} role=${freshProfile.body?.data?.role}`,
    );
  }

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

  const superAdminLogin = await call("POST", "/auth/login/", { body: superAdmin });
  check(
    "seeded super admin signs in",
    superAdminLogin.status === 200,
    `status=${superAdminLogin.status}`,
  );
  superAdminToken = superAdminLogin.body?.data?.access_token ?? null;

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

  section("Service editing");
  const editedService = await call("PUT", `/services/${serviceId}/`, {
    token: ownerToken,
    body: { name: "Smoke Consulting Renamed", price: 300 },
  });
  check(
    "owner edits a service",
    editedService.status === 200 &&
      editedService.body?.data?.name === "Smoke Consulting Renamed" &&
      editedService.body?.data?.price === 300,
    `status=${editedService.status} body=${JSON.stringify(editedService.body)}`,
  );

  const partialEdit = await call("PUT", `/services/${serviceId}/`, {
    token: ownerToken,
    body: { name: "Smoke Consulting Renamed" },
  });
  check(
    "a partial edit leaves omitted fields untouched",
    partialEdit.status === 200 && partialEdit.body?.data?.price === 300,
    `status=${partialEdit.status} body=${JSON.stringify(partialEdit.body)}`,
  );

  const blankName = await call("PUT", `/services/${serviceId}/`, {
    token: ownerToken,
    body: { name: "   " },
  });
  check(
    "an edited service still requires a name",
    blankName.status === 400 && Boolean(blankName.body?.error?.details?.name),
    `status=${blankName.status}`,
  );

  const negativeEdit = await call("PUT", `/services/${serviceId}/`, {
    token: ownerToken,
    body: { price: -1 },
  });
  check("an edited price cannot be negative", negativeEdit.status === 400);

  const foreignEdit = await call("PUT", `/services/${serviceId}/`, {
    token: customerToken,
    body: { name: "Hijacked" },
  });
  check("a non-owner cannot edit a service", foreignEdit.status === 403);

  const adminEdit = await call("PUT", `/services/${serviceId}/`, {
    token: adminToken,
    body: { description: "moderated copy" },
  });
  check(
    "an admin can edit any service",
    adminEdit.status === 200 && adminEdit.body?.data?.description === "moderated copy",
    `status=${adminEdit.status} body=${JSON.stringify(adminEdit.body)}`,
  );

  const serviceAudit = await call("GET", "/admin/audit-logs/", { token: adminToken });
  check(
    "a service edit is written to the audit log",
    Array.isArray(serviceAudit.body?.data) &&
      serviceAudit.body.data.some((row) => row.action === "service.updated"),
    JSON.stringify(serviceAudit.body?.data?.map((row) => row.action)),
  );

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

  section("Content moderation");
  const anonymousReports = await call("GET", "/admin/reports/");
  check("GET /admin/reports/ requires auth", anonymousReports.status === 401);

  const customerReports = await call("GET", "/admin/reports/", { token: customerToken });
  check(
    "a customer cannot read the moderation queue",
    customerReports.status === 403 &&
      customerReports.body?.error?.code === "PERMISSION_DENIED",
    `status=${customerReports.status}`,
  );

  const adminQueue = await call("GET", "/admin/reports/", { token: adminToken });
  check("an admin reads the moderation queue", adminQueue.status === 200);
  check(
    "the reported review appears in the queue",
    adminQueue.body?.data?.some((row) => row.review_id === reviewId),
    JSON.stringify(adminQueue.body?.data?.map((row) => row.review_id)),
  );
  check(
    "the queue entry carries the review and its organization",
    adminQueue.body?.data?.every(
      (row) =>
        typeof row.organization_name === "string" &&
        typeof row.review?.comment === "string" &&
        typeof row.reason === "string",
    ),
    JSON.stringify(adminQueue.body?.data),
  );

  const superAdminQueue = await call("GET", "/admin/reports/", { token: superAdminToken });
  check("a super admin reads the same queue", superAdminQueue.status === 200);

  const badAction = await call("POST", `/admin/reports/${reviewId}/`, {
    token: adminToken,
    body: { action: "YEET" },
  });
  check("a decision outside the vocabulary is rejected", badAction.status === 400);

  const customerDecision = await call("POST", `/admin/reports/${reviewId}/`, {
    token: customerToken,
    body: { action: "DISMISS" },
  });
  check("a customer cannot decide on a report", customerDecision.status === 403);

  const reviewsBefore = await call("GET", `/organizations/${organizationId}/reviews/`);
  const dismiss = await call("POST", `/admin/reports/${reviewId}/`, {
    token: adminToken,
    body: { action: "DISMISS" },
  });
  check("dismissing a report succeeds", dismiss.status === 200);

  const afterDismiss = await call("GET", "/admin/reports/", { token: adminToken });
  check(
    "a dismissed report leaves the queue",
    afterDismiss.body?.data?.length === 0,
    `count=${afterDismiss.body?.data?.length}`,
  );

  const reviewsAfter = await call("GET", `/organizations/${organizationId}/reviews/`);
  check(
    "dismissing keeps the review",
    reviewsAfter.body?.data?.length === reviewsBefore.body?.data?.length,
    `${reviewsBefore.body?.data?.length} -> ${reviewsAfter.body?.data?.length}`,
  );

  // Editing and deleting belong to the author alone (docs/02:181-182), so this
  // case gets its own throwaway review too: the analytics dashboard asserted an
  // exact review count for this organization further down the run.
  section("Review editing and deletion");
  const editable = await call("POST", "/reviews/", {
    token: customerToken,
    body: { organization_id: organizationId, rating: 3, comment: "Draft comment" },
  });
  check("a throwaway review is posted for the edit case", editable.status === 201);
  const editableId = editable.body?.data?.id ?? null;

  const anonymousEdit = await call("PUT", `/reviews/${editableId}/`, {
    body: { comment: "Nope" },
  });
  check("editing a review requires auth", anonymousEdit.status === 401);

  const ownerEdit = await call("PUT", `/reviews/${editableId}/`, {
    token: ownerToken,
    body: { comment: "Rewritten by the organization owner" },
  });
  check(
    "the organization's owner cannot rewrite someone else's review",
    ownerEdit.status === 403 && ownerEdit.body?.error?.code === "PERMISSION_DENIED",
    `status=${ownerEdit.status} body=${JSON.stringify(ownerEdit.body)}`,
  );

  const adminRewrite = await call("PUT", `/reviews/${editableId}/`, {
    token: adminToken,
    body: { comment: "Rewritten by an administrator" },
  });
  check(
    "an administrator cannot rewrite it either (moderation is removal)",
    adminRewrite.status === 403,
    `status=${adminRewrite.status}`,
  );

  const missingEdit = await call(
    "PUT",
    "/reviews/00000000-0000-4000-8000-0000000000ee/",
    { token: customerToken, body: { comment: "Ghost" } },
  );
  check("editing an unknown review is a 404", missingEdit.status === 404);

  const badRating = await call("PUT", `/reviews/${editableId}/`, {
    token: customerToken,
    body: { rating: 6 },
  });
  check(
    "a rating outside 1-5 is rejected",
    badRating.status === 400 && Boolean(badRating.body?.error?.details?.rating),
    `status=${badRating.status} body=${JSON.stringify(badRating.body)}`,
  );

  const emptyEdit = await call("PUT", `/reviews/${editableId}/`, {
    token: customerToken,
    body: {},
  });
  check(
    "an edit with nothing to change is rejected",
    emptyEdit.status === 400 && emptyEdit.body?.error?.code === "INVALID_PAYLOAD",
    `status=${emptyEdit.status}`,
  );

  const edited = await call("PUT", `/reviews/${editableId}/`, {
    token: customerToken,
    body: { rating: 5, comment: "Revised by the author" },
  });
  check(
    "the author edits their own review",
    edited.status === 200 && edited.body?.data?.comment === "Revised by the author",
    `status=${edited.status}`,
  );

  const afterEdit = await call("GET", `/organizations/${organizationId}/reviews/`);
  check(
    "the edited review is listed with the new text",
    afterEdit.body?.data?.some(
      (row) =>
        row.id === editableId &&
        row.rating === 5 &&
        row.comment === "Revised by the author",
    ),
  );

  // `comment` is nullable by design (docs/04:351), so an omitted key has to
  // leave it alone while null clears it — otherwise a rating-only edit would
  // silently wipe the text.
  const ratingOnly = await call("PUT", `/reviews/${editableId}/`, {
    token: customerToken,
    body: { rating: 4 },
  });
  check(
    "a rating-only edit leaves the comment alone",
    ratingOnly.status === 200 &&
      ratingOnly.body?.data?.comment === "Revised by the author",
    `status=${ratingOnly.status} comment=${ratingOnly.body?.data?.comment}`,
  );

  const cleared = await call("PUT", `/reviews/${editableId}/`, {
    token: customerToken,
    body: { comment: null, rating: 5 },
  });
  check(
    "sending null clears the comment",
    cleared.status === 200 && cleared.body?.data?.comment === null,
    `status=${cleared.status} comment=${cleared.body?.data?.comment}`,
  );

  const reportEditable = await call("POST", `/reviews/${editableId}/report/`, {
    token: ownerToken,
    body: { reason: "SPAM" },
  });
  check("the throwaway review is reported", reportEditable.status === 201);

  const reportedBeforeAuthorDelete = await call("GET", "/admin/stats/", {
    token: adminToken,
  });
  check(
    "the report is on file before the author deletes",
    reportedBeforeAuthorDelete.body?.data?.reviews?.reported === 1,
    `reported=${reportedBeforeAuthorDelete.body?.data?.reviews?.reported}`,
  );

  const anonDelete = await call("DELETE", `/reviews/${editableId}/`);
  check("deleting a review requires auth", anonDelete.status === 401);

  const ownerDelete = await call("DELETE", `/reviews/${editableId}/`, {
    token: ownerToken,
  });
  check(
    "another user cannot delete it",
    ownerDelete.status === 403 && ownerDelete.body?.error?.code === "PERMISSION_DENIED",
    `status=${ownerDelete.status} body=${JSON.stringify(ownerDelete.body)}`,
  );

  const missingDelete = await call(
    "DELETE",
    "/reviews/00000000-0000-4000-8000-0000000000ee/",
    { token: customerToken },
  );
  check("deleting an unknown review is a 404", missingDelete.status === 404);

  const deleted = await call("DELETE", `/reviews/${editableId}/`, {
    token: customerToken,
  });
  check(
    "the author deletes their own review",
    deleted.status === 200 && deleted.body?.data?.message === "Review deleted",
    `status=${deleted.status}`,
  );

  const afterDelete = await call("GET", `/organizations/${organizationId}/reviews/`);
  check(
    "the deleted review is gone",
    !afterDelete.body?.data?.some((row) => row.id === editableId),
  );
  check(
    "the other reviews on the organization survive",
    afterDelete.body?.data?.length === reviewsBefore.body?.data?.length,
    `${reviewsBefore.body?.data?.length} -> ${afterDelete.body?.data?.length}`,
  );

  const statsAfterAuthorDelete = await call("GET", "/admin/stats/", {
    token: adminToken,
  });
  check(
    "deleting a reported review clears its report too",
    statsAfterAuthorDelete.body?.data?.reviews?.reported === 0,
    `reported=${statsAfterAuthorDelete.body?.data?.reviews?.reported}`,
  );

  const deleteAgain = await call("DELETE", `/reviews/${editableId}/`, {
    token: customerToken,
  });
  check("deleting the same review twice is a 404", deleteAgain.status === 404);

  // Removal gets its own throwaway review: the analytics dashboard asserted
  // an exact review count for this organization further down the run.
  const doomed = await call("POST", "/reviews/", {
    token: customerToken,
    body: { organization_id: organizationId, rating: 1, comment: "Reported for removal" },
  });
  check("a throwaway review is posted for the removal case", doomed.status === 201);
  const doomedId = doomed.body?.data?.id ?? null;

  const reportDoomed = await call("POST", `/reviews/${doomedId}/report/`, {
    token: ownerToken,
    body: { reason: "SPAM" },
  });
  check("the throwaway review is reported", reportDoomed.status === 201);

  const statsReported = await call("GET", "/admin/stats/", { token: adminToken });
  check(
    "the reported count includes it",
    statsReported.body?.data?.reviews?.reported === 1,
    `reported=${statsReported.body?.data?.reviews?.reported}`,
  );

  const remove = await call("POST", `/admin/reports/${doomedId}/`, {
    token: adminToken,
    body: { action: "REMOVE" },
  });
  check("upholding a report removes the review", remove.status === 200);

  const goneFromOrg = await call("GET", `/organizations/${organizationId}/reviews/`);
  check(
    "the removed review is gone from the organization",
    !goneFromOrg.body?.data?.some((row) => row.id === doomedId),
  );

  const statsAfterRemove = await call("GET", "/admin/stats/", { token: adminToken });
  check(
    "the reported count drops back",
    statsAfterRemove.body?.data?.reviews?.reported === 0,
    `reported=${statsAfterRemove.body?.data?.reviews?.reported}`,
  );

  const staleDecision = await call("POST", `/admin/reports/${doomedId}/`, {
    token: adminToken,
    body: { action: "DISMISS" },
  });
  check("deciding on a resolved report is a 404", staleDecision.status === 404);

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

  section("Admin accounts and roles");
  const superAdminProfile = await call("GET", "/users/profile/", { token: superAdminToken });
  check(
    "the seeded super admin has the SUPER_ADMIN role",
    superAdminProfile.body?.data?.role === "SUPER_ADMIN",
    `role=${superAdminProfile.body?.data?.role}`,
  );

  const anonymousUsers = await call("GET", "/admin/users/");
  check("GET /admin/users/ requires auth", anonymousUsers.status === 401);

  const anonymousStats = await call("GET", "/admin/stats/");
  check("GET /admin/stats/ requires auth", anonymousStats.status === 401);

  const customerUsers = await call("GET", "/admin/users/", { token: customerToken });
  check("a customer cannot list accounts", customerUsers.status === 403);

  const adminUsers = await call("GET", "/admin/users/", { token: adminToken });
  check(
    "a regular admin cannot list accounts either (Super Admin owns accounts)",
    adminUsers.status === 403,
    `status=${adminUsers.status}`,
  );

  const adminCreate = await call("POST", "/admin/users/", {
    token: adminToken,
    body: { name: "Sneaky Admin", email: `sneaky.${suffix}@example.com`, password: PASSWORD, role: "SUPER_ADMIN" },
  });
  check("a regular admin cannot promote anyone to Super Admin", adminCreate.status === 403);

  const superAdminUsers = await call("GET", "/admin/users/", { token: superAdminToken });
  check(
    "a super admin lists accounts",
    superAdminUsers.status === 200 && Array.isArray(superAdminUsers.body?.data),
    `status=${superAdminUsers.status}`,
  );
  check(
    "the account list never exposes password material",
    !JSON.stringify(superAdminUsers.body ?? {}).includes(PASSWORD),
  );

  const superAdminStats = await call("GET", "/admin/stats/", { token: superAdminToken });
  check(
    "the overview stats report platform counts",
    superAdminStats.status === 200 &&
      typeof superAdminStats.body?.data?.users?.total === "number" &&
      typeof superAdminStats.body?.data?.organizations?.total === "number",
    `status=${superAdminStats.status}`,
  );

  const adminStats = await call("GET", "/admin/stats/", { token: adminToken });
  check("a regular admin may read the overview stats", adminStats.status === 200);

  const promoted = await call("POST", "/admin/users/", {
    token: superAdminToken,
    body: { name: "Provisioned Admin", email: `provisioned.${suffix}@example.com`, password: PASSWORD, role: "ADMIN" },
  });
  check("a super admin provisions an admin", promoted.status === 201, `status=${promoted.status}`);
  const provisionedId = promoted.body?.data?.id ?? null;
  check(
    "the provisioned account is created active and without a password echo",
    promoted.body?.data?.status === true &&
      !JSON.stringify(promoted.body ?? {}).includes(PASSWORD),
  );

  const promotedLogin = await call("POST", "/auth/login/", {
    body: { email: `provisioned.${suffix}@example.com`, password: PASSWORD },
  });
  check(
    "the provisioned admin can sign in immediately",
    promotedLogin.status === 200,
    `status=${promotedLogin.status}`,
  );

  const badRole = await call("POST", "/admin/users/", {
    token: superAdminToken,
    body: { name: "Owner Grab", email: `owner.grab.${suffix}@example.com`, password: PASSWORD, role: "ORGANIZATION_OWNER" },
  });
  check(
    "ownership is not an assignable role",
    badRole.status === 400,
    `status=${badRole.status}`,
  );

  const selfDemotion = await call("PATCH", `/admin/users/${superAdminProfile.body?.data?.id}/`, {
    token: superAdminToken,
    body: { role: "ADMIN" },
  });
  check(
    "a super admin cannot demote themselves and lock out account management",
    selfDemotion.status === 403,
    `status=${selfDemotion.status}`,
  );

  if (provisionedId) {
    const deactivated = await call("PATCH", `/admin/users/${provisionedId}/`, {
      token: superAdminToken,
      body: { status: false },
    });
    check(
      "a super admin deactivates an account",
      deactivated.status === 200 && deactivated.body?.data?.status === false,
      `status=${deactivated.status}`,
    );

    const afterDeactivation = await call("POST", "/auth/login/", {
      body: { email: `provisioned.${suffix}@example.com`, password: PASSWORD },
    });
    check(
      "a deactivated account cannot sign in",
      afterDeactivation.status === 401 || afterDeactivation.status === 403,
      `status=${afterDeactivation.status}`,
    );
  }

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

  const byPrice = await call("GET", "/search/?price=100");
  check(
    "search filters by maximum price (Sprint 5)",
    byPrice.status === 200,
    `status=${byPrice.status}`,
  );

  const cheapEnough = await call("GET", "/search/?price=100000");
  check(
    "the smoke organization is returned under a generous budget",
    cheapEnough.body?.data?.some((row) => row.id === organizationId) === true,
    JSON.stringify(cheapEnough.body?.data?.map((row) => row.name)),
  );

  const tooCheap = await call("GET", "/search/?price=1");
  check(
    "the smoke organization is excluded under an impossible budget",
    tooCheap.body?.data?.some((row) => row.id === organizationId) === false,
  );

  section("Semantic search (MVP V2)");
  const anonymousSemantic = await call("POST", "/search/ai/", { body: { query: "cloud" } });
  check("POST /search/ai/ requires auth", anonymousSemantic.status === 401);

  const noQuery = await call("POST", "/search/ai/", {
    token: ownerToken,
    body: { query: "   " },
  });
  check(
    "POST /search/ai/ requires a non-empty query",
    noQuery.status === 422 && noQuery.body?.error?.code === "MISSING_QUERY",
    `status=${noQuery.status}`,
  );

  const semantic = await call("POST", "/search/ai/", {
    token: ownerToken,
    body: { query: "managed cloud hosting and backups" },
  });
  check(
    "POST /search/ai/ returns ranked hits",
    semantic.status === 200 && Array.isArray(semantic.body?.data?.results),
    `status=${semantic.status} body=${JSON.stringify(semantic.body)}`,
  );
  check(
    "a hit explains itself with readable terms",
    semantic.body?.data?.results?.every(
      (hit) => typeof hit.name === "string" && typeof hit.reason === "string",
    ) === true,
  );
  check(
    "reason lines quote surface words, not stems",
    semantic.body?.data?.results?.every(
      (hit) => !/"[^"]*\bhost\b[^"]*"/.test(hit.reason ?? ""),
    ) === true,
    JSON.stringify(semantic.body?.data?.results?.map((hit) => hit.reason)),
  );
  check(
    "hits are ordered by descending score",
    semantic.body?.data?.results?.every(
      (hit, index, all) => index === 0 || all[index - 1].score >= hit.score,
    ) === true,
  );

  const industryQuery = await call("POST", "/search/ai/", {
    token: ownerToken,
    body: { query: "cybersecurity penetration testing" },
  });
  check(
    "industry-only taxonomy terms are searchable",
    industryQuery.body?.data?.results?.some((hit) => /security/i.test(hit.name)) === true,
    JSON.stringify(industryQuery.body?.data?.results?.map((hit) => hit.name)),
  );

  section("Sentiment (MVP V2)");
  const noReviewsSentiment = await call("POST", "/ai/sentiment/", {
    token: ownerToken,
    body: { organization_id: foreignId },
  });
  check(
    "sentiment needs reviews to analyse",
    noReviewsSentiment.status === 404 &&
      noReviewsSentiment.body?.error?.code === "NO_REVIEWS",
    `status=${noReviewsSentiment.status} body=${JSON.stringify(noReviewsSentiment.body)}`,
  );

  const orgSentiment = await call("POST", "/ai/sentiment/", {
    token: ownerToken,
    body: { organization_id: organizationId },
  });
  check(
    "POST /ai/sentiment/ returns a two-way split summing to 100",
    orgSentiment.status === 200 &&
      orgSentiment.body?.data?.positive + orgSentiment.body?.data?.negative === 100,
    `status=${orgSentiment.status} body=${JSON.stringify(orgSentiment.body)}`,
  );

  const textSentiment = await call("POST", "/ai/sentiment/", {
    token: ownerToken,
    body: { text: "excellent and reliable, would recommend" },
  });
  check(
    "sentiment scores arbitrary text",
    textSentiment.status === 200 && textSentiment.body?.data?.positive > 0,
  );

  const sentimentNoInput = await call("POST", "/ai/sentiment/", {
    token: ownerToken,
    body: {},
  });
  check("POST /ai/sentiment/ requires some input", sentimentNoInput.status === 422);

  section("Recommendations (MVP V2)");
  const noCategory = await call("POST", "/ai/recommend/", {
    token: ownerToken,
    body: { budget: "low" },
  });
  check(
    "POST /ai/recommend/ requires a category",
    noCategory.status === 400 && Boolean(noCategory.body?.error?.details?.category),
    `status=${noCategory.status}`,
  );

  const badBudget = await call("POST", "/ai/recommend/", {
    token: ownerToken,
    body: { category: "cloud", budget: "enormous" },
  });
  check(
    "an unknown budget is rejected",
    badBudget.status === 400 && Boolean(badBudget.body?.error?.details?.budget),
  );

  const recommendations = await call("POST", "/ai/recommend/", {
    token: ownerToken,
    body: { category: "cloud hosting", budget: "low", location: "Bahir Dar" },
  });
  check(
    "POST /ai/recommend/ returns an explained shortlist",
    recommendations.status === 200 &&
      Array.isArray(recommendations.body?.data?.recommendations) &&
      recommendations.body.data.recommendations.every((row) => row.name && row.reason),
    `status=${recommendations.status} body=${JSON.stringify(recommendations.body)}`,
  );
  check(
    "recommendations are ordered by descending score",
    recommendations.body?.data?.recommendations?.every(
      (row, index, all) => index === 0 || all[index - 1].score >= row.score,
    ) === true,
  );

  const nonsenseCategory = await call("POST", "/ai/recommend/", {
    token: ownerToken,
    body: { category: "zzzznotathing" },
  });
  check(
    "a category matching nothing returns no recommendations",
    nonsenseCategory.status === 200 &&
      nonsenseCategory.body?.data?.recommendations?.length === 0,
    JSON.stringify(nonsenseCategory.body?.data?.recommendations?.map((row) => row.name)),
  );

  section("Analytics dashboard (MVP V2)");
  const anonymousDashboard = await call(
    "GET",
    `/organizations/${organizationId}/analytics/dashboard/`,
  );
  check("the dashboard requires auth", anonymousDashboard.status === 401);

  const customerDashboard = await call(
    "GET",
    `/organizations/${organizationId}/analytics/dashboard/`,
    { token: customerToken },
  );
  check(
    "a customer cannot read the dashboard",
    customerDashboard.status === 403 &&
      customerDashboard.body?.error?.code === "PERMISSION_DENIED",
    `status=${customerDashboard.status}`,
  );

  const ownerDashboard = await call(
    "GET",
    `/organizations/${organizationId}/analytics/dashboard/`,
    { token: ownerToken },
  );
  check(
    "the owner reads their own dashboard",
    ownerDashboard.status === 200,
    `status=${ownerDashboard.status} body=${JSON.stringify(ownerDashboard.body)}`,
  );
  check(
    "the dashboard reports the review count",
    ownerDashboard.body?.data?.reviews === 1,
    JSON.stringify(ownerDashboard.body?.data?.reviews),
  );
  check(
    "the dashboard groups rating trends by month",
    Array.isArray(ownerDashboard.body?.data?.rating_trends) &&
      ownerDashboard.body.data.rating_trends.every(
        (row) => typeof row.period === "string" && typeof row.average === "number",
      ),
    JSON.stringify(ownerDashboard.body?.data?.rating_trends),
  );
  check(
    "the dashboard ranks competitors 1-based",
    ownerDashboard.body?.data?.competitor_position?.every((row) => row.rank >= 1) === true,
  );

  const adminDashboard = await call(
    "GET",
    `/organizations/${organizationId}/analytics/dashboard/`,
    { token: adminToken },
  );
  check("an admin may read any dashboard", adminDashboard.status === 200);

  const missingDashboard = await call(
    "GET",
    "/organizations/00000000-0000-4000-8000-0000000000ff/analytics/dashboard/",
    { token: adminToken },
  );
  check("an unknown organization has no dashboard", missingDashboard.status === 404);

  section("AI review summary (MVP V2)");
  const badSummary = await call("POST", "/organizations/00000000-0000-4000-8000-0000000000ff/ai/review-summary/", {
    token: ownerToken,
  });
  check("a summary task for an unknown organization is rejected", badSummary.status === 404);

  const acceptedSummary = await call(
    "POST",
    `/organizations/${organizationId}/ai/review-summary/`,
    { token: ownerToken },
  );
  check(
    "POST /ai/review-summary/ returns 202 with a task id, not a summary",
    acceptedSummary.status === 202 && Boolean(acceptedSummary.body?.data?.task_id),
    `status=${acceptedSummary.status} body=${JSON.stringify(acceptedSummary.body)}`,
  );

  const taskId = acceptedSummary.body?.data?.task_id;
  const firstPoll = await call("GET", `/ai/tasks/${taskId}/`, { token: ownerToken });
  check(
    "the task is non-terminal on first read",
    ["PENDING", "PROCESSING"].includes(firstPoll.body?.data?.status),
    JSON.stringify(firstPoll.body?.data?.status),
  );

  // The dev backend settles a task on elapsed time, so poll like the client does.
  let settled = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    settled = await call("GET", `/ai/tasks/${taskId}/`, { token: ownerToken });
    if (["SUCCESS", "FAILURE"].includes(settled.body?.data?.status)) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  check(
    "the task reaches SUCCESS",
    settled?.body?.data?.status === "SUCCESS",
    JSON.stringify(settled?.body?.data?.status),
  );
  check(
    "the summary is derived from the reviews on file",
    typeof settled?.body?.data?.result?.summary === "string" &&
      settled.body.data.result.summary.length > 0 &&
      Array.isArray(settled.body.data.result.strengths),
    JSON.stringify(settled?.body?.data?.result),
  );

  const unknownTask = await call("GET", "/ai/tasks/00000000-0000-4000-8000-0000000000ff/", {
    token: ownerToken,
  });
  check("an unknown task id is 404", unknownTask.status === 404);

  const anonymousTask = await call("GET", `/ai/tasks/${taskId}/`);
  check("a task cannot be polled without auth", anonymousTask.status === 401);

  // Any authenticated user may poll: the result is derived from public reviews,
  // and task ids are unguessable UUIDs, so this is not an authorization boundary.
  const customerTask = await call("GET", `/ai/tasks/${taskId}/`, { token: customerToken });
  check(
    "an authenticated non-owner may poll a summary task",
    customerTask.status === 200,
    `status=${customerTask.status}`,
  );

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

  // docs/02:189-199 and docs/09:380 list seven criteria; the original three
  // were the only ones the matrix could render.
  const allCriteria = [
    "rating",
    "reviews",
    "price",
    "services",
    "location",
    "verification",
    "sentiment",
  ];
  const broad = await call("POST", "/comparison/", {
    token: customerToken,
    body: { organizations: [organizationId, foreignId], criteria: allCriteria },
  });
  check(
    "every documented comparison criterion is accepted",
    broad.status === 200 && broad.body?.data?.criteria?.length === 7,
    `status=${broad.status} criteria=${JSON.stringify(broad.body?.data?.criteria)}`,
  );
  check(
    "comparison rows carry review counts",
    broad.body?.data?.organizations?.every((row) => typeof row.review_count === "number"),
    JSON.stringify(broad.body?.data?.organizations?.map((row) => row.review_count)),
  );
  check(
    "comparison rows carry an AI sentiment index or nothing to score",
    broad.body?.data?.organizations?.every(
      (row) =>
        row.sentiment_score === null ||
        (typeof row.sentiment_score === "number" &&
          row.sentiment_score >= 0 &&
          row.sentiment_score <= 1),
    ),
    JSON.stringify(broad.body?.data?.organizations?.map((row) => row.sentiment_score)),
  );
  check(
    "comparison rows carry verification status",
    broad.body?.data?.organizations?.every(
      (row) => typeof row.verification_status === "string",
    ),
    JSON.stringify(
      broad.body?.data?.organizations?.map((row) => row.verification_status),
    ),
  );

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
  // The default page holds 20 rows newest-first, and these two actions land
  // earlier in the run than the ones above, so the whole log is read back.
  const allLogs = await call("GET", "/admin/audit-logs/?page_size=100", {
    token: adminToken,
  });
  check(
    "editing and deleting a review were audited",
    ["review.updated", "review.deleted"].every((action) =>
      allLogs.body?.data?.some((row) => row.action === action),
    ),
    JSON.stringify(allLogs.body?.data?.map((row) => row.action)),
  );
  check(
    "audit rows carry every column the export writes",
    logs.body?.data?.every(
      (row) =>
        typeof row.timestamp === "string" &&
        typeof row.action === "string" &&
        typeof row.resource_id === "string" &&
        (typeof row.user_name === "string" || typeof row.user_id === "string"),
    ),
    JSON.stringify(logs.body?.data?.[0]),
  );

  // The CSV export walks every page rather than the one the table shows; a
  // page parameter that was ignored would repeat row one for the whole file.
  const auditPageTwo = await call("GET", "/admin/audit-logs/?page_size=3&page=2", {
    token: adminToken,
  });
  check(
    "audit logs page for the export walk",
    auditPageTwo.status === 200 && auditPageTwo.body?.data?.length <= 3,
    `status=${auditPageTwo.status} rows=${auditPageTwo.body?.data?.length}`,
  );
  check(
    "the reported total is stable across pages",
    auditPageTwo.body?.pagination?.count === logs.body?.pagination?.count,
    `${auditPageTwo.body?.pagination?.count} vs ${logs.body?.pagination?.count}`,
  );
  check(
    "the second audit page is not the first repeated",
    (auditPageTwo.body?.pagination?.count ?? 0) > 3 &&
      JSON.stringify(auditPageTwo.body?.data?.[0]) !==
        JSON.stringify(logs.body?.data?.[0]),
    JSON.stringify(auditPageTwo.body?.data?.[0]),
  );

  section("Homepage settings");
  const settingsGet = await call("GET", "/settings/homepage/");
  check(
    "GET /settings/homepage/ is public and lists the sections",
    settingsGet.status === 200 && settingsGet.body?.data?.sections?.hero === true,
    `status=${settingsGet.status} body=${JSON.stringify(settingsGet.body)}`,
  );
  const heroVisibleBefore = settingsGet.body?.data?.sections?.hero === true;

  const nonAdminPut = await call("PUT", "/settings/homepage/", {
    token: customerToken,
    body: { sections: { hero: false } },
  });
  check(
    "a non-admin cannot change homepage settings",
    nonAdminPut.status === 403,
    `status=${nonAdminPut.status} body=${JSON.stringify(nonAdminPut.body)}`,
  );

  const toggle = await call("PUT", "/settings/homepage/", {
    token: superAdminToken,
    body: { sections: { hero: false } },
  });
  check(
    "a Super Admin can switch a section off",
    toggle.status === 200 && toggle.body?.data?.sections?.hero === false,
    `status=${toggle.status} body=${JSON.stringify(toggle.body)}`,
  );

  const afterToggle = await call("GET", "/settings/homepage/");
  check(
    "the public read reflects the saved toggle",
    afterToggle.status === 200 && afterToggle.body?.data?.sections?.hero === false,
    `status=${afterToggle.status} body=${JSON.stringify(afterToggle.body)}`,
  );

  const restore = await call("PUT", "/settings/homepage/", {
    token: superAdminToken,
    body: { sections: { hero: heroVisibleBefore } },
  });
  check(
    "the section is restored afterwards",
    restore.status === 200 && restore.body?.data?.sections?.hero === heroVisibleBefore,
    `status=${restore.status}`,
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
