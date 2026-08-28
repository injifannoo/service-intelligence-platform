# Contributing to Service Intelligence Platform

Thank you for contributing! This document provides guidelines, setup instructions, and quality standards to ensure a smooth, collaborative development process.


## 1. Quick Start & Local Setup

### Prerequisites

- **Git**
- **Docker Desktop** (running)
- **Node.js 18+** & **Python 3.11+** (for local IDE autocompletion/linting)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/injifannoo/service-intelligence-platform.git
   cd service-intelligence-platform
   ```


2. **Set up environment variables:**

```bash
cp .env.example .env

```

3. **Start the multi-container stack:**

```bash
docker compose up --build -d

```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/api/docs/

4. **Run database migrations:**

```bash
docker compose exec backend python manage.py migrate

```

5. **Verify services:**

```bash
docker compose ps

```



## 2. Git Workflow & Branching Guidelines

We follow a feature-branch workflow. All development work must be performed on dedicated branches created from `main`.

### Branch Naming Conventions

- `feature/<feature-description>` – New capabilities or user-facing functionality (e.g., `feature/review-summarization`)
- `bugfix/<issue-description>` – Bug fixes (e.g., `bugfix/jwt-expiration-handling`)
- `chore/<task-description>` – Maintenance, tooling, or docs (e.g., `chore/update-dependencies`)
- `refactor/<scope>` – Code restructuring without changing behavior

### Commit Message Standards

Follow Conventional Commits format:

```text
<type>(<scope>): <short summary in present tense>

[optional body]

```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Example:** `feat(reviews): add asynchronous Celery task for review summarization`

### Pull Request (PR) Requirements

1. **Branch Synchronization:** Ensure your branch is rebased on `main` before opening a PR:

```bash
git fetch origin
git rebase origin/main

```

2. **PR Checks:** All automated CI checks (linting, static typing, unit tests) must pass.
3. **Review:** At least one code review approval is required prior to merging into `main`.


## 3. Code Quality Standards

### Repository Architecture

We use a **HackSoft-style Vertical Feature Slicing** pattern. Feature code lives under modular domain directories (`features/`), separating domain services, selectors, and API endpoints.

### Backend Standards (Django & Python)

- **Code Style & Formatting:** We use `ruff` for linting and formatting.

```bash
docker compose exec backend ruff check .
docker compose exec backend ruff format . --check

```

- **Static Type Safety:** We enforce strict type hinting checked via `mypy`.

```bash
docker compose exec backend mypy --strict .

```

- **Business Logic Separation:** Keep models light. Place write mutations in `services.py` and read queries in `selectors.py`.
- **Tenant Security:** Always enforce explicit `organization_id` filters on database selectors.

### Frontend Standards (Next.js, TypeScript & Tailwind)

- **Code Style & Formatting:** Enforced via `eslint` and `prettier`.

```bash
docker compose exec frontend npm run lint
docker compose exec frontend npm run format:check

```

- **Type Safety:** No implicit or explicit `any` types. Run `tsc` before committing:

```bash
docker compose exec frontend npx tsc --noEmit

```



## 4. Testing Guidelines

Automated tests must accompany any functional changes.

### Running Backend Tests

```bash
docker compose exec backend pytest

```

### Running Frontend Tests

```bash
docker compose exec frontend npm run test

```

### Coverage Goals

- **Services & Core Business Logic:** 85%+ coverage
- **Database Selectors & API Controllers:** 80%+ coverage



## 5. Getting Help

Refer to the specification documents in the `docs/` directory for system architecture (`03_Software_Architecture.md`), database schemas (`04_Database_Design.md`), and API design guidelines (`05_API_Design.md`).




