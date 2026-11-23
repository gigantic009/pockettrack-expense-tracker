# Development Guide

## Local setup
1. Install Node.js 20+.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`.
4. Set a private JWT secret of at least 32 characters.
5. Run `npm start`.

## Checks
- `npm run check`: syntax checks
- `npm test`: automated tests
- `npm run backup`: database backup

## Refactor workflow
Make focused changes on the refactor branch, add or update tests, run checks, and review the diff before merging. Never commit .env, database files, backups, or personal financial data.
