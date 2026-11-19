# PocketTrack: Demonstration and Viva Guide

## 5-minute demonstration
1. Register or sign in and show the personal dashboard.
2. Add an expense and show how the balance, monthly summary and category breakdown change.
3. Edit and delete a transaction, explaining validation and ownership.
4. Set a category budget and demonstrate the remaining/over-budget display.
5. Preview a CSV import before committing; explain invalid rows and duplicate handling.
6. Create a recurring rule and explicitly run it. Explain that rules do not post transactions silently.
7. Show the recent account activity panel and export a CSV.

## Architecture (explain in plain language)
- Browser: HTML, CSS and JavaScript render the dashboard and send requests.
- Server: Express routes authenticate requests, validate data and apply business rules.
- Database: SQLite stores account and finance data; queries are scoped to the signed-in user.
- Session: the session record can be revoked, so signing out invalidates server-side access.
- Tests: utility tests cover CSV handling; API tests exercise routes, finance flows and session behaviour.

## Suggested viva questions
- Why is a CSV preview separate from commit?
- How do duplicate imports avoid adding the same row twice?
- Why are recurring transactions user-triggered?
- What does server-side session revocation solve?
- How does the app prevent spreadsheet formula injection in CSV?
- What does the activity history record—and what does it not guarantee?
- Why is SQLite suitable for a local/student demonstration but not necessarily a horizontally scaled deployment?

## Demo setup checklist
- Use a fresh demo account and synthetic transactions.
- Keep a small CSV with valid rows, a duplicate and an invalid row ready.
- Have one budget and one recurring rule ready to demonstrate.
- Do not use real bank credentials or personal financial data.
- Verify the server and tests before the demo.
