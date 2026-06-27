# AlnawaaERP Official

AlnawaaERP Official is a server-backed ERP web app for a medicine-selling company.

## Run Locally

Use the bundled Node runtime from this Codex workspace:

```bash
/Users/macbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.js
```

Then open:

```text
http://localhost:4280
```

To let another computer on the same Wi-Fi/network open it, run:

```bash
HOST=0.0.0.0 PORT=4280 /Users/macbook/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node server.js
```

Then open the Mac's network address from the other computer, for example:

```text
http://172.20.10.2:4280
```

## Admin Login

```text
Email: admin@alnawaaerp.com
Password: admin123
```

## What This Version Includes

- Backend API with login sessions
- Server-side JSON database at `data/database.json`
- alnawaa visual identity applied to the login screen, sidebar, dashboard, and printable documents
- Official brand colors: primary `#09B2AC`, secondary `#FF7450`, dark background `#0A3030`, text `#1F1F1F`, paper accent `#F4F0E4`
- Logo assets in `public/assets/`
- Medicine inventory with batch numbers, supplier, stock, reorder level, cost, price, expiry
- Production/manufacturing date tracking for medicine batches
- Supplier and customer records
- Purchases that add stock and track supplier balances
- Sales invoices that select a medicine batch, reduce that batch stock, and block expired batches unless an admin override is used
- Invoice preview and print with batch number, production date, expiry date, payment history, and signatures
- Delete sale/invoice action that restores sold stock and reverses linked payment transactions
- Goods Delivery Receipt / Customer Receiving Receipt generation and print view
- Partial and full customer payment receipts with receipt numbers and remaining balances
- Customer balance tracking with unpaid and partially paid invoice counts
- Accounting dashboard for sales, purchases, receivables, payables, gross profit, net profit, expenses, salaries, withdrawals, cashbox, and bank accounts
- Expense, payroll, withdrawal, cashbox, bank account, and internal transfer tracking
- Main Cashbox, Al Nouran Bank, Jumhouria Bank, and ability to add more bank accounts
- User roles, starting with one admin account
- Reports for sales, purchases, customer balances, supplier balances, expenses, salaries, withdrawals, account statements, profit/loss, expiry risk, and reorder plan
- Branded printable document templates and CSV report export
- Module toggles for barcode, payments, delivery, and accounting
- Audit activity view
- Backup export

The database starts blank: no sample medicines, suppliers, customers, purchases, sales, invoices, or report totals.

## Public Deployment Note

This is ready as a local official build. Before using it as a real public business system, move the database to PostgreSQL or MySQL, enable HTTPS, configure backups, use real domain hosting, and review medicine-business compliance and security requirements.
