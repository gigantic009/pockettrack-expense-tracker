# PocketTrack security and data-integrity model

## Assets

- Account credentials and active browser sessions
- User-owned income, expense, category, budget, and recurring-rule data
- CSV exports and imported financial records
- The local SQLite database and backup files

## Trust boundaries and controls

| Boundary | Threat | Control in this branch |
|---|---|---|
| Browser to API | Cross-site cookie requests | Same-origin guard for state-changing API routes; HttpOnly/SameSite cookies |
| Session to account | Stolen or revoked session reuse | Signed JWT plus server-side session record; logout revokes the record |
| Account to records | Insecure direct object reference | User ID included in every protected data query |
| CSV import | Malformed or oversized input | 1 MB/5,000-row limits, strict required columns, validation, preview, atomic commit |
| CSV export | Spreadsheet formula injection | Dangerous leading formula characters are neutralized |
| Recurring rules | Duplicate scheduled postings | Unique rule/date occurrence constraint and explicit user-triggered execution |
| Financial mutation | Untraceable changes | User-scoped append-only application audit events |

## Product behavior

- Recurring rules never post in the background. The user explicitly runs due entries.
- A recurring expense is held when the available balance is insufficient; the due date remains pending.
- CSV import is treated as historical ledger data and does not apply the manual-entry balance check. Users must inspect the preview before committing.
- Audit events are append-only through the application API, but the SQLite owner can still modify the database directly. This is not a tamper-proof ledger.

## Residual risks

- No password reset/recovery or password-change workflow yet.
- SQLite remains the only database adapter; production multi-instance deployment needs PostgreSQL and tested migrations.
- No external key management, encrypted backup pipeline, or operational monitoring.
- No independent penetration test or browser end-to-end accessibility audit has been completed.

## GODMAN-inspired engineering principles

- Narrow, explicit permissions instead of broad implicit access
- Validate inputs at boundaries
- Keep high-impact actions user-triggered
- Preserve an audit trail for meaningful mutations
- Fail closed when session or ownership checks fail
