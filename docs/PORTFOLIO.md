# PocketTrack — Portfolio Notes

Use this page to prepare a truthful project explanation for a resume, portfolio, or technical interview.

## One-line description

A multi-user personal expense tracker built with Node.js, Express, SQLite, and vanilla JavaScript, featuring account authentication, user-scoped financial records, transaction management, and monthly cash-flow summaries.

## Problem it solves

PocketTrack provides a simple place for an individual to record income and expenses, organize entries by category, and review spending over time. Multiple people can register accounts while keeping their records separated.

## What the application does

- Registers users and authenticates returning users.
- Hashes passwords with bcryptjs.
- Stores a signed session token in an HttpOnly cookie.
- Creates and manages income and expense transactions.
- Supports transaction search and filters for month, category, and type.
- Displays an all-time balance and selected-month income, expenses, savings rate, and category totals.
- Rejects invalid transaction amounts and invalid or future transaction dates.
- Persists data in SQLite.

## Technical design

### Frontend

The browser UI is built with HTML, CSS, and vanilla JavaScript. It communicates with the Express backend using JSON API requests and a session cookie.

### Backend

Express serves the frontend and exposes authentication, category, transaction, and summary endpoints. Authentication middleware verifies the JWT and loads the corresponding user from the database.

### Database and ownership

SQLite is accessed through better-sqlite3. Users, categories, and transactions are stored in relational tables. Category and transaction queries are scoped to the authenticated user's ID. Parameterized SQL statements are used for database operations.

### Security measures implemented

- bcrypt password hashing
- JWT verification and seven-day token expiry
- HttpOnly and SameSite Strict session cookie
- Secure cookie flag when `NODE_ENV=production`
- Login and registration rate limiting
- Helmet security headers
- JSON request-size limit
- Parameterized SQL and user-scoped database queries
- Server-side validation for transaction inputs and dates

These are baseline safeguards, not a complete security audit. The current code disables Helmet's Content Security Policy, does not implement a formal CSRF-token flow, and does not provide centralized session revocation before JWT expiry.

## Resume-ready project entry

**PocketTrack | Personal Expense Tracker**  
*Node.js, Express.js, SQLite, JavaScript, HTML, CSS*

- Built a multi-user expense-tracking web application with account registration, login, and private user-scoped transaction records.
- Developed REST API endpoints for authentication, category retrieval, transaction CRUD operations, and monthly financial summaries.
- Integrated SQLite using better-sqlite3 and designed relational tables for users, categories, and transactions.
- Implemented bcrypt password hashing, JWT-based HttpOnly cookie sessions, authentication rate limiting, and server-side input validation.
- Created a responsive dashboard with transaction search and filters, all-time balance, monthly income and expense summaries, and cash-flow visualization.

Only include these bullets if you can explain the implementation yourself. Adjust wording to match the work you personally completed.

## Automated validation tests

The repository includes a Node.js built-in test suite for India-time date validation, impossible dates and leap years, future-date rejection, positive amount bounds, description length, and allowed transaction types. Run it with `npm test`; run syntax checks with `npm run check`. These tests cover shared validation helpers, not the entire API or browser UI.

## Interview explanation (about 60 seconds)

"PocketTrack is a personal expense tracker I built using vanilla JavaScript on the frontend and Node.js with Express on the backend. It supports multiple user accounts. Users can add, edit, delete, search, and filter income and expense transactions. I used SQLite with better-sqlite3 to persist users, categories, and transactions. For authentication, passwords are hashed with bcryptjs, and a signed JWT is stored in an HttpOnly cookie. One important design decision was enforcing ownership on the server: transaction and category queries are scoped to the authenticated user's ID rather than trusting an ID sent by the browser. The dashboard shows an all-time balance and selected-month cash-flow summaries. I also added validation for transaction amounts and dates."

## Questions to prepare for

1. Why did you choose SQLite for this version, and when would PostgreSQL be a better choice?
2. How does the login flow work from password verification to setting the session cookie?
3. What does HttpOnly protect against, and what does it not protect against?
4. How does the backend ensure one user cannot read or modify another user's transactions?
5. Why are parameterized SQL statements important?
6. How do you calculate the all-time balance versus a selected month's totals?
7. How do you validate a calendar date and reject future dates?
8. What changes would be needed before a public production deployment?

## Current project status

- Local application startup and core workflows were manually verified by the project owner.
- Existing local SQLite data was copied using SQLite's backup API into the Git-connected working copy and its integrity check returned `ok`.
- Two accounts, 28 categories, and seven transactions were present in the copied database at the time of verification.
- These counts describe the owner's local development database, not a public demo dataset.
- The project has not been independently audited or deployed publicly.
