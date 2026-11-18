undefined

## Auditability

- [x] Add append-only, user-scoped audit events for transaction creation/update/deletion, imports, budget changes, and recurring-rule execution.
- [x] Expose a bounded account-scoped audit feed and show recent events in the dashboard.

Audit metadata intentionally avoids storing passwords, session tokens, or full transaction descriptions. The audit feed is an application activity record, not a tamper-proof external ledger.
