# PocketTrack production-readiness roadmap

PocketTrack is a student portfolio application. This checklist distinguishes completed application features from work that would be needed before handling real financial data at scale.

## Completed in this branch

- [x] Account-scoped append-only application audit events for transaction creation, update, deletion, CSV imports, budget changes, and recurring-rule execution.
- [x] Bounded, account-scoped audit feed and dashboard activity display.
- [x] Database-backed session revocation for current session, individual sessions, and all sessions.
- [x] CSV preview/validation and formula-safe export.
- [x] Explicitly user-triggered recurring rules with duplicate occurrence protection.

## Remaining before any public deployment

- [ ] Account recovery and password-change workflow.
- [ ] HTTPS and secure production configuration.
- [ ] Off-site backup strategy and tested restoration procedure.
- [ ] Monitoring, rate-limit review, and operational alerting.
- [ ] Independent security and accessibility review.
- [ ] Browser-based end-to-end testing.
- [ ] Database migration strategy and PostgreSQL support if multi-instance deployment is needed.

Audit metadata intentionally avoids storing passwords, session tokens, or full transaction descriptions. The audit feed is an application activity record, not a tamper-proof external ledger. This project does not claim to be an audited financial product.
