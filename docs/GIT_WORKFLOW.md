# Git Workflow & Pull Request Protocols

This document defines the branching strategy, branch naming conventions, and code review checklists for the project to ensure maximum stability and continuous delivery.

---

## 1. Branch Strategy: Trunk-Based Development with Short-Lived Feature Branches

The platform implements **Trunk-Based Development** to avoid long-lived branch synchronization nightmares.

- **Main Branch (`main`)**: The production-ready trunk. Every change committed here must compile and pass all automated tests.
- **Short-Lived Branches**: Developers branch from `main`, implement a single atomic change, and merge back to `main` within 24–48 hours.

---

## 2. Branch Naming Conventions

Branches must correspond to specific tasks or issue tickets.

| Type            | Syntax                               | Example                         |
| :-------------- | :----------------------------------- | :------------------------------ |
| **Features**    | `feature/sip-<ticket-number>-<slug>` | `feature/sip-104-org-search`    |
| **Bug Fixes**   | `bugfix/sip-<ticket-number>-<slug>`  | `bugfix/sip-205-celery-timeout` |
| **Hotfixes**    | `hotfix/sip-<ticket-number>-<slug>`  | `hotfix/sip-911-cors-leak`      |
| **Chore / Ops** | `chore/sip-<ticket-number>-<slug>`   | `chore/sip-502-node-upgrade`    |

---

## 3. Pull Request (PR) Checklist

Before submitting a PR, the author must ensure:

1. **Compilation**: The local build completes successfully without errors (`npm run build` or `python manage.py check`).
2. **Type-Checking**: No compilation errors on both Next.js (`npm run lint` / `tsc`) and Django static typing checks.
3. **Migrate Readiness**: Schema migrations are cleanly generated and can be applied backwards/forwards without data loss.
4. **Decoupling Constraints**: No models are imported directly across modular boundaries.
5. **N+1 Verification**: Query logging is inspected to confirm all endpoints pre-fetch nested data cleanly.
