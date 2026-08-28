# Project Structure Specification

**Document Version:** 1.0.0

**Architectural Pattern:** Modular Monolith with Vertical Slicing & Clean Architecture Principles

**Target Architecture:** Distributed-Ready Mono-repository Layout

---

## 1. Overview & Architectural Philosophy

The **AI-Powered Service Intelligence Platform** repository is structured to balance early-stage development velocity with long-term enterprise scalability. The workspace follows a **Distributed-Ready Modular Monolith** approach:

- **Vertical Slicing (Feature Folders):** Code is co-located by business capability (domain features) rather than technical layer (models/views/controllers).
- **Strict Module Isolation:** Domain modules expose explicit public interfaces to minimize direct coupling, laying the groundwork for seamless future microservice extraction.
- **Separation of Concerns:** Core application layers (Frontend, Backend) operate independently with clean contract boundaries, supported by dedicated workspaces for future AI pipelines, data ingestion, and mobile apps.

---

## 2. Complete Repository Tree

```text
service-intelligence-platform/
├── .github/                         # CI/CD Workflows & Repository Templates
│   ├── workflows/
│   │   ├── ci-backend.yml
│   │   └── ci-frontend.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/                            # Authoritative Project Specifications & Standards
│   ├── 01_Project_Vision.md
│   ├── 02_Product_Requirements.md
│   ├── 03_Software_Architecture.md
│   ├── 04_Database_Design.md
│   ├── 05_API_Design.md
│   ├── 06_Coding_Standards.md
│   ├── 07_Project_Structure.md
│   ├── 08_Development_Roadmap.md
│   ├── 09_Sprint_Plan.md
│   ├── 10_AI_Roadmap.md
│   ├── 11_Deployment.md
│   ├── 12_Testing_Strategy.md
│   ├── architecture/
│   │   ├── system-design.md
│   │   └── modular-monolith-guidelines.md
│   └── workflows/
│       └── git-workflow.md
├── infrastructure/                  # Environment Infrastructure & Orchestration Configs
│   ├── docker/
│   │   ├── dev/
│   │   │   ├── backend.Dockerfile
│   │   │   └── frontend.Dockerfile
│   │   └── prod/
│   │       ├── backend.Dockerfile
│   │       └── frontend.Dockerfile
│   ├── postgres/
│   │   └── init.sql
│   ├── redis/
│   │   └── redis.conf
│   └── nginx/
│       └── dev.conf
├── tests/                           # E2E (Playwright), Integration, and Load Testing (k6/Locust)
├── scripts/                         # Operational Scripts & Local Setup Automation
│   ├── dev-setup.sh
│   └── health-check.sh
├── frontend/                        # Next.js 14+ App Router Workspace
├── backend/                         # Django REST Framework Workspace
├── ai-engine/                       # Reserved for future AI microservice (LLM/RAG/Embeddings)
├── data-pipeline/                  # Reserved for ETL & Vector Batch Processing Jobs
├── mobile/                          # Reserved for Cross-Platform App (React Native/Flutter)
├── docker-compose.yml               # Base Multi-Container Orchestration
├── docker-compose.override.yml      # Local Development Overrides
├── .env.example                     # Environment Variable Specification Template
├── .gitignore                       # Global Git Exclusion Rules
├── LICENSE                          # Platform Licensing Terms
└── README.md                        # Primary Engineering Onboarding & Overview

```

---

## 3. Top-Level Directory Roles

| Directory             | Primary Purpose                              | Architectural Justification                                                                                                                  |
| --------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **`.github/`**        | CI/CD automation and contribution guidelines | Decouples automation pipelines from application logic. Enables conditional CI execution based on modified paths (`frontend/` vs `backend/`). |
| **`docs/`**           | Central documentation repository             | Establishes a "docs-as-code" standard. Contains ordered specs (`01_` through `12_`) and architectural guidelines co-located with code.       |
| **`infrastructure/`** | Runtime environment definitions              | Isolates deployment scripts, Nginx proxy configs, custom Redis settings, and Docker environments (`dev/` vs `prod/`) from app code.          |
| **`tests/`**          | Global test suites                           | Serves as the designated container for cross-service end-to-end (E2E) UI testing, integration suites, and performance load tests.            |
| **`scripts/`**        | Developer productivity tools                 | Standardizes local environment bootstrap commands (`dev-setup.sh`) and health probes.                                                        |
| **`frontend/`**       | Client interface workspace                   | Contains the web client built on Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query, and Zustand.                                |
| **`backend/`**        | Core business API workspace                  | Implements domain models, data workflows, and API endpoints using Django, DRF, Celery, and PostgreSQL.                                       |
| **`ai-engine/`**      | Future AI Microservice stub                  | Isolated namespace for vector embeddings, LLM orchestration, and RAG pipelines requiring specialized Python runtimes/GPUs.                   |
| **`data-pipeline/`**  | Future ETL & Analytics stub                  | Reserved workspace for background data streaming, batch aggregations, and data sync operations.                                              |
| **`mobile/`**         | Future Mobile client stub                    | Dedicated namespace for mobile clients (React Native/Flutter) sharing domain types with the main platform.                                   |

---

## 4. Backend Structure (Django Vertical Slicing)

The Django backend discards traditional horizontal layer splits in favor of **Vertical Feature Slices** (inspired by the HackSoft style guide and DDD bounded contexts).

```text
backend/
├── config/                  # Framework & Project Initialization Settings
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py          # Shared base configuration
│   │   ├── local.py         # Local development settings
│   │   └── production.py    # Hardened production settings
│   ├── __init__.py
│   ├── asgi.py              # Asynchronous web interface entry point
│   ├── cel.py               # Celery task queue instantiation
│   ├── urls.py              # Root URL router mapping
│   └── wsgi.py              # Synchronous web interface entry point
├── core/                    # Cross-Cutting Technical Infrastructure
│   ├── __init__.py
│   ├── base_models.py       # Reusable Model Mixins (UUID, TimeStampedModel)
│   ├── exceptions.py        # Global exception handling & standard error format
│   ├── pagination.py        # Standardized API response pagination
│   └── permissions.py      # Base security & custom permission classes
├── features/                # Vertical Slices (Bounded Contexts)
│   ├── organizations/       # Bounded Context: Organization Management
│   │   ├── __init__.py
│   │   ├── apps.py          # Django AppConfig
│   │   ├── api.py           # HTTP Presentation Layer (Views & Endpoints)
│   │   ├── serializers.py   # Data Transfer Objects (DTOs) & Validation
│   │   ├── services.py      # Core Business Logic (Write/Mutation Operations)
│   │   ├── selectors.py     # Database Query Logic (Read Operations)
│   │   ├── models.py        # PostgreSQL Relational Schema
│   │   └── tests/           # Feature Unit & Integration Tests
│   ├── services_directory/  # Bounded Context: Service Directory Feature Slice
│   │   └── ...              # (Identical internal vertical structure)
│   └── reviews/             # Bounded Context: Ratings & Reviews Feature Slice
│       └── ...              # (Identical internal vertical structure)
├── requirements/            # Dependency Specifications
│   ├── base.txt             # Core platform dependencies
│   ├── local.txt            # Development tooling (linting, testing)
│   └── production.txt       # Production WSGI/security packages
├── .flake8                  # Python Linter rules
├── pyproject.toml           # Black formatter & tool configurations
└── manage.py                # Django CLI entry point

```

### Backend Layer Responsibilities

- **`services.py` (Write Operations):** Executes core business rules. Serves as pure Python logic decoupled from HTTP frameworks. Can be safely invoked by DRF views, Celery tasks, or CLI commands.
- **`selectors.py` (Read Operations):** Contains complex ORM querysets, caching logic, and data aggregation routines. Isolates read queries from HTTP handling.
- **`api.py` & `serializers.py` (HTTP Delivery):** Handles request parsing, authentication enforcement, payload validation, and HTTP response formatting. Strictly delegates business rules to `services.py` and data fetching to `selectors.py`.
- **`core/`:** Provides reusable infrastructure primitives across all domain slices without introducing coupling between features.

---

## 5. Frontend Structure (Next.js Vertical Slicing)

The Next.js 14+ frontend co-locates features within `src/features/` while maintaining a clean, thin App Router interface under `src/app/`.

```text
frontend/
├── public/                  # Static Assets (Images, SVGs, Fonts)
│   └── assets/
├── src/
│   ├── app/                 # Next.js App Router (Routing & Layouts ONLY)
│   │   ├── (auth)/          # Authentication Route Group
│   │   ├── (dashboard)/     # Authenticated Workspace Layouts & Pages
│   │   │   ├── organizations/
│   │   │   │   └── page.tsx # Thin Server Component exporting Feature UI
│   │   │   └── layout.tsx
│   │   ├── api/             # Frontend Backend-For-Frontend (BFF) Endpoints
│   │   ├── layout.tsx       # Root Page Layout
│   │   ├── page.tsx         # Platform Landing Page
│   │   └── providers.tsx    # Global Context Wrappers (React Query, Zustand)
│   ├── components/          # Shared Atomic & Layout Design System
│   │   ├── ui/              # Primitive UI Components (shadcn/ui atoms)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── input.tsx
│   │   └── shared/          # Domain-Agnostic Composites (Navbar, Sidebar)
│   │       ├── header.tsx
│   │       └── data-table.tsx
│   ├── features/            # Feature Slices (Domain UI & Business Logic)
│   │   ├── organizations/   # Domain Feature: Organizations
│   │   │   ├── api/         # React Query hooks & Fetch client interfaces
│   │   │   │   ├── use-organization.ts
│   │   │   │   └── get-organizations.ts
│   │   │   ├── components/  # Domain-specific React Components
│   │   │   │   ├── organization-card.tsx
│   │   │   │   └── organization-form.tsx
│   │   │   ├── store/       # Localized Zustand Client State Slices
│   │   │   │   └── organization-store.ts
│   │   │   ├── types/       # TypeScript DTOs & Entity Types
│   │   │   │   └── index.ts
│   │   │   └── index.ts     # Feature Barrel File (Public API Surface)
│   │   ├── services/        # Domain Feature: Services Directory
│   │   │   └── ...
│   │   └── reviews/         # Domain Feature: Ratings & Reviews
│   │       └── ...
│   ├── config/              # Application Constants & Environment Maps
│   │   └── site-config.ts
│   ├── lib/                 # Global Network & Utility Wrappers
│   │   ├── api-client.ts    # Axios/Fetch Instance with Interceptors
│   │   └── utils.ts         # Class Name Converters (clsx, tailwind-merge)
│   └── types/               # Cross-Domain Platform Types
├── .eslintrc.json           # Code Style Rules
├── .prettierrc              # Formatter Configuration
├── components.json          # shadcn/ui Design Tokens Config
├── next.config.mjs          # Next.js Configuration
├── package.json             # NPM Dependencies & Build Scripts
├── postcss.config.mjs       # CSS Processor Settings
├── tailwind.config.ts       # Tailwind CSS Theme System
└── tsconfig.json            # TypeScript Compiler Configuration

```

### Frontend Architectural Rules

1. **`src/app/` as Thin Controllers:** Files in `src/app/` manage routing, page metadata, layouts, and server-side boundaries. They import and render domain features from `src/features/`.
2. **Feature Encapsulation (`src/features/*/index.ts`):** Features expose their public interface strictly through `index.ts`. External components must not directly deep-import unexported internal feature modules.
3. **State Separation:**

- **Server State:** Managed via **React Query** inside `features/*/api/` for fetching, caching, and background synchronizations.
- **Client UI State:** Managed via **Zustand** inside `features/*/store/` for ephemeral UI interactions (drawers, multi-step forms, filter toggles).

4. **Design System Boundaries:** `components/ui/` contains primitive, domain-agnostic atoms (`shadcn/ui`). Business concepts are forbidden inside `components/ui/`.

---

## 6. Summary of Structural Constraints

- **No Circular Dependencies:** Domains can only import shared abstractions (`core/` in backend, `components/ui/` or `lib/` in frontend) or explicitly exposed public interfaces of sibling domains.
- **Extraction Ready:** Every folder inside `backend/features/<domain>/` or `frontend/src/features/<domain>/` contains its complete domain context, allowing straightforward extraction into a standalone microservice or standalone front-end application as the platform scales.
