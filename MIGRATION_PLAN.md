# AlnawaaERP JSON to PostgreSQL Migration Plan

This document is an analysis and migration plan only. No application code, JSON database files, or archived JSON files have been modified.

## 1. Current Project Shape

The ERP is a small Node.js HTTP server with a static frontend:

- Backend: `server.js`
- Frontend: `public/app.js`, `public/index.html`, `public/styles.css`
- Active data directory: `data/`
- Packaged archive copies: `erp.zip`, `erp-update.zip`

There is no `package.json`, no existing Prisma setup, and no existing SQL database integration.

The server loads the full database into memory at startup:

- `server.js:10-11` defines `DATA_DIR` and `DB_PATH`.
- `server.js:92` initializes `let db = loadDatabase()`.
- `server.js:636-651` reads and parses `data/database.json`.
- `server.js:653-658` rewrites the full JSON database after mutations.

## 2. Where JSON Data Is Stored

### Runtime source of truth

The active runtime database is:

- `data/database.json`

This is the only JSON file directly loaded by the server at startup.

### Local backup snapshots in the repository

These JSON files are present in `data/`, but no code directly loads them unless an operator manually imports them through the backup import UI:

- `data/database.backup-before-accounting-v2.json`
- `data/database.backup-before-branding.json`

### JSON files inside packaged archives

These archives contain additional copies of JSON data:

- `erp.zip`
  - `data/database.json`
  - `data/database.backup-before-accounting-v2.json`
  - `data/database.backup-before-branding.json`
- `erp-update.zip`
  - `data/database.backup-before-accounting-v2.json`
  - `data/database.backup-before-branding.json`

These archive copies are not used by the running app. They should not be imported automatically because they are older snapshots and would duplicate or overwrite active data if treated as live records.

### Browser-local data

The frontend also stores non-business UI data in `localStorage`:

- `alnawaa_language`
- `alnawaa_theme`
- `alnawaa_alerts_expanded`
- `alnawaa_profile_image_<userIdOrEmail>`

These are not part of the ERP server database. They can stay in browser storage unless the product explicitly wants server-side user preferences/profile images later.

## 3. Every JSON File Found

| File | Runtime use | Notes |
| --- | --- | --- |
| `data/database.json` | Active database | Source of truth for migration. |
| `data/database.backup-before-accounting-v2.json` | Manual backup only | Legacy shape, missing accounting arrays. |
| `data/database.backup-before-branding.json` | Manual backup only | Schema v2 shape with accounting arrays. |
| `erp.zip:data/database.json` | Archive only | Older packaged snapshot. |
| `erp.zip:data/database.backup-before-accounting-v2.json` | Archive only | Duplicate of local legacy backup. |
| `erp.zip:data/database.backup-before-branding.json` | Archive only | Duplicate of local branding backup. |
| `erp-update.zip:data/database.backup-before-accounting-v2.json` | Archive only | Duplicate of local legacy backup. |
| `erp-update.zip:data/database.backup-before-branding.json` | Archive only | Duplicate of local branding backup. |

## 4. Active Database Record Counts

Current `data/database.json` contains:

| Entity | Count |
| --- | ---: |
| `suppliers` | 2 |
| `customers` | 1 |
| `medicines` | 2 |
| `purchases` | 2 |
| `sales` | 1 |
| `customerPayments` | 0 |
| `deliveryReceipts` | 0 |
| `supplierPayments` | 2 |
| `expenseCategories` | 9 |
| `expenses` | 0 |
| `salaryPayments` | 0 |
| `withdrawals` | 0 |
| `bankAccounts` | 3 |
| `accountTransactions` | 2 |
| `internalTransfers` | 0 |
| `users` | 2 |
| `auditLogs` | 47 |

Current referential validation found:

- Broken references: 0
- Duplicate top-level IDs: 0
- Users missing credentials: 1

The missing credentials issue matters because `server.js:704-706` requires a usable `salt` and `passwordHash` for login.

## 5. Entities Stored in JSON

### Singleton/config entities

- `settings`
  - `schemaVersion`
  - company profile fields
  - currency
  - next document counters:
    - `nextInvoice`
    - `nextDeliveryReceipt`
    - `nextPaymentReceipt`
    - `nextSupplierPayment`
    - `nextExpense`
    - `nextTransfer`
- `modules`
  - `barcode`
  - `payments`
  - `delivery`
  - `accounting`
- `featureVisibility`
  - role to hidden feature key arrays
- `expenseCategories`
  - string category list

### Business entities

- `suppliers`
- `customers`
- `medicines`
- `purchases`
- `sales`
- `sales[].items`
- `sales[].bonusItems`
- `customerPayments`
- `deliveryReceipts`
- `deliveryReceipts[].items`
- `deliveryReceipts[].bonusItems`
- `supplierPayments`
- `expenses`
- `salaryPayments`
- `withdrawals`
- `bankAccounts`
- `accountTransactions`
- `internalTransfers`
- `users`
- `auditLogs`

### Code-only entities not stored in JSON

- `sessions`: stored in memory only in `server.js:14`.
- `permissionsByRole`: code constant in `server.js:16-49`.
- `featureCatalog`: code constant in `server.js:51-66`.

## 6. JSON Read Locations

### Server-side file reads

- `server.js:636-651`
  - Ensures `data/` exists.
  - Creates a fresh JSON DB if `data/database.json` is missing.
  - Reads `data/database.json` with `fs.readFileSync`.
  - Parses it with `JSON.parse`.
  - Runs `migrateDatabase`.

### Server-side HTTP JSON parsing

- `server.js:1908-1928`
  - `readJsonBody` parses request bodies with `JSON.parse`.
  - Used by login, import, create/update/delete routes with request bodies.

### Import parsing/normalization

- `server.js:660-684`
  - Validates imported backup shape.
  - Deep-clones imported JSON with `JSON.parse(JSON.stringify(source))`.
  - Runs `migrateDatabase`.
  - Removes frontend-only export keys.
  - Preserves credentials from the current DB where possible.

### Frontend JSON reads

- `public/app.js:648-668`
  - API helper reads JSON responses using `response.json()`.
- `public/app.js:3125-3132`
  - Reads selected backup file text.
  - Parses backup with `JSON.parse`.
  - Posts parsed JSON to `/api/import`.

## 7. JSON Write Locations

### Server-side file writes

- `server.js:653-658`
  - `saveDatabase(nextDb)` runs migration/derived balance recalculation and writes the full database to `data/database.json` with `fs.writeFileSync`.

### Routes that call `saveDatabase`

| Route/action | Lines | JSON effect |
| --- | ---: | --- |
| `PATCH /api/me/account` | `167-170` | Updates current user email/password. |
| `POST /api/import` | `192-199` | Replaces full in-memory DB with imported backup. |
| `POST /api/reset` | `204-208` | Replaces full DB with `initialDatabase()`. |
| `POST /api/medicines` | `213-220` | Adds medicine batch. |
| `PUT /api/medicines/:id` | `225-234` | Updates medicine batch. |
| `DELETE /api/medicines/:id` | `239-243` | Deletes medicine batch after reference checks. |
| `POST /api/suppliers` | `248-255` | Adds supplier. |
| `DELETE /api/suppliers/:id` | `260-265` | Deletes supplier after reference checks. |
| `POST /api/customers` | `270-277` | Adds customer. |
| `DELETE /api/customers/:id` | `282-287` | Deletes customer after reference checks. |
| `POST /api/users` | `292-312` | Adds user with hashed password. |
| `DELETE /api/users/:id` | `317-340` | Deletes user and clears sessions. |
| `POST /api/purchases` | `345-350` | Adds purchase, increases stock, may create supplier payment. |
| `DELETE /api/purchases/:id` | `355-360` | Deletes purchase, reverses stock/payments. |
| `POST /api/purchases/:id/payments` | `365-371` | Adds supplier payment and account transaction. |
| `DELETE /api/supplier-payments/:id` | `376-381` | Deletes supplier payment and reverses account transaction. |
| `POST /api/sales` | `386-391` | Adds sale, deducts stock, may create customer payment. |
| `PUT /api/sales/:id` | `396-402` | Updates sale, restores/deducts stock, syncs linked docs. |
| `DELETE /api/sales/:id` | `407-411` | Deletes sale, restores stock, deletes linked payments/receipts. |
| `POST /api/sales/:id/payments` | `416-422` | Adds customer payment and account transaction. |
| `DELETE /api/customer-payments/:id` | `427-432` | Deletes customer payment and reverses account transaction. |
| `POST /api/sales/:id/delivery-receipts` | `437-443` | Adds delivery receipt. |
| `DELETE /api/delivery-receipts/:id` | `448-453` | Deletes delivery receipt. |
| `PATCH /api/sales/:id/payment` | `458-476` | Legacy payment-status endpoint. |
| `POST /api/expenses` | `481-486` | Adds expense and account transaction. |
| `DELETE /api/expenses/:id` | `491-496` | Deletes expense and reverses account transaction. |
| `POST /api/salaries` | `501-506` | Adds salary payment and linked expense. |
| `DELETE /api/salaries/:id` | `511-516` | Deletes salary payment and linked expense. |
| `POST /api/withdrawals` | `521-526` | Adds withdrawal and account transaction. |
| `DELETE /api/withdrawals/:id` | `531-536` | Deletes withdrawal and reverses account transaction. |
| `POST /api/bank-accounts` | `541-546` | Adds bank/cash account. |
| `DELETE /api/bank-accounts/:id` | `551-556` | Deletes account after transaction checks. |
| `POST /api/internal-transfers` | `561-566` | Adds transfer and two account transactions. |
| `DELETE /api/internal-transfers/:id` | `571-576` | Deletes transfer and reverses both transactions. |
| `PATCH /api/modules/:key` | `581-590` | Updates module boolean. |
| `PATCH /api/feature-visibility` | `595-605` | Updates hidden features for role. |

### Server-side response serialization

- `server.js:180-188`
  - `/api/export` serializes a backup with `JSON.stringify`.
- `server.js:1930-1932`
  - `sendJson` serializes all API responses with `JSON.stringify`.

### Frontend JSON writes

- `public/app.js:656-659`
  - API helper sends request bodies with `JSON.stringify`.
- `public/app.js:3074-3085`
  - Browser downloads `/api/export` as `AlnawaaERP-backup-YYYY-MM-DD.json`.
- `public/app.js:3132`
  - Posts parsed backup JSON to `/api/import`.

### Browser localStorage writes

- `public/app.js:286-288`
  - Saves profile image data URL.
- `public/app.js:706`
  - Saves language.
- `public/app.js:713`
  - Saves theme.
- `public/app.js:1202`
  - Saves alert panel state.

These localStorage writes are not server JSON database writes.

## 8. Complete Data Relationships

### Supplier relationships

- `Supplier` has many `Medicine` records via `medicine.supplierId`.
- `Supplier` has many `Purchase` records via `purchase.supplierId`.
- `Supplier` has many `SupplierPayment` records via `supplierPayment.supplierId`.

Delete behavior today:

- Supplier deletion is blocked if referenced by medicines, purchases, or supplier payments.

### Customer relationships

- `Customer` has many `Sale` records via `sale.customerId`.
- `Customer` has many `CustomerPayment` records via `customerPayment.customerId`.
- `Customer` has many `DeliveryReceipt` records via `deliveryReceipt.customerId`.

Delete behavior today:

- Customer deletion is blocked if referenced by sales, customer payments, or delivery receipts.

### Medicine relationships

- `Medicine` belongs to one `Supplier`.
- `Medicine` has many `Purchase` records via `purchase.medicineId`.
- `Medicine` appears in `Sale.items` and `Sale.bonusItems`.
- `Medicine` appears in `DeliveryReceipt.items` and `DeliveryReceipt.bonusItems`.

Delete behavior today:

- Medicine deletion is blocked if referenced by sales or purchases.

### Purchase relationships

- `Purchase` belongs to one `Supplier`.
- `Purchase` belongs to one `Medicine`.
- `Purchase` was created by one `User` via `createdBy`.
- `Purchase` has many `SupplierPayment` records via `supplierPayment.purchaseId`.

Delete behavior today:

- Purchase deletion reverses related supplier payment account transactions.
- Purchase deletion removes supplier payments.
- Purchase deletion subtracts purchase quantity from medicine stock if possible.

### Sale/invoice relationships

- `Sale` belongs to one `Customer`.
- `Sale` was created by one `User` via `createdBy`.
- `Sale` has many normal line items from `sales[].items`.
- `Sale` has many bonus/free line items from `sales[].bonusItems`.
- `Sale` has many `CustomerPayment` records via `customerPayment.saleId`.
- `Sale` has many `DeliveryReceipt` records via `deliveryReceipt.saleId`.
- `Sale.paymentReceiptIds` duplicates the customer payment relationship.
- `Sale.deliveryReceiptIds` duplicates the delivery receipt relationship.

Delete behavior today:

- Sale deletion restores all normal and bonus item quantities to medicine stock.
- Sale deletion reverses linked customer payment transactions.
- Sale deletion removes linked customer payments and delivery receipts.

### Customer payment relationships

- `CustomerPayment` belongs to one `Sale`.
- `CustomerPayment` belongs to one `Customer`.
- `CustomerPayment` belongs to one `BankAccount`.
- `CustomerPayment` may link to one `AccountTransaction`.
- It stores denormalized snapshots:
  - `invoiceNumber`
  - `invoiceTotal`
  - `bankAccountName`
  - `receivedBy`
  - `totalPaidSoFar`
  - `remainingBalance`

### Delivery receipt relationships

- `DeliveryReceipt` belongs to one `Sale`.
- `DeliveryReceipt` belongs to one `Customer`.
- `DeliveryReceipt` has normal and bonus item arrays.
- It stores denormalized snapshots:
  - `invoiceNumber`
  - `customerName`
  - `customerType`
  - `total`
  - item names, batches, expiry dates

### Supplier payment relationships

- `SupplierPayment` belongs to one `Purchase`.
- `SupplierPayment` belongs to one `Supplier`.
- `SupplierPayment` belongs to one `BankAccount`.
- `SupplierPayment` may link to one `AccountTransaction`.
- It stores denormalized snapshots:
  - `supplierName`
  - `bankAccountName`
  - `paidBy`
  - `totalPaidSoFar`
  - `remainingBalance`

### Expense relationships

- `Expense` belongs to one expense category by category name.
- `Expense` belongs to one `BankAccount` via `paidFromAccountId`.
- `Expense` may link to one `AccountTransaction`.
- `Expense` was created by one `User` via `createdBy`.
- `Expense.source` is usually `expense` or `salary`.

### Salary relationships

- `SalaryPayment` belongs to one `BankAccount`.
- `SalaryPayment` was created by one `User` via `createdBy`.
- `SalaryPayment` may link one-to-one to an `Expense` via `salary.expenseId`.
- Salary creation currently creates an expense with `source: "salary"`.

### Withdrawal relationships

- `Withdrawal` belongs to one `BankAccount`.
- `Withdrawal` may link to one `AccountTransaction`.
- `Withdrawal` was created by one `User` via `createdBy`.

### Bank/accounting relationships

- `BankAccount` has many `AccountTransaction` records.
- `AccountTransaction.source` and `sourceId` are polymorphic and can point to:
  - `customer_payment`
  - `supplier_payment`
  - `expense`
  - `salary`
  - `withdrawal`
  - `internal_transfer`
- `BankAccount.currentBalance`, `totalDeposits`, and `totalWithdrawals` are derived from non-reversed transactions plus opening balance.

### Internal transfer relationships

- `InternalTransfer` belongs to a from account.
- `InternalTransfer` belongs to a to account.
- `InternalTransfer` has one withdrawal/out transaction.
- `InternalTransfer` has one deposit/in transaction.

### User/audit relationships

- `User` is referenced by `createdBy` on purchases, sales, payments, expenses, salary payments, withdrawals, transfers, account transactions, and audit logs.
- `AuditLog` stores both `userId` and denormalized `userName`.
- Audit logs should remain append-only.

## 9. Recommended PostgreSQL/Prisma Schema

This schema keeps existing top-level IDs as strings, normalizes embedded arrays into relational line-item tables, preserves printable snapshot fields, and stores the original import JSON for auditability.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  Admin
  Manager
  Pharmacist
  Sales
  Accountant
}

enum UserStatus {
  Active
  Suspended
}

enum PaymentStatus {
  Unpaid        @map("Unpaid")
  PartiallyPaid @map("Partially Paid")
  Paid          @map("Paid")
}

enum DeliveryStatus {
  Ready
  Scheduled
  Delivered
}

enum AccountType {
  Cashbox
  Bank
}

enum TransactionType {
  deposit
  withdrawal
}

enum SaleItemKind {
  NORMAL
  BONUS
}

model CompanySettings {
  id                    String   @id @default("default")
  schemaVersion         Int      @default(2)
  companyName           String
  companySubtitle       String?
  companyDetails        String?
  companyPhone          String?
  companyPhoneAlt       String?
  companyEmail          String?
  companyAddress        String?
  companyAddressArabic  String?
  currency              String   @default("LYD")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model NumberSequence {
  key       String @id
  nextValue Int
}

model ModuleSetting {
  key     String  @id
  enabled Boolean @default(true)
}

model HiddenFeature {
  role       UserRole
  featureKey String

  @@id([role, featureKey])
}

model ExpenseCategory {
  name      String    @id
  expenses  Expense[]
  createdAt DateTime  @default(now())
}

model Supplier {
  id               String            @id
  name             String
  type             String            @default("Supplier")
  phone            String
  email            String?
  address          String?
  createdAt        DateTime
  medicines        Medicine[]
  purchases        Purchase[]
  supplierPayments SupplierPayment[]
}

model Customer {
  id               String            @id
  name             String
  type             String            @default("Customer")
  phone            String
  email            String?
  address          String?
  createdAt        DateTime
  sales            Sale[]
  customerPayments CustomerPayment[]
  deliveryReceipts DeliveryReceipt[]
}

model Medicine {
  id                 String                @id
  name               String
  sku                String
  category           String
  batch              String
  productionDate     DateTime?             @db.Date
  supplierId         String
  supplier           Supplier              @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  location           String?
  stock              Int                   @default(0)
  reorderLevel       Int                   @default(0)
  cost               Decimal               @db.Decimal(14, 3)
  price              Decimal               @db.Decimal(14, 3)
  expiry             DateTime?             @db.Date
  createdAt          DateTime
  purchases          Purchase[]
  saleItems          SaleItem[]
  deliveryItems      DeliveryReceiptItem[]

  @@index([supplierId])
  @@index([sku])
  @@index([batch])
  @@index([expiry])
}

model User {
  id                  String               @id
  name                String
  role                UserRole
  email               String               @unique
  status              UserStatus           @default(Active)
  salt                String?
  passwordHash        String?
  createdAt           DateTime?
  purchasesCreated    Purchase[]           @relation("PurchaseCreatedBy")
  salesCreated        Sale[]               @relation("SaleCreatedBy")
  customerPayments    CustomerPayment[]    @relation("CustomerPaymentCreatedBy")
  supplierPayments    SupplierPayment[]    @relation("SupplierPaymentCreatedBy")
  expensesCreated     Expense[]            @relation("ExpenseCreatedBy")
  salariesCreated     SalaryPayment[]      @relation("SalaryCreatedBy")
  withdrawalsCreated  Withdrawal[]         @relation("WithdrawalCreatedBy")
  transfersCreated    InternalTransfer[]   @relation("TransferCreatedBy")
  transactionsCreated AccountTransaction[] @relation("TransactionCreatedBy")
  auditLogs           AuditLog[]
}

model Purchase {
  id                String            @id
  invoiceNumber     String?
  date              DateTime          @db.Date
  supplierId        String
  supplier          Supplier          @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  medicineId        String
  medicine          Medicine          @relation(fields: [medicineId], references: [id], onDelete: Restrict)
  quantity          Int
  unitCost          Decimal           @db.Decimal(14, 3)
  total             Decimal           @db.Decimal(14, 3)
  paidAmount        Decimal           @db.Decimal(14, 3)
  remainingBalance  Decimal           @db.Decimal(14, 3)
  paymentStatus     PaymentStatus
  createdById       String?
  createdBy         User?             @relation("PurchaseCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt         DateTime
  supplierPayments  SupplierPayment[]

  @@index([supplierId])
  @@index([medicineId])
  @@index([date])
}

model Sale {
  id                String            @id
  invoiceNumber     String            @unique
  date              DateTime          @db.Date
  customerId        String
  customer          Customer          @relation(fields: [customerId], references: [id], onDelete: Restrict)
  total             Decimal           @db.Decimal(14, 3)
  totalPaid         Decimal           @db.Decimal(14, 3)
  remainingBalance  Decimal           @db.Decimal(14, 3)
  paymentStatus     PaymentStatus
  deliveryStatus    DeliveryStatus
  notes             String?
  createdById       String?
  createdBy         User?             @relation("SaleCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt         DateTime
  updatedById       String?
  updatedAt         DateTime?
  items             SaleItem[]
  payments          CustomerPayment[]
  deliveryReceipts  DeliveryReceipt[]

  @@index([customerId])
  @@index([date])
}

model SaleItem {
  id             String       @id
  saleId         String
  sale           Sale         @relation(fields: [saleId], references: [id], onDelete: Cascade)
  lineNo         Int
  kind           SaleItemKind
  medicineId     String
  medicine       Medicine     @relation(fields: [medicineId], references: [id], onDelete: Restrict)
  name           String
  sku            String?
  batch          String?
  productionDate DateTime?    @db.Date
  expiry         DateTime?    @db.Date
  quantity       Int
  unitPrice      Decimal      @db.Decimal(14, 3)
  unitCost       Decimal      @db.Decimal(14, 3)
  lineTotal      Decimal      @db.Decimal(14, 3)

  @@unique([saleId, kind, lineNo])
  @@index([medicineId])
}

model CustomerPayment {
  id                   String              @id
  receiptNumber        String              @unique
  date                 DateTime            @db.Date
  saleId               String
  sale                 Sale                @relation(fields: [saleId], references: [id], onDelete: Cascade)
  customerId           String
  customer             Customer            @relation(fields: [customerId], references: [id], onDelete: Restrict)
  invoiceNumber        String
  invoiceTotal         Decimal             @db.Decimal(14, 3)
  amount               Decimal             @db.Decimal(14, 3)
  method               String
  bankAccountId        String
  bankAccount          BankAccount         @relation("CustomerPaymentAccount", fields: [bankAccountId], references: [id], onDelete: Restrict)
  bankAccountName      String
  notes                String?
  receivedBy           String?
  createdById          String?
  createdBy            User?               @relation("CustomerPaymentCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt            DateTime
  totalPaidSoFar       Decimal?            @db.Decimal(14, 3)
  remainingBalance     Decimal?            @db.Decimal(14, 3)
  accountTransactionId String?             @unique
  accountTransaction   AccountTransaction? @relation("CustomerPaymentTransaction", fields: [accountTransactionId], references: [id], onDelete: SetNull)

  @@index([saleId])
  @@index([customerId])
  @@index([bankAccountId])
}

model DeliveryReceipt {
  id             String                @id
  receiptNumber  String                @unique
  saleId         String
  sale           Sale                  @relation(fields: [saleId], references: [id], onDelete: Cascade)
  invoiceNumber  String
  date           DateTime              @db.Date
  customerId     String
  customer       Customer              @relation(fields: [customerId], references: [id], onDelete: Restrict)
  customerName   String
  customerType   String?
  receiverName   String?
  receiverPhone  String?
  deliveryPerson String?
  notes          String?
  total          Decimal               @db.Decimal(14, 3)
  createdById    String?
  createdAt      DateTime
  items          DeliveryReceiptItem[]

  @@index([saleId])
  @@index([customerId])
}

model DeliveryReceiptItem {
  id                String          @id
  deliveryReceiptId String
  deliveryReceipt   DeliveryReceipt @relation(fields: [deliveryReceiptId], references: [id], onDelete: Cascade)
  lineNo            Int
  kind              SaleItemKind
  medicineId        String?
  medicine          Medicine?       @relation(fields: [medicineId], references: [id], onDelete: SetNull)
  name              String
  batch             String?
  expiry            DateTime?       @db.Date
  quantity          Int

  @@unique([deliveryReceiptId, kind, lineNo])
  @@index([medicineId])
}

model SupplierPayment {
  id                   String              @id
  voucherNumber        String              @unique
  date                 DateTime            @db.Date
  purchaseId           String
  purchase             Purchase            @relation(fields: [purchaseId], references: [id], onDelete: Cascade)
  supplierId           String
  supplier             Supplier            @relation(fields: [supplierId], references: [id], onDelete: Restrict)
  supplierName         String
  amount               Decimal             @db.Decimal(14, 3)
  method               String
  bankAccountId        String
  bankAccount          BankAccount         @relation("SupplierPaymentAccount", fields: [bankAccountId], references: [id], onDelete: Restrict)
  bankAccountName      String
  notes                String?
  paidBy               String?
  createdById          String?
  createdBy            User?               @relation("SupplierPaymentCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt            DateTime
  totalPaidSoFar       Decimal?            @db.Decimal(14, 3)
  remainingBalance     Decimal?            @db.Decimal(14, 3)
  accountTransactionId String?             @unique
  accountTransaction   AccountTransaction? @relation("SupplierPaymentTransaction", fields: [accountTransactionId], references: [id], onDelete: SetNull)

  @@index([purchaseId])
  @@index([supplierId])
  @@index([bankAccountId])
}

model Expense {
  id                   String              @id
  expenseNumber        String              @unique
  date                 DateTime            @db.Date
  categoryName         String
  category             ExpenseCategory     @relation(fields: [categoryName], references: [name], onDelete: Restrict)
  amount               Decimal             @db.Decimal(14, 3)
  method               String
  paidFromAccountId    String
  paidFromAccount      BankAccount         @relation("ExpensePaidFromAccount", fields: [paidFromAccountId], references: [id], onDelete: Restrict)
  paidFromAccountName  String
  notes                String?
  attachmentName       String?
  source               String              @default("expense")
  createdById          String?
  createdBy            User?               @relation("ExpenseCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdByName        String?
  createdAt            DateTime
  accountTransactionId String?             @unique
  accountTransaction   AccountTransaction? @relation("ExpenseTransaction", fields: [accountTransactionId], references: [id], onDelete: SetNull)
  salaryPayment        SalaryPayment?

  @@index([categoryName])
  @@index([paidFromAccountId])
  @@index([date])
}

model SalaryPayment {
  id                  String      @id
  date                DateTime    @db.Date
  employeeName        String
  month               String
  baseSalary          Decimal     @db.Decimal(14, 3)
  deductions          Decimal     @db.Decimal(14, 3)
  bonuses             Decimal     @db.Decimal(14, 3)
  advances            Decimal     @db.Decimal(14, 3)
  netPaidAmount       Decimal     @db.Decimal(14, 3)
  method              String
  paidFromAccountId   String
  paidFromAccount     BankAccount @relation("SalaryPaidFromAccount", fields: [paidFromAccountId], references: [id], onDelete: Restrict)
  paidFromAccountName String
  notes               String?
  createdById         String?
  createdBy           User?       @relation("SalaryCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt           DateTime
  expenseId           String?     @unique
  expense             Expense?    @relation(fields: [expenseId], references: [id], onDelete: SetNull)

  @@index([paidFromAccountId])
  @@index([date])
  @@index([month])
}

model Withdrawal {
  id                   String              @id
  date                 DateTime            @db.Date
  type                 String
  amount               Decimal             @db.Decimal(14, 3)
  withdrawnBy          String
  accountId            String
  account              BankAccount         @relation("WithdrawalAccount", fields: [accountId], references: [id], onDelete: Restrict)
  accountName          String
  reason               String?
  notes                String?
  createdById          String?
  createdBy            User?               @relation("WithdrawalCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt            DateTime
  accountTransactionId String?             @unique
  accountTransaction   AccountTransaction? @relation("WithdrawalTransaction", fields: [accountTransactionId], references: [id], onDelete: SetNull)

  @@index([accountId])
  @@index([date])
}

model BankAccount {
  id                       String               @id
  name                     String
  type                     AccountType
  openingBalance           Decimal              @db.Decimal(14, 3)
  currentBalance           Decimal              @db.Decimal(14, 3)
  totalDeposits            Decimal              @db.Decimal(14, 3)
  totalWithdrawals         Decimal              @db.Decimal(14, 3)
  active                   Boolean              @default(true)
  createdAt                DateTime
  transactions             AccountTransaction[]
  customerPayments         CustomerPayment[]    @relation("CustomerPaymentAccount")
  supplierPayments         SupplierPayment[]    @relation("SupplierPaymentAccount")
  expenses                 Expense[]            @relation("ExpensePaidFromAccount")
  salaryPayments           SalaryPayment[]      @relation("SalaryPaidFromAccount")
  withdrawals              Withdrawal[]         @relation("WithdrawalAccount")
  outgoingInternalTransfers InternalTransfer[]  @relation("InternalTransferFromAccount")
  incomingInternalTransfers InternalTransfer[]  @relation("InternalTransferToAccount")
}

model AccountTransaction {
  id              String            @id
  accountId       String
  account         BankAccount       @relation(fields: [accountId], references: [id], onDelete: Restrict)
  accountName     String
  date            DateTime          @db.Date
  type            TransactionType
  source          String
  sourceId        String
  description     String
  amount          Decimal           @db.Decimal(14, 3)
  reversed        Boolean           @default(false)
  createdById     String?
  createdBy       User?             @relation("TransactionCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt       DateTime
  customerPayment CustomerPayment?  @relation("CustomerPaymentTransaction")
  supplierPayment SupplierPayment?  @relation("SupplierPaymentTransaction")
  expense         Expense?          @relation("ExpenseTransaction")
  withdrawal      Withdrawal?       @relation("WithdrawalTransaction")
  transferOut     InternalTransfer? @relation("InternalTransferOutTransaction")
  transferIn      InternalTransfer? @relation("InternalTransferInTransaction")

  @@index([accountId])
  @@index([source, sourceId])
  @@index([date])
}

model InternalTransfer {
  id               String              @id
  transferNumber   String              @unique
  date             DateTime            @db.Date
  fromAccountId    String
  fromAccount      BankAccount         @relation("InternalTransferFromAccount", fields: [fromAccountId], references: [id], onDelete: Restrict)
  fromAccountName  String
  toAccountId      String
  toAccount        BankAccount         @relation("InternalTransferToAccount", fields: [toAccountId], references: [id], onDelete: Restrict)
  toAccountName    String
  amount           Decimal             @db.Decimal(14, 3)
  notes            String?
  createdById      String?
  createdBy        User?               @relation("TransferCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt        DateTime
  outTransactionId String?             @unique
  outTransaction   AccountTransaction? @relation("InternalTransferOutTransaction", fields: [outTransactionId], references: [id], onDelete: SetNull)
  inTransactionId  String?             @unique
  inTransaction    AccountTransaction? @relation("InternalTransferInTransaction", fields: [inTransactionId], references: [id], onDelete: SetNull)

  @@index([fromAccountId])
  @@index([toAccountId])
  @@index([date])
}

model AuditLog {
  id       String   @id
  at       DateTime
  userId   String?
  user     User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  userName String?
  action   String
  detail   String?

  @@index([userId])
  @@index([at])
}

model ImportBatch {
  id           String   @id @default(cuid())
  sourceFile   String
  sha256       String   @unique
  importedAt   DateTime @default(now())
  recordCounts Json
  rawJson      Json
  notes        String?
}
```

### Notes on this schema

- IDs remain `String @id` so existing IDs like `usr-...`, `med-...`, `acct-cashbox`, and `sale-...` are preserved exactly.
- Monetary fields use `Decimal(14, 3)` because the current code rounds money to 3 decimals.
- Date-only JSON fields should become `DateTime @db.Date`.
- Existing denormalized display fields are kept so historical printable documents do not change if a customer, supplier, medicine, or account name changes later.
- `AccountTransaction.source/sourceId` remains polymorphic because the current JSON uses a polymorphic source pattern.
- `ImportBatch.rawJson` stores the original source file so no original JSON data is lost even if the normalized schema ignores frontend-only or derived fields.

## 10. ID Preservation Strategy

Preserve all existing top-level IDs exactly:

- `suppliers[].id`
- `customers[].id`
- `medicines[].id`
- `purchases[].id`
- `sales[].id`
- `customerPayments[].id`
- `deliveryReceipts[].id`
- `supplierPayments[].id`
- `expenses[].id`
- `salaryPayments[].id`
- `withdrawals[].id`
- `bankAccounts[].id`
- `accountTransactions[].id`
- `internalTransfers[].id`
- `users[].id`
- `auditLogs[].id`

For embedded arrays that do not currently have IDs:

- `sales[].items`
- `sales[].bonusItems`
- `deliveryReceipts[].items`
- `deliveryReceipts[].bonusItems`

Use deterministic generated IDs and preserve original order:

- Sale normal item: `${sale.id}:item:${lineNo}`
- Sale bonus item: `${sale.id}:bonus:${lineNo}`
- Delivery normal item: `${receipt.id}:item:${lineNo}`
- Delivery bonus item: `${receipt.id}:bonus:${lineNo}`

Also store:

- `lineNo`
- `kind` as `NORMAL` or `BONUS`

This makes repeat imports idempotent and preserves line ordering.

## 11. Counter/Number Preservation Strategy

Current counters live in `settings`:

- `nextInvoice`
- `nextDeliveryReceipt`
- `nextPaymentReceipt`
- `nextSupplierPayment`
- `nextExpense`
- `nextTransfer`

Migrate them into `NumberSequence` rows:

| JSON setting | `NumberSequence.key` |
| --- | --- |
| `nextInvoice` | `invoice` |
| `nextDeliveryReceipt` | `deliveryReceipt` |
| `nextPaymentReceipt` | `paymentReceipt` |
| `nextSupplierPayment` | `supplierPayment` |
| `nextExpense` | `expense` |
| `nextTransfer` | `transfer` |

Before final cutover, recompute each counter from existing document numbers and use the higher value between JSON settings and computed next values.

Examples:

- Existing max invoice `INV-1006` means `invoice.nextValue` must be at least `1007`.
- Existing max supplier payment `SPV-1002` means `supplierPayment.nextValue` must be at least `1003`.

In PostgreSQL, increments must happen inside a transaction to avoid duplicate invoice/receipt numbers under concurrent use.

## 12. Migration Risks

### 1. Current code rewrites the full JSON file

Every mutating request rewrites `data/database.json`. During migration, the app must be stopped or put into read-only mode, otherwise records can be created in JSON after the migration snapshot is taken.

### 2. One active user is missing credentials

Current `data/database.json` has one active admin user without `salt` and `passwordHash`. That user record can be preserved, but it cannot authenticate until credentials are restored or reset.

Recommended handling:

- Import the user record with nullable `salt` and `passwordHash`.
- Flag it in the migration report.
- Reset that user's password after cutover, or recover credentials from a trusted backup if available.

### 3. Backup files may be sanitized

The server export route returns full DB data for admins, but sanitized data for non-admin users. Sanitized user records can omit credential fields. A standalone importer must not assume every backup contains usable credentials.

### 4. Embedded sale and delivery items have no IDs

Line-item IDs must be generated deterministically from parent ID, kind, and line number.

### 5. Derived fields can drift

The JSON stores derived values:

- sale totals
- sale payment status
- purchase paid/remaining balances
- bank account current balance
- transaction totals

The importer should preserve stored values, then run validation calculations and report differences. Do not silently rewrite historical financial values during import unless approved.

### 6. Stock is mutated by business operations

Purchases increase stock. Sales decrease stock. Sale deletion restores stock. Import should preserve current `medicines[].stock` from JSON and separately validate expected stock movement.

### 7. Account transactions use polymorphic source IDs

`accountTransactions[].sourceId` points to different entity tables depending on `source`. PostgreSQL cannot enforce this as a simple foreign key. Preserve `source` and `sourceId`, add indexes, and validate in application/import code.

### 8. Date handling

The JSON mixes:

- ISO timestamps such as `createdAt`
- date-only strings such as `date`, `expiry`, `productionDate`

Use `DateTime @db.Date` for date-only fields and parse them as UTC-safe dates to avoid timezone shifts.

### 9. Money precision

The code uses `roundMoney` with 3 decimal places. Use PostgreSQL `numeric(14,3)` through Prisma `Decimal @db.Decimal(14, 3)`.

### 10. Legacy backup shapes differ

`database.backup-before-accounting-v2.json` lacks many accounting arrays. The current `migrateDatabase` function fills missing arrays/defaults. The importer should implement the same normalization logic.

### 11. Do not import archive snapshots by default

The `.zip` files contain older JSON snapshots. Importing them in addition to the active database would create duplicate historical records or conflicting IDs. Treat them as recovery/reference material only.

## 13. Import Plan Without Losing Records

### Phase 1: Freeze and snapshot

1. Stop the ERP server.
2. Copy `data/database.json` to a timestamped external backup.
3. Copy `data/database.backup-before-accounting-v2.json` and `data/database.backup-before-branding.json` to the same backup folder.
4. Record SHA-256 checksums for every JSON source file.
5. Do not delete or overwrite any JSON file.

### Phase 2: Build PostgreSQL/Prisma foundation

1. Add Prisma dependencies and configuration only after this plan is approved.
2. Create `prisma/schema.prisma` from the approved schema.
3. Create the PostgreSQL database.
4. Run `prisma migrate dev` or `prisma migrate deploy`, depending on environment.
5. Confirm empty table counts.

### Phase 3: Build a dry-run importer

The importer should:

1. Read `data/database.json`.
2. Deep-clone the data.
3. Apply the same normalization rules as `migrateDatabase`:
   - fill missing arrays
   - fill default settings/modules
   - normalize feature visibility
   - normalize medicine numeric/date fields
   - normalize sale items/bonus items
   - normalize payment statuses
   - normalize bank accounts
   - recalculate account balances for validation
4. Validate required relationships.
5. Generate deterministic line-item IDs.
6. Produce a report without writing to PostgreSQL.

Dry-run report must include:

- source file checksum
- record counts by entity
- duplicate IDs
- broken references
- users missing credentials
- counter values from settings
- counter values recomputed from document numbers
- derived balance/status mismatches

### Phase 4: Transactional import order

Run the import inside a single database transaction where practical.

Recommended order:

1. `ImportBatch`
   - Store source filename, checksum, record counts, and full raw JSON.
2. `CompanySettings`
3. `NumberSequence`
4. `ModuleSetting`
5. `HiddenFeature`
6. `ExpenseCategory`
7. `User`
8. `Supplier`
9. `Customer`
10. `BankAccount`
11. `Medicine`
12. `Purchase`
13. `Sale`
14. `SaleItem`
15. `AccountTransaction`
16. `CustomerPayment`
17. `SupplierPayment`
18. `DeliveryReceipt`
19. `DeliveryReceiptItem`
20. `Expense`
21. `SalaryPayment`
22. `Withdrawal`
23. `InternalTransfer`
24. `AuditLog`

If a relation is missing in a future backup, the importer should stop and report it rather than dropping records. If the business decides to import a damaged backup anyway, create explicit placeholder records or relax that specific foreign key only with approval.

### Phase 5: Post-import validation

After import, verify:

1. Row counts match JSON counts.
2. Every preserved top-level ID exists in PostgreSQL.
3. Every sale item and delivery item count matches parent JSON arrays.
4. No required foreign key is missing.
5. No duplicate document numbers exist:
   - `Sale.invoiceNumber`
   - `CustomerPayment.receiptNumber`
   - `SupplierPayment.voucherNumber`
   - `DeliveryReceipt.receiptNumber`
   - `Expense.expenseNumber`
   - `InternalTransfer.transferNumber`
6. Bank account balances match JSON.
7. Purchase balances/statuses match JSON.
8. Sale balances/statuses match JSON.
9. Audit log count matches JSON.
10. Users missing credentials are listed for password reset.

### Phase 6: Application cutover

Only after validation:

1. Replace JSON read/write code with Prisma repository/service functions.
2. Keep API response shapes compatible with the existing frontend.
3. Keep `/api/export` available, but have it export from PostgreSQL in the same JSON shape for backward compatibility.
4. Keep `/api/import` disabled or admin-only behind a safer PostgreSQL import path.
5. Make all multi-step business operations transactional:
   - purchase plus stock update plus supplier payment
   - sale plus stock deduction plus customer payment
   - sale update plus stock restore/deduct plus document sync
   - payment plus account transaction
   - expense/salary/withdrawal plus account transaction
   - internal transfer plus two account transactions
6. Use database transactions for document counters.

### Phase 7: Rollback plan

Before production use:

1. Keep the original JSON files unchanged.
2. Keep the PostgreSQL dump from immediately after import.
3. If cutover fails, stop the Prisma-backed server and restart the old JSON-backed server against the untouched `data/database.json`.
4. Do not allow both JSON-backed and PostgreSQL-backed servers to accept writes at the same time.

## 14. Code Areas To Change After Approval

Do not change these yet. They are the migration implementation targets.

### Backend

- Replace `loadDatabase` and `saveDatabase` in `server.js:636-658`.
- Replace direct `db.*` reads/writes in API handlers with Prisma calls.
- Replace `migrateDatabase` with a one-time importer plus lightweight runtime defaults.
- Move multi-record operations into Prisma transactions.
- Keep `readJsonBody` and `sendJson`; HTTP request/response JSON remains valid.

### Frontend

The frontend can mostly stay unchanged if backend responses keep the current JSON shape.

Potential frontend changes:

- Adjust import/export messaging if PostgreSQL import is made a separate admin workflow.
- Decide whether `localStorage` profile images should remain local or move to a user profile field/table.

### Data migration scripts

Add scripts only after approval:

- `scripts/analyze-json-db.js`
- `scripts/import-json-to-postgres.js`
- `scripts/validate-postgres-import.js`

## 15. Recommended Acceptance Criteria

The migration is complete only when:

1. PostgreSQL row counts match `data/database.json`.
2. Every existing top-level ID is preserved exactly.
3. Every embedded sale/delivery line is imported with deterministic ID and original order.
4. All current relationships validate.
5. Document counters continue from the correct next number.
6. Login works for users with valid credentials.
7. Users missing credentials are documented and reset intentionally.
8. Existing reports, invoices, receipts, delivery documents, accounting dashboard, and audit log render correctly from PostgreSQL.
9. JSON export from PostgreSQL matches the legacy backup shape closely enough to be re-imported or archived.
10. Original JSON files remain untouched until the owner explicitly approves removal or archival.

