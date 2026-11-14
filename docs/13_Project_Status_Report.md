# ASIP — Delivery Status & Gap Report

**Date:** 11 November 2026  
**Repository:** `service-intelligence-platform`  
**Branch:** `feature/service` @ `d5f490c` (Sprint 4 commit `b99013e` is merged into history)  
**Reference product:** <https://intelligent-service.lovable.app>  
**Method:** repository inspection, route/API inventory, migration check, backend suite, frontend suite, typecheck and lint.

> This report describes the code that actually exists. The reference site was reviewed as a public product page only; no Lovable source code was available.

---

## 1. Executive Summary

The platform is **feature-rich and demo-ready**, and Sprint 4 (Service Management) is **complete and verified**. Every major product vertical — authentication, organizations, services, search, reviews, comparison, analytics, verification, admin — has working code in the repository.

The important qualification is that the frontend currently runs against the **in-repo dev BFF** (`NEXT_PUBLIC_USE_DEV_BACKEND=true`), not the Django API. The Django backend is solid for the core slices but does **not yet implement the admin, AI-processing, settings, industries, structured-search or review-report endpoints** that the frontend already consumes. In other words:

- **UI/product coverage: ~90% of the MVP vision.**
- **Django backend parity: ~65–70%.**
- **Production readiness: not yet — the app is demo-ready in BFF mode, not launch-ready against the real API.**

Sprint 4 itself is not the gap. The remaining work is primarily **backend parity, real async AI processing, true vector search, and production hardening**.

### Headline numbers

| Measure | Result |
|---|---|
| Backend test suite | **52 passed** |
| Frontend test suite | **287 passed** (26 files) |
| Frontend typecheck | **Passing** |
| Backend migrations | **No changes detected** |
| Frontend lint | **2 errors, 8 warnings** (pre-existing, unrelated to Sprint 4) |
| Django feature slices | **9** (`users`, `organizations`, `services`, `search`, `reviews`, `bookings`, `notifications`, `comparison`, `analytics`) |
| Frontend feature modules | **9** |
| Dev BFF route handlers | **34** |
| AI engine capabilities | Embeddings, recommendations, sentiment, summarization |

---

## 2. Sprint Scorecard

| Sprint | Goal | Status | Evidence | What remains |
|---|---|---|---|---|
| **0 — Foundation** | Monorepo, Django/Next scaffolding, Docker, PostgreSQL, Redis, Celery baseline | ✅ Done | `backend/`, `frontend/`, `ai-engine/`, `infrastructure/`, `docker-compose*.yml`, CI workflows | Production verification |
| **1 — Setup** | Vertical-slice layout, base models, response envelope, API client | ✅ Done | `core/base_models.py`, `core/` renderers/pagination, `frontend/src/lib/api-client.ts` | — |
| **2 — Authentication** | User model, register/login/refresh/logout, JWT, roles, profile | ✅ Done | `features/users/`, auth pages, profile page, 24 auth/profile tests | — |
| **3 — Organizations** | Organization model/API, verification status, onboarding, dashboard | ✅ Done | `features/organizations/`, onboarding + detail + dashboard; 6 tests | Admin approval API (see P0) |
| **4 — Services** | Service model/API, categories, add/edit/view services | ✅ **Done** | `features/services/`; 21 backend tests; `/services` workspace; 6 BFF parity tests | Minor rating annotation (P1) |
| **5 — Search** | Keyword/attribute search, vector semantic search | 🟡 Partial | Structured search API + UI; AI engine embeddings; AI search endpoint | No pgvector storage/query; no Django `GET /search/`; semantic search falls back to lexical |
| **6 — Reviews** | Review model, nested endpoints, ratings, moderation, async AI summaries | 🟡 Partial | Review CRUD, rating UI, review list/form, moderation UI; 1 backend test | Async summary/task queue is BFF-only; no global `/reviews/` or report endpoint in Django |
| **7 — Comparison** | Comparison matrix, organization analytics dashboard | 🟡 Partial | Comparison API/UI; analytics endpoint/UI; 1 + 3 backend tests | Hardcoded profile views; sentiment derived from rating; thin tests |
| **8 — MVP QA/Launch** | Full test/security/deployment pass | 🟡 Partial | Docker dev/prod, nginx, Redis, PostgreSQL, 2 CI workflows, health telemetry | Lint errors, coverage gaps, production smoke test |
| **Extras** | Bookings, notifications, verification, admin, homepage settings | 🟡 Partial | Backend bookings/notifications; frontend admin/verification; homepage settings | Bookings & notifications have no UI; admin/settings are BFF-only |

**Legend:** ✅ complete and verified · 🟡 implemented but incomplete · 🔴 not started.

---

## 3. Sprint 4 — Service Management (Completed)

Sprint 4 was the active deliverable and is now **finished end to end**.

### 3.1 Backend

**New vertical slice:** `backend/features/services/`

| Item | Implementation |
|---|---|
| `Category` model | `name` (unique), `description`; `service_categories` table |
| `Service` model | organization FK, optional category FK, name, description, price, active status, UUID + timestamps |
| Migrations | `0001_initial.py`, `0002_seed_categories.py` (8 canonical categories) |
| Permissions | Public reads; writes restricted to the parent organization's owner/manager or platform admin |
| Endpoints | `GET/POST /api/v1/categories/`, `GET/POST /api/v1/services/`, `GET/PUT/PATCH/DELETE /api/v1/services/{id}/`, `GET/POST /api/v1/organizations/{id}/services/` |
| Filters | `organization_id`, `category_id`, `status`, `search`, pagination |
| Serializers | Row is decorated with `organization_name`, `category_id`, `category_name`, `organization_rating`, numeric price; detail adds verification status |
| Tests | **21 acceptance tests** covering public reads, ownership, admin override, validation, filters, nested routes, category lifecycle |

Seeded vocabulary: Cloud & Infrastructure, Consulting, Custom Development, Data & AI, Design & Brand, Marketing & Growth, Support & Maintenance, Training.

**Category design decision:** the documented Service table has no category column, so `category` is a nullable FK. A service without a category is still valid, and deleting a category does not delete its services (`SET_NULL`).

### 3.2 Frontend

| Item | Implementation |
|---|---|
| Page | `/services` — `ServicesWorkspace` |
| Owner mode | Manage own catalogue: add, edit, delete, filter by category/status, search |
| Non-owner mode | Browse the platform-wide catalogue with category/search filters |
| Form | One dialog for create and edit; name, category, description, price, active status; inline field errors |
| Cards | Category badge, inactive badge, organization link, rating, edit/remove actions |
| Filters | Shared `ServiceCatalogFilters`; category dropdown backed by `/categories/` |
| Navigation | “Services” added to `DASHBOARD_NAV` |
| Organization profile | Reuses `ServiceList` scoped with `filters={{ organization_id }}` |
| Types | `Category`, extended `Service`, `ServiceInput`, `ServiceFilters` |
| BFF parity | Categories seed/store/route, service filters, decoration, create/update/delete, nested route parity, 6 new tests |

### 3.3 Contract & compatibility

- Both API modes remain supported:
  - `NEXT_PUBLIC_USE_DEV_BACKEND=true` → in-repo BFF.
  - `false` → Django at `NEXT_PUBLIC_API_URL` (`http://localhost:8000/api/v1`).
- The frontend’s optional service fields (`category_id`, `category_name`, `organization_name`, `organization_rating`, timestamps) keep older fixtures valid.
- Price is returned as a JSON number, not a DRF decimal string, so the UI renders it directly.

### 3.4 Verification

```text
Backend:    52 passed
Frontend:   287 passed (26 files)
Typecheck:  clean
Lint:       0 issues in the Sprint 4 slice
Migration:  No changes detected
```

Known Sprint 4 limitations (not blockers for the deliverable):

1. `organization_rating` is still `null` in the Django serializer; the reviews slice now exists but the service selector does not annotate the aggregate yet.
2. `/services` sits in the proxy’s protected routes, so the browse mode is for signed-in non-owners. Guests can still see services on public organization profiles.
3. `NEXT_PUBLIC_USE_DEV_BACKEND` remains `true`; the Sprint 4 endpoints themselves are ready for Django.

---

## 4. What Has Already Been Built

### 4.1 Backend (Django REST Framework)

Nine feature slices plus `core/` infrastructure:

- **Users:** register, login, logout, token refresh, profile; RBAC (`CUSTOMER`, `ORGANIZATION_OWNER`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN`).
- **Organizations:** list/create, detail, update, verification claim, industry relationship, ownership enforcement.
- **Services & categories:** full CRUD, filters, nested organization route, seeded categories.
- **Search:** AI semantic-search endpoint with AI-engine client and lexical fallback; authenticated search history.
- **Reviews:** nested organization review list/create, one review per user per organization, rating aggregation.
- **Bookings:** customer bookings, organization booking list, detail/update/delete.
- **Notifications:** list, mark one read, mark all read.
- **Comparison:** side-by-side matrix with rating, price, verification and a sentiment index.
- **Analytics:** owner-scoped dashboard with reviews, ratings, bookings and conversion metrics.
- **Core:** UUID/timestamp base model, standard response envelope, pagination, exception handling, health telemetry (DB + external services).

### 4.2 Frontend (Next.js App Router)

**Public routes:** marketing homepage, login, register, business registration, organizations directory, organization detail, search, comparison, privacy, terms, upgrade.

**Authenticated routes:** profile, business onboarding, services, verification, organization analytics, admin workspace (dashboard, users, organizations, verification, moderation, audit logs, homepage settings).

**Feature modules:** authentication, organizations, services, search, reviews, comparison, verification, admin, AI recommendations, shared UI.

**Notable UI work:**

- Marketing homepage with configurable sections (hero, how it works, metrics, categories, featured providers, for-businesses, trust, CTA).
- Hero natural-language search and category grid with “live” vs “coming soon” states.
- AI search and recommendation panels with submit-driven model calls.
- Comparison tray, floating bar and matrix.
- Review submission, star ratings, moderation/reporting.
- Verification claim form, admin queue and audit-log table.
- Business analytics dashboard with CSV export.
- Responsive design system built on Tailwind + shadcn-style primitives.

### 4.3 AI Engine (FastAPI)

- **Embeddings** service and router.
- **Recommendations** service, schemas and prompt.
- **Sentiment** service, schemas and prompt.
- **Summarization** service, schemas and prompt.
- Gemini integration, prompt loader, logging, health endpoint, exception handling.
- Test modules for embeddings, recommendations, sentiment, summarization, Gemini, prompts and health.

### 4.4 Infrastructure & DevOps

- Multi-container development stack: PostgreSQL (`pgvector/pgvector:pg16`), Redis, Django, Celery worker, Next.js, AI engine.
- Separate production compose and production Dockerfiles.
- Nginx dev config, PostgreSQL init scripts, Redis config.
- GitHub Actions for backend and frontend CI.
- Health endpoint with database connectivity and external-service telemetry.
- Recent deployment hardening: production entrypoint, static assets, compose config.

---

## 5. Gap Analysis vs the Reference Product

The reference site sells five ideas: natural-language discovery, evidence-based evaluation, AI improvement advice, industry-by-industry rollout, and verified trust signals.

| Reference capability | Current state | Verdict |
|---|---|---|
| Natural-language search | UI + `/search/ai/` endpoint + AI engine embeddings | 🟡 Works, but ranking is lexical fallback; no vector similarity |
| AI insight card (“Lucy Cloud Systems”) | Review-summary card + AI engine summarization | 🟡 UI exists; async backend pipeline is BFF-only |
| Trust score / sentiment | Comparison and analytics derive a score from `rating × 20` | 🟡 Not a real sentiment model output |
| Verified reviews | Verification workflow exists; reviews are not linked to verification | 🟡 Partial |
| “Discover → Evaluate → Improve” narrative | Homepage “how it works” + business analytics | ✅ Present |
| Industry rollout (“Software live, others coming soon”) | Category grid marks non-live industries “Coming soon”; only Software/IT is seeded | ✅/🟡 Presentation done, data model not gated per industry |
| Compare providers | Comparison API + matrix UI | ✅ Done |
| For-organizations dashboard | Onboarding, services, analytics, verification | 🟡 Done, but profile views are hardcoded |
| Public search and compare | `/search` and `/comparison` are public (proxy allows guests) | ✅ Done |
| Payments / premium tiers | Static upgrade page and comparison limit modal | 🔴 No payment or subscription integration |

---

## 6. What Is Left

### P0 — Required before pointing the frontend at Django

These are launch blockers because the frontend already calls these routes; with `NEXT_PUBLIC_USE_DEV_BACKEND=false` they return 404.

#### 6.1 Admin API slice

Missing Django endpoints currently implemented only in `frontend/src/app/api/v1/admin/`:

| Endpoint | Used by |
|---|---|
| `GET /api/v1/admin/stats/` | Admin dashboard |
| `GET /api/v1/admin/users/`, `PATCH /api/v1/admin/users/{id}/` | Admin users |
| `GET /api/v1/admin/verifications/`, `POST /api/v1/admin/verifications/{id}/` | Verification queue |
| `GET /api/v1/admin/reports/`, `PATCH /api/v1/admin/reports/{id}/` | Moderation queue |
| `GET /api/v1/admin/audit-logs/` | Audit-log table/export |

The backend has a verification **claim** endpoint (`POST /organizations/{id}/verify/`), but no admin decision endpoint, no moderation/report model, and no audit-log read API.

#### 6.2 AI integration endpoints

| Endpoint | Status |
|---|---|
| `POST /api/v1/ai/recommend/` | BFF only |
| `POST /api/v1/ai/sentiment/` | BFF only |
| `GET /api/v1/ai/tasks/{taskId}/` | BFF only |
| `POST /api/v1/organizations/{id}/ai/review-summary/` | BFF only |

The AI engine implements the capabilities, but Django has no adapter/route for recommendations, sentiment, task polling or review-summary orchestration.

#### 6.3 Missing documented endpoints

| Documented endpoint | Current backend |
|---|---|
| `GET /api/v1/search/` (structured search) | Absent (only `POST /search/ai/`) |
| `POST /api/v1/reviews/` (global create) | Absent (nested create exists) |
| `POST /api/v1/reviews/{id}/report/` | Absent |
| `GET /api/v1/industries/` | Absent |
| `GET/PUT /api/v1/settings/homepage/` | Absent |

#### 6.4 Real asynchronous processing

Celery is configured (`config/cel.py`, broker/result backend, `autodiscover_tasks()`), but **there are no task modules in any feature slice**. The review-summary flow is therefore synchronous/BFF-faked rather than the documented `202 Accepted → poll` pipeline.

**Work:** create shared task infrastructure, a task-status model, the review-summarization task, AI-engine HTTP client integration, retries/timeouts, and polling tests.

#### 6.5 True vector search

The current semantic-search path:

1. Calls the AI engine for embeddings.
2. **Discards the vectors.**
3. Runs an `icontains` lexical query.
4. Sets `is_semantic_match` to `bool(embeddings)`.

There is no `pgvector` Python dependency, no `VectorField`, no embedding column, no HNSW index and no cosine-similarity query. `infrastructure/postgres/init.sql` enables only `uuid-ossp` and `pg_trgm`.

**Work:** add `pgvector` dependency and extension, embedding columns on services/reviews, backfill/generation tasks, HNSW indexes, and a similarity-ranked search path with a tested lexical fallback.

#### 6.6 Analytics and trust signals

- `total_profile_views` is hardcoded to `1250` in `features/analytics/selectors.py`.
- `customer_sentiment_score` and `ai_sentiment_index` are `average_rating × 20`, not model output.
- Service rows still expose `organization_rating = null` because the services selector does not annotate review aggregates.

**Work:** profile-view event tracking, real sentiment persistence from the AI engine, rating annotation on service lists, and honest empty states when there is no data.

#### 6.7 Quality gates

- Frontend lint currently fails with **2 errors**:
  - `frontend/src/app/api/v1/users/profile/route.ts` — explicit `any`.
  - `frontend/src/features/comparison/components/comparison-builder.tsx` — `setState` synchronously inside an effect.
- 8 lint warnings (unused imports/variables) remain.
- Backend coverage is very uneven: services has 21 tests, users 24, but reviews 1, comparison 1, bookings 2, analytics 3, notifications 3.
- No React component tests exist for the services workspace/form/list.

### P1 — Product completeness

| Item | Why it matters |
|---|---|
| Bookings & inquiries UI | Backend endpoints exist; users cannot create or manage bookings in the app |
| Notifications UI | Backend endpoints exist; there is no notification centre or badge |
| Payment/subscription integration | Upgrade tiers are static; no entitlement enforcement or checkout |
| Industry rollout gates | Only Software/IT is seeded; “coming soon” is presentational, not enforced by data |
| Review reporting workflow | Frontend/BFF supports it; Django does not |
| Verification admin decisions | Claim submission works; approval/rejection is BFF-only |
| Review ↔ verification linkage | “Verified reviews” is a core trust promise but not modelled |
| Public services discoverability | `/services` is login-protected; consider a public catalogue route if guests should browse services directly |
| AI insight on provider profiles | Summary card exists but is BFF-driven and needs a real backend task |

### P2 — Technical debt & polish

- Remove dead/duplicate service modules: `aiEngine.ts`, `mockData.ts`, `provider-card.tsx`, `provider-detail-modal.tsx`, `ServiceFilters.tsx`, `ServiceSearch.tsx`, and the duplicate AI recommendation panel.
- Update `docs/05_API_Design.md` to match the real contract (admin, settings, industries, bookings, notifications, analytics).
- Update `.env.local` comments — they still say “backend slices are not implemented yet”.
- Document the port-8000 conflict noted in `.env.local` (WAMP) and the correct local run command.
- Add component tests for service create/edit/delete and filters.
- Add a production smoke test and first-deploy checklist.

---

## 7. Endpoint Parity Matrix

| Area | Django | Dev BFF | Frontend | Ready for Django? |
|---|---|---|---|---|
| Auth / profile | ✅ | ✅ | ✅ | ✅ |
| Organizations CRUD | ✅ | ✅ | ✅ | ✅ |
| Organization verification claim | ✅ | ✅ | ✅ | ✅ |
| Services / categories | ✅ | ✅ | ✅ | ✅ |
| Structured search | ❌ | ✅ | ✅ | ❌ |
| AI semantic search | 🟡 lexical fallback | ✅ | ✅ | 🟡 |
| Reviews (nested) | ✅ | ✅ | ✅ | ✅ |
| Reviews (global / report) | ❌ | ✅ | ✅ | ❌ |
| AI summary / sentiment / recommend / tasks | ❌ | ✅ | ✅ | ❌ |
| Comparison | ✅ | ✅ | ✅ | ✅ |
| Analytics dashboard | ✅ (some fake metrics) | ✅ | ✅ | 🟡 |
| Bookings | ✅ | ❌ | ❌ | Backend only |
| Notifications | ✅ | ❌ | ❌ | Backend only |
| Verification admin queue | ❌ | ✅ | ✅ | ❌ |
| Admin users / stats / reports / audit | ❌ | ✅ | ✅ | ❌ |
| Homepage settings | ❌ | ✅ | ✅ | ❌ |
| Industries | ❌ | ✅ | ✅ | ❌ |

---

## 8. Risks

1. **Dual implementation drift.** The BFF is a second backend. Every contract change must be made twice until parity is reached; the longer this lasts, the more expensive parity becomes.
2. **Async promise not delivered.** The documentation and UI promise queued AI summarization; the current flow is synchronous or simulated. Review-summary latency and reliability will not match the design.
3. **“AI-powered” claims outpace the backend.** Sentiment and trust scores are rating proxies, and semantic search is lexical. This is acceptable for a demo but must be labelled or implemented before marketing claims are made.
4. **Thin coverage on trust-critical slices.** Reviews, comparison and analytics — the features customers rely on for decisions — have the least backend test coverage.
5. **Fake analytics.** A hardcoded `1,250` profile views in an owner dashboard is a credibility risk if shown to a real business.
6. **Production unverified.** Containers and CI exist, but the production stack has not been smoke-tested end to end in this review.

---

## 9. Recommended Next Two Sprints

### Sprint A — Backend parity (P0)

1. Admin API slice: stats, users, verifications, reports, audit logs.
2. AI API slice: recommend, sentiment, task status, review summary.
3. Missing documented endpoints: structured search, global reviews/report, industries, homepage settings.
4. Shared Celery task infrastructure + review-summarization task.
5. Wire real rating annotation into service lists.
6. Replace hardcoded analytics with event-based counters (or clearly label them as demo data).
7. Fix the 2 lint errors and add backend tests for reviews/comparison/analytics.

**Exit criterion:** `NEXT_PUBLIC_USE_DEV_BACKEND=false` and the full frontend test suite passes against Django.

### Sprint B — Intelligence & launch readiness (P1)

1. `pgvector` embeddings, indexes and similarity-ranked search.
2. Real sentiment persistence and a defined trust-score formula.
3. Bookings and notifications UI.
4. Payment/subscription integration or explicit removal of paid-tier claims.
5. Industry gating and seed data for the “coming soon” industries.
6. Production smoke test, monitoring and first-release checklist.

**Rough effort:** Sprint A ≈ 3–4 weeks for one full-stack developer; Sprint B ≈ 3–4 weeks. The P2 cleanup is incremental and can run alongside.

---

## 10. Bottom Line

**Sprint 4 is finished.** Organizations can publish, list, view, edit and delete services with categories, and the frontend/backend contract is consistent. The backend suite is green (52 tests), the frontend suite is green (287 tests), typecheck passes, and the Sprint 4 slice is lint-clean.

The system as a whole is **much further along than Sprint 4** — nine backend slices, nine frontend feature modules, a working AI engine, and containerized deployment. It is **not yet a production release** because the real Django backend is missing the admin/AI/settings endpoints that the frontend already uses, async AI processing is not implemented, and vector search is a lexical fallback rather than a pgvector implementation.

The shortest credible path to launch is: **finish backend parity, make the AI pipeline real, flip the dev-backend flag, then harden and smoke-test production.**
