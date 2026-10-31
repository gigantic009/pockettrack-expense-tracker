# Deployment Readiness Checklist

PocketTrack currently runs as a local Node.js + Express application using SQLite. This document is a planning checklist, not a claim that the application is production-ready.

## Current deployment blockers

- [ ] Choose a hosting provider that supports Node.js and persistent writable storage.
- [ ] Confirm that the chosen hosting plan supports a persistent disk/volume. Do not rely on an ephemeral filesystem for SQLite data.
- [ ] Set a fresh, private production `JWT_SECRET` in the host's secret/environment settings. Never commit it.
- [ ] Set `NODE_ENV=production` so the session cookie's Secure flag is enabled.
- [ ] Confirm HTTPS is enabled and the app is served only over HTTPS.
- [ ] Configure automated database backups and test restoring one.
- [ ] Decide how schema changes and database migrations will be managed.
- [ ] Verify same-origin checks for state-changing API requests behind the production reverse proxy; configure trusted proxy behavior correctly.
- [ ] Decide whether to add a synchronizer-token or double-submit-token CSRF mechanism for the final deployment.
- [ ] Review Content Security Policy before enabling it; the current Helmet configuration disables CSP.
- [ ] Plan account recovery and a process for handling forgotten passwords.
- [ ] Review logging, monitoring, rate limits, and operational alerts.
- [ ] Perform security testing before storing real financial information.

## SQLite hosting requirements

The application stores its database at `data/pockettrack.sqlite` relative to the project directory. The hosting provider must mount persistent storage at that `data` directory (or the code must be changed to use a configured database path).

Do not run multiple application instances against a local SQLite file on ordinary ephemeral storage. For horizontal scaling or a multi-instance deployment, migrate to a managed server database such as PostgreSQL.

## Pre-launch verification

- [ ] Register a new test account.
- [ ] Confirm duplicate registration is rejected.
- [ ] Confirm invalid credentials are rejected.
- [ ] Confirm one account cannot access another account's records.
- [ ] Create, edit, and delete test transactions.
- [ ] Confirm invalid amounts and future dates are rejected by the server.
- [ ] Confirm logout clears the session cookie.
- [ ] Restart the service and confirm data persists.
- [ ] Restore a database backup in a test environment.
- [ ] Confirm secrets and database files are excluded from Git.

## Important

PocketTrack is a learning and portfolio project. Do not present it as an audited financial product or store sensitive real-world financial data in a public deployment until the checklist has been addressed and the application has received an appropriate security review.
