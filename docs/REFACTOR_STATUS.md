# Refactor status

This branch contains the staged modular architecture for PocketTrack. It is intentionally not yet the default runtime.

## Foundations in place
- Modular Express application factory and server entrypoint
- Configuration validation and database initialization
- Auth, transactions, categories, and dashboard modules
- SQL repository boundaries and transaction domain service
- Shared API client, observable state store, and formatting helpers
- Architecture, API, development, and error-handling documentation
- Focused transaction-service unit tests

## Verification and remaining migration
- Run `npm test` and `npm run check` in a Node 20+ environment with dependencies installed.
- Exercise the modular server against the current SQLite schema and the browser UI.
- Complete migration of the legacy frontend to the modular API client/state store.
- Resolve any integration issues found, then switch the default entrypoint in a separately reviewed change.
- Only remove legacy runtime code after parity tests and backup/restore checks pass.

## Safety principle
Do not make the modular entrypoint the default or remove the legacy server until the compatibility and integration tests pass.
