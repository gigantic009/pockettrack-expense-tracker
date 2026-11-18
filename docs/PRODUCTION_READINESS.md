# Production-readiness upgrade plan

This document distinguishes the current implementation from planned work. Items under "Implemented today" are already present in the application; the remaining items are targets, not shipped features.

## Current baseline

PocketTrack is an Express application using SQLite, per-user transaction/category ownership, bcrypt password hashes, HS256 JWTs in HttpOnly/SameSite cookies, rate-limited registration/login, a same-origin guard for state-changing API calls, Helmet/CSP, backup tooling, and Node test coverage.

## Upgrade sequence

### P0 — Account and data safety

- [x] Add server-side session records with revocation; login creates a fresh session and logout revokes it. Password-change rotation remains pending.
- [ ] Add account recovery with single-use, hashed, expiring tokens. Do not reveal whether an email address is registered.
- [ ] Add password-change flow that revokes every other session.
- [ ] Redact credentials, cookies, tokens, and financial payloads from logs.
- [ ] Add explicit production configuration checks for HTTPS, trusted proxy settings, cookie security, and a strong signing key.
- [ ] Add retention and account/data export/deletion documentation.

Acceptance: tests prove revoked sessions fail, users cannot read or mutate another user's records, recovery tokens are single-use, and secrets never appear in logs.

### P1 — Finance workflows

- [x] CSV export for the signed-in user's transactions only.
- [x] CSV import with documented headers, strict date/type/amount/category validation, duplicate handling, preview, and transaction-wrapped commit.
- [x] Protect spreadsheet exports from formula injection by escaping cells beginning with `=`, `+`, `-`, or `@`.
- [x] Recurring transaction rules with weekly/monthly frequency, start/end dates, next-run tracking, unique scheduled occurrences, and an explicit user-triggered run action.
- [x] Monthly budgets by user-owned expense category, with actual-vs-budget summaries and positive amount validation.

Acceptance: import/export round-trips supported records; malformed rows are reported without partial writes; recurring jobs cannot create duplicates; every query is scoped by authenticated user ID.

### P2 — Database and deployment

- [ ] Introduce a database adapter boundary so route handlers do not depend directly on SQLite-specific APIs.
- [ ] Add PostgreSQL as a production adapter with migrations and parameterized queries. Keep SQLite for local development and tests.
- [ ] Add migration tests against both supported database engines.
- [ ] Add browser end-to-end tests for registration, login, transaction CRUD, import/export, budgets, and logout.
- [ ] Add deployment documentation for managed PostgreSQL, backups, restore drills, HTTPS, environment variables, health checks, and monitoring.

Acceptance: the same API contract passes integration tests on SQLite and PostgreSQL; restore is tested from a real backup; browser flows pass in CI.

## API contract proposal

- `GET /api/transactions/export.csv` — authenticated CSV download.
- `POST /api/transactions/import/preview` — validate and preview rows without writes.
- `POST /api/transactions/import` — commit a validated import atomically.
- `GET|POST|PATCH|DELETE /api/budgets` — user-owned category budgets.
- `GET|POST|PATCH|DELETE /api/recurring-rules` — user-owned recurring rules.

All endpoints must use the existing authentication middleware and scope every database read/write by `req.user.id`. Import endpoints must enforce a small upload/body limit and a maximum row count.

## Testing matrix

- Authentication: missing, expired, revoked, and valid sessions.
- Isolation: user A cannot list, export, import into, edit, or delete user B's data.
- CSV: quoted commas, quotes, Unicode, line breaks, malformed headers, invalid dates, invalid amounts, duplicate rows, oversized input, formula injection.
- Recurrence: month-end dates, leap years, end dates, retry after failure, idempotent execution.
- Budgets: category ownership, duplicate month/category, zero/negative limits, month boundaries.
- Database: migrations, foreign keys, transaction rollback, SQLite/PostgreSQL parity.
- Browser: keyboard navigation, form errors, empty states, and responsive layouts.

## Delivery rule

Do not mark a checkbox complete until the implementation, automated tests, and documentation are merged. This file is a plan, not evidence that the listed endpoints or features already exist.


## Reference products and design decisions

- [Actual Budget](https://github.com/actualbudget/actual): borrow the importance of a clear monthly budget workflow, imports, and predictable user control.
- [Firefly III](https://github.com/firefly-iii/firefly-iii): borrow the breadth of financial reports, recurring rules, categories, and API-first workflows.
- [GODMAN](https://github.com/gigantic009/GODMAN): apply the same engineering posture—explicitly scoped operations, no silent background actions for consequential changes, strong validation, and auditability. This is a design reference, not copied code.

## Current implementation boundary

The branch now implements server-side session revocation, session listing/revocation, CSV import preview/commit/export, formula-safe export, monthly category budgets, and explicit-run recurring rules. PostgreSQL support, account recovery, transaction-level audit history, browser E2E tests, and production deployment remain unimplemented. The recurring scheduler is intentionally user-triggered; it does not run unattended.
