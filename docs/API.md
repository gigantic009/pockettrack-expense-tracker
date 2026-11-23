# API Contract

All API routes are rooted at `/api`. Mutating requests require the same-origin guard and use the session cookie.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /auth/register | Register and start a session |
| POST | /auth/login | Authenticate |
| POST | /auth/logout | Clear session cookie |
| GET | /auth/me | Current user |
| GET | /categories | Account categories |
| GET | /transactions | List transactions; optional month=YYYY-MM |
| POST | /transactions | Create transaction |
| PUT | /transactions/:id | Update owned transaction |
| DELETE | /transactions/:id | Delete owned transaction |
| GET | /summary?month=YYYY-MM | Dashboard summary |

## Response conventions
Successful endpoints return JSON. Errors should be JSON with an actionable, non-sensitive `error` message. Do not expose SQL, stack traces, secrets or credential details in public responses.

## Compatibility
This contract documents the current API while routes and handlers are being modularized. Changes to the contract should be intentional and covered by tests.
