# PocketTrack Architecture

## Architectural direction
PocketTrack is transitioning from a monolithic Express server and frontend script to a modular, layered application. The migration is incremental: existing behavior and tests must remain the compatibility baseline.

## Backend layers
- **Routes:** endpoint mapping and middleware composition only.
- **Controllers:** HTTP input/output and status codes.
- **Services:** domain rules and orchestration.
- **Repositories:** SQL access and persistence.
- **Middleware:** authentication, request validation, security and centralized errors.
- **Config:** validated environment configuration.

## Suggested module boundaries
- auth: registration, login, logout, session identity
- transactions: CRUD, ownership, balance rules and date validation
- categories: category listing and future management
- dashboard: aggregates, savings rate and category summaries

## Frontend boundaries
- api: HTTP transport and response/error normalization
- state: shared application state
- components: reusable presentation helpers
- features: authentication, transactions, dashboard and filters
- utils: escaping, dates, currency and formatting

## Migration safeguards
1. Refactor on a dedicated branch.
2. Preserve endpoint behavior during extraction.
3. Keep SQL parameterized and user-scoped.
4. Run syntax checks and tests after each migration slice.
5. Avoid deleting code until replacement paths are tested.
6. Keep production secrets out of the repository.
