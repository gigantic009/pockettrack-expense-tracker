# PocketTrack — Personal Finance & Expense Tracker

[![CI](https://github.com/gigantic009/pockettrack-expense-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/gigantic009/pockettrack-expense-tracker/actions/workflows/ci.yml)
![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-43853D?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-Not%20specified-lightgrey)

PocketTrack is a full-stack, multi-user personal finance application built with **Node.js, Express, SQLite, and vanilla JavaScript**. It helps users record income and expenses, understand monthly cash flow, and keep each account's financial records private from other accounts.

> **Status:** Local application and portfolio project. Public deployment is not configured. This is not an audited financial product.

## Highlights

- 🔐 **Account security:** registration, login, bcrypt password hashing, HttpOnly cookies, server-side session revocation, and per-session logout.
- 🧾 **Audit history:** account-scoped append-only events for financial changes, imports, budgets, and recurring-rule execution.
- 👤 **Account isolation:** users can access only their own transactions and categories.
- 💸 **Income and expense tracking:** create, edit, delete, search, and filter records.
- 📊 **Financial overview:** all-time balance, monthly income, expenses, and savings rate.
- 🧭 **Spending insights:** category-wise expense breakdown and six-month cash-flow chart.
- 🇮🇳 **India-aware defaults:** INR currency formatting and India Standard Time date validation.
- 📱 **Responsive interface:** layouts for desktop, tablet, and mobile.
- 💾 **Database backups:** verified SQLite backups with a seven-backup retention policy.
- 🧪 **Automated checks:** validation, API integration, backup, CSV safety, budget, and recurring-rule tests.
- 📥 **CSV workflows:** preview-before-import, row validation, duplicate skipping, and formula-safe export.
- 🎯 **Monthly budgets:** category limits with actual spend, remaining amount, and usage percentage.
- 🔁 **Recurring rules:** weekly/monthly rules that create due entries only when the user explicitly runs them; duplicate occurrences are prevented.

## Technology

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js 20+, Express |
| Database | SQLite, better-sqlite3 |
| Authentication | bcryptjs, JSON Web Tokens, HttpOnly cookies |
| Security | Helmet, express-rate-limit, same-origin request checks |
| Testing | Node.js built-in test runner |
| Configuration | dotenv |

## Run locally

### Requirements
- Node.js 20 or newer
- npm

### Installation
```bash
git clone https://github.com/gigantic009/pockettrack-expense-tracker.git
cd pockettrack-expense-tracker
npm ci
```

Create the local environment file:

**Windows CMD**
```cmd
copy .env.example .env
```

**macOS / Linux**
```bash
cp .env.example .env
```

Edit `.env` and set `JWT_SECRET` to a private, randomly generated value of at least 32 characters. Never commit `.env`.

Start the application:
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

### Development and verification
```bash
npm run dev
npm run check
npm test
npm run backup
```

The automated API tests use a temporary SQLite database so they do not modify a developer's local financial records. Backup tests cover verification, retention, missing databases, and corrupt-database failure handling.

## API overview

All protected endpoints require a valid login session.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Revoke current session and sign out |
| GET | `/api/auth/sessions` | List active sessions |
| DELETE | `/api/auth/sessions/:id` | Revoke one session |
| POST | `/api/auth/logout-all` | Revoke every active session |
| GET | `/api/audit` | Read the current account's recent financial activity |
| GET | `/api/auth/me` | Get the current account |
| GET | `/api/categories` | List the current user's categories |
| GET | `/api/transactions` | List transactions; optional `month=YYYY-MM` |
| POST | `/api/transactions` | Create a transaction |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| GET | `/api/summary?month=YYYY-MM` | Get monthly dashboard totals |
| GET | `/api/transactions/export.csv` | Export authenticated user's transactions |
| POST | `/api/transactions/import/preview` | Validate and preview a CSV import |
| POST | `/api/transactions/import` | Import valid rows; skip duplicates |
| GET/POST | `/api/budgets` | List or save monthly category budgets |
| DELETE | `/api/budgets/:id` | Delete a category budget |
| GET/POST | `/api/recurring-rules` | List or create recurring rules |
| DELETE | `/api/recurring-rules/:id` | Delete a recurring rule |
| POST | `/api/recurring-rules/:id/run` | Create due transactions idempotently |

## Project structure

```text
.
├── .github/workflows/
├── database/schema.sql
├── docs/
├── lib/validation.js
├── public/
├── scripts/backup-database.js
├── test/
├── .env.example
├── package.json
├── package-lock.json
└── server.js
```

The SQLite database is stored locally at `data/pockettrack.sqlite`. The `data/` directory and `.env` file are excluded from Git.

## Security and deployment notes

PocketTrack uses password hashing, signed JWT sessions, HttpOnly/SameSite cookies, rate limiting, Helmet security headers, parameterized SQL queries, and user-scoped database access.

Before any public deployment, configure HTTPS, a strong private production secret, persistent storage, off-site backups, account recovery, monitoring, and an independently reviewed CSRF/session strategy. Session revocation is now database-backed, but recovery and multi-device operational controls still need additional hardening. Current JWT sessions are not centrally revocable before expiry. SQLite is suitable for local development and a small single-server deployment with persistent disk; a multi-instance deployment should use a server database such as PostgreSQL.

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance and [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for the threat model and residual risks.

## Upgrade roadmap

The remaining production-readiness work is tracked in [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md). PostgreSQL support, account recovery, browser E2E testing, and deployment acceptance criteria remain future work.

**Important:** these are planned upgrades; the roadmap does not claim that those features are already implemented.

## Product research and engineering references

- [Actual Budget](https://github.com/actualbudget/actual): envelope-style budgeting, clear budget-vs-actual workflows, and import ergonomics.
- [Firefly III](https://github.com/firefly-iii/firefly-iii): recurring transactions, categories, reports, and API-first finance workflows.
- [GODMAN](https://github.com/gigantic009/GODMAN): explicit user control, scoped operations, auditable actions, validation, and no silent high-impact automation. This is an engineering-pattern reference; no GODMAN code is copied.

PocketTrack is an independent implementation. Its recurring rules are intentionally user-triggered rather than silently posting money movements in the background.

## License

No open-source license has been added. Until one is selected, no explicit permission for reuse, modification, or redistribution is granted.
