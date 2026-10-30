# PocketTrack Demo Walkthrough

This guide provides a short, repeatable way to demonstrate PocketTrack during a project review or interview. Use a fresh test account and fictional amounts only. Never demonstrate with personal financial records or share real account credentials.

## Before the demo

1. Start the app with `npm start`.
2. Open `http://localhost:3000`.
3. Register a new account using a demo-only email address and password.
4. Confirm the dashboard opens.

## Suggested five-minute walkthrough

### 1. Show the dashboard

Explain the difference between the all-time balance and the selected month's income and expenses. Change the month filter and show how the monthly figures respond.

### 2. Add an expense

Create a fictional expense such as:

- Description: `Demo groceries`
- Amount: `850`
- Type: `Expense`
- Category: `Food`
- Date: today's date

Point out that the dashboard and transaction list update.

### 3. Add income

Create a fictional income entry, for example:

- Description: `Demo allowance`
- Amount: `5000`
- Type: `Income`
- Category: `Allowance`
- Date: today's date

Explain how income and expenses contribute to the balance and monthly summary.

### 4. Demonstrate search and filters

Search for `Demo`, then try the month, category, and transaction-type filters. Explain that these help users find specific records.

### 5. Edit and delete

Edit the demo expense amount, save it, and show the updated totals. Delete the demo entry and show that the totals recalculate.

### 6. Explain multi-user isolation

If you want to demonstrate account isolation, register a second fictional account in a separate private browser session. Add a test transaction there and show that it does not appear in the first account. Do not share session cookies or passwords.

## Technical explanation

A concise explanation:

"The frontend sends JSON requests to an Express API. Authentication middleware verifies the JWT stored in an HttpOnly cookie and loads the user from SQLite. Transaction and category queries are scoped to that authenticated user ID, so the browser cannot select another user's records by changing an ID in a request."

## Clean up

Delete the demo transactions and sign out after the walkthrough. If you used a temporary database or test deployment, remove it only after confirming it contains no records you need to keep.

## Honest project claims

Describe the checks you actually performed. The repository includes manual development verification notes, but it does not currently claim a formal independent security audit or a complete automated end-to-end test suite.
