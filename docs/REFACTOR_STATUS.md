# Refactor Status

This is an incremental refactor branch. The original entry point remains the compatibility baseline until migration tests validate a switch.

## Extracted foundations and modules
- Environment configuration validation
- AppError and Express error handler
- Promise handler utility
- Database connection factory
- Transaction repository and domain service
- Category repository and service
- Dashboard aggregate service
- Authentication service and router
- Transaction, category and dashboard routers
- Auth middleware
- Modular application factory and separate server entrypoint
- Frontend API client, formatter and state store foundations
- Architecture, API, development and error-handling documentation

## Next required verification
- Syntax-check all files under src and public/js
- Run existing test suite against legacy entry point
- Add integration tests for modular app factory
- Resolve any behavioral differences and security regressions
- Only then switch package scripts to modular entry point
- Review transaction edit balance semantics and date/time edge cases
- Add category creation/deletion and dashboard tests as features are introduced
