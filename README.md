# PocketTrack 2.0 — Multi-user Expense Tracker

A full-stack personal expense tracker. Each registered account has a private set of transactions and categories.

## Stack
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- SQL database: SQLite (`better-sqlite3`)
- Authentication: bcrypt password hashing + signed, HttpOnly JWT cookie

## Run locally
1. Install Node.js 18 or newer.
2. Extract this folder and open a terminal inside it.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env`.
5. Replace `JWT_SECRET` with a long random secret (at least 32 characters).
6. Start the app:
   ```bash
   npm start
   ```
7. Open http://localhost:3000

The SQLite database is created automatically at `data/pockettrack.sqlite` on first run.

## Data isolation
Every transaction and category row has a `user_id` foreign key. Every read, update and delete query filters by the authenticated user's ID. The server obtains that ID from a verified session token; it never trusts a user ID sent by the browser.

## Important before public deployment
This is a learning-project starter, not a finished audited financial service. Use HTTPS, a strong private JWT secret, backups, database migrations, CSRF protection appropriate to your deployment, account recovery, and security testing before exposing it publicly. SQLite is suitable for local development and a small single-server deployment. Consider PostgreSQL for a larger hosted multi-user app.

## Database tables
- `users`: account identity and password hash
- `categories`: per-user categories
- `transactions`: income and expenses owned by a user

Schema is in `database/schema.sql`.
