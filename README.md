# PocketTrack — Personal Finance & Expense Tracker

[![CI](https://github.com/gigantic009/pockettrack-expense-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/gigantic009/pockettrack-expense-tracker/actions/workflows/ci.yml)
![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-43853D?logo=node.js&logoColor=white)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-Not%20specified-lightgrey)

PocketTrack is a full-stack, multi-user personal finance application built with **Node.js, Express, SQLite, and vanilla JavaScript**. It helps users record income and expenses, understand monthly cash flow, and keep each account's financial records private from other accounts.

> **Status:** Deployed on Railway. This is a portfolio project, not an audited financial product.
>
> **Live application:** https://pockettrack-production.up.railway.app

## Deployment

PocketTrack is deployed on Railway:

- **Live application:** https://pockettrack-production.up.railway.app
- **Hosting:** Railway

The deployed instance uses persistent storage as configured for the deployment. Avoid entering sensitive real financial information into this portfolio demo.

## Highlights

- 🔐 **Account security:** registration, login, bcrypt password hashing, signed sessions, and HttpOnly cookies.
- 👤 **Account isolation:** users can access only their own transactions and categories.
- 💸 **Income and expense tracking:** create, edit, delete, search, and filter records.
- 📊 **Financial overview:** all-time balance, monthly income, expenses, and savings rate.
- 🧭 **Spending insights:** category-wise expense breakdown and six-month cash-flow chart.
- 🇮🇳 **India-aware defaults:** INR currency formatting and India Standard Time date validation.
- 📱 **Responsive interface:** layouts for desktop, tablet, and mobile.
- 💾 **Database backups:** verified SQLite backups with a seven-backup retention policy.
- 🧪 **Automated checks:** validation, API integration, and backup tests.

## Screens and experience

The dashboard brings together account-level balance, month-specific financial summaries, spending categories, cash flow, and a searchable transaction table. The interface is built with plain HTML, CSS, and JavaScript; no frontend framework is required.

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
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Get the current account |
| GET | `/api/categories` | List the current user's categories |
| GET | `/api/transactions` | List transactions; optional `month=YYYY-MM` |
| POST | `/api/transactions` | Create a transaction |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| GET | `/api/summary?month=YYYY-MM` | Get monthly dashboard totals |

## Project structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── database/
│   └── schema.sql
├── lib/
│   └── validation.js
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   └── backup-database.js
├── test/
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

The SQLite database is stored locally at `data/pockettrack.sqlite`. The `data/` directory and `.env` file are excluded from Git.

## Security and deployment notes

PocketTrack uses password hashing, signed JWT sessions, HttpOnly/SameSite cookies, rate limiting, Helmet security headers, parameterized SQL queries, and user-scoped database access.

Before any public deployment, configure HTTPS, a strong private production secret, persistent storage, off-site backups, account recovery, monitoring, and an independently reviewed CSRF/session strategy. Current JWT sessions are not centrally revocable before expiry. SQLite is suitable for local development and a small single-server deployment with persistent disk; a multi-instance deployment should use a server database such as PostgreSQL.

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## Roadmap

- [ ] Browser-based end-to-end tests
- [ ] Custom categories and category management
- [ ] CSV export and import
- [ ] Recurring transactions and budgets
- [ ] Multi-currency support with explicit exchange-rate handling
- [ ] Accessible charts and richer dashboard interactions
- [x] Deployment on Railway
- [ ] Browser-based end-to-end tests
- [ ] Custom categories and category management

## License

No open-source license has been added. Until one is selected, no explicit permission for reuse, modification, or redistribution is granted.
