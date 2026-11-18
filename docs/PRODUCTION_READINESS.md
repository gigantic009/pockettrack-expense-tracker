# Production-readiness upgrade plan

This document distinguishes the current implementation from planned work. Items under "Implemented today" are already present in the application; the remaining items are targets, not shipped features.

## Current baseline

PocketTrack is an Express application using SQLite, per-user transaction/category ownership, bcrypt password hashes, HS256 JWTs in HttpOnly/SameSite cookies, rate-limited registration/login, a same-origin guard for state-changing API calls, Helmet/CSP, backup tooling, and Node test coverage.

## Upgrade sequence

### P0 — Account and data safety

- [ ] Add server-side session records with revocation; rotate session identifiers on login and password changes.
- [ ] Add account recovery with single-use, hashed, expiring tokens. Do not reveal whether an email address is registered.
- [ ] Add password-change flow that revokes every other session.
- [ ] Redact credentials, cookies, tokens, and financial payloads from logs.
- [ ] Add explicit production configuration checks for HTTPS, trusted proxy settings, cookie security, and a strong signing key.
- [ ] Add retention and account/data export/deletion documentation.

Acceptance: tests prove revoked sessions fail, users cannot read or mutate another user's records, recovery tokens are single-use, and secrets never appear in logs.

### P1 — Finance workflows

- [ ] CSV export for the signed-in user's transactions only.
- [ ] CSV import with a documented header format, strict date/type/amount validation, duplicate handling, a preview/dry-run, and all-or-nothing database transaction semantics.
- [ ] Protect spreadsheet exports from formula injection by escaping cells beginning with `=`, `+`, `-`, or `@`.
- [ ] Recurring transaction rules with frequency, start/end dates, next-run tracking, idempotency keys, and a visible review/confirmation step before creating transactions.
- [ ] Monthly budgets by user-owned category, with actual-vs-budget summaries and validation against negative/invalid limits.

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
