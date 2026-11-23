# Error Handling

## Principles
- Validate request data at the boundary.
- Use explicit domain errors for expected failures.
- Centralize unexpected error logging and HTTP response shaping.
- Never expose stack traces, database details, secrets, or internal paths to clients.
- Handle rejected asynchronous work explicitly.
- Preserve meaningful HTTP status codes (400 validation, 401 authentication, 403 origin/authorization, 404 missing resource, 409 conflict, 429 rate limit, 500 unexpected).

## Frontend
- Normalize API errors in one transport layer.
- Present user-facing messages near the action.
- Do not use raw server error details beyond the safe API message.
- Handle network errors, malformed responses and non-JSON responses.

## Backend migration target
Controllers should forward errors to centralized middleware. Services should throw typed errors for expected domain failures. Repositories should not decide HTTP status codes.
