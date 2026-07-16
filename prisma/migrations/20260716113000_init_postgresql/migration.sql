-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Admin', 'Manager', 'Pharmacist', 'Sales', 'Accountant');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Active', 'Suspended');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Unpaid', 'Partially Paid', 'Paid');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('Ready', 'Scheduled', 'Delivered');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Cashbox', 'Bank');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('deposit', 'withdrawal');

-- CreateEnum
CREATE TYPE "SaleItemKind" AS ENUM ('NORMAL', 'BONUS');

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "schemaVersion" INTEGER NOT NULL DEFAULT 2,
    "companyName" TEXT NOT NULL,
    "companySubtitle" TEXT,
    "companyDetails" TEXT,
    "companyPhone" TEXT,
    "companyPhoneAlt" TEXT,
    "companyEmail" TEXT,
    "companyAddress" TEXT,
    "companyAddressArabic" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'LYD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberSequence" (
    "key" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ModuleSetting" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ModuleSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "HiddenFeature" (
    "role" "UserRole" NOT NULL,
    "featureKey" TEXT NOT NULL,

    CONSTRAINT "HiddenFeature_pkey" PRIMARY KEY ("role","featureKey")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Supplier',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Customer',
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "productionDate" DATE,
    "supplierId" TEXT NOT NULL,
    "location" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(14,3) NOT NULL,
    "price" DECIMAL(14,3) NOT NULL,
    "expiry" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'Active',
    "salt" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "invoiceNumber" TEXT,
    "date" DATE NOT NULL,
    "supplierId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(14,3) NOT NULL,
    "total" DECIMAL(14,3) NOT NULL,
    "paidAmount" DECIMAL(14,3) NOT NULL,
    "remainingBalance" DECIMAL(14,3) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "invoiceNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "total" DECIMAL(14,3) NOT NULL,
    "totalPaid" DECIMAL(14,3) NOT NULL,
    "remainingBalance" DECIMAL(14,3) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "kind" "SaleItemKind" NOT NULL,
    "medicineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "batch" TEXT,
    "productionDate" DATE,
    "expiry" DATE,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,3) NOT NULL,
    "lineTotal" DECIMAL(14,3) NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPayment" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "receiptNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "saleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceTotal" DECIMAL(14,3) NOT NULL,
    "amount" DECIMAL(14,3) NOT NULL,
    "method" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "notes" TEXT,
    "receivedBy" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "totalPaidSoFar" DECIMAL(14,3),
    "remainingBalance" DECIMAL(14,3),
    "accountTransactionId" TEXT,

    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryReceipt" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "receiptNumber" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerType" TEXT,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "deliveryPerson" TEXT,
    "notes" TEXT,
    "total" DECIMAL(14,3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryReceiptItem" (
    "id" TEXT NOT NULL,
    "deliveryReceiptId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "kind" "SaleItemKind" NOT NULL,
    "medicineId" TEXT,
    "name" TEXT NOT NULL,
    "batch" TEXT,
    "expiry" DATE,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "DeliveryReceiptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "voucherNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "amount" DECIMAL(14,3) NOT NULL,
    "method" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "bankAccountName" TEXT NOT NULL,
    "notes" TEXT,
    "paidBy" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "totalPaidSoFar" DECIMAL(14,3),
    "remainingBalance" DECIMAL(14,3),
    "accountTransactionId" TEXT,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "expenseNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "categoryName" TEXT NOT NULL,
    "amount" DECIMAL(14,3) NOT NULL,
    "method" TEXT NOT NULL,
    "paidFromAccountId" TEXT NOT NULL,
    "paidFromAccountName" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'expense',
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "accountTransactionId" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryPayment" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "employeeName" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "baseSalary" DECIMAL(14,3) NOT NULL,
    "deductions" DECIMAL(14,3) NOT NULL,
    "bonuses" DECIMAL(14,3) NOT NULL,
    "advances" DECIMAL(14,3) NOT NULL,
    "netPaidAmount" DECIMAL(14,3) NOT NULL,
    "method" TEXT NOT NULL,
    "paidFromAccountId" TEXT NOT NULL,
    "paidFromAccountName" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expenseId" TEXT,

    CONSTRAINT "SalaryPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,3) NOT NULL,
    "withdrawnBy" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "accountTransactionId" TEXT,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "openingBalance" DECIMAL(14,3) NOT NULL,
    "currentBalance" DECIMAL(14,3) NOT NULL,
    "totalDeposits" DECIMAL(14,3) NOT NULL,
    "totalWithdrawals" DECIMAL(14,3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransaction" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "TransactionType" NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,3) NOT NULL,
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalTransfer" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "transferNumber" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "fromAccountName" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "toAccountName" TEXT NOT NULL,
    "amount" DECIMAL(14,3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "outTransactionId" TEXT,
    "inTransactionId" TEXT,

    CONSTRAINT "InternalTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "at" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JsonBackupSnapshot" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "recordCounts" JSONB NOT NULL,
    "rawJson" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JsonBackupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordCounts" JSONB NOT NULL,
    "rawJson" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationState" (
    "key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "value" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MigrationState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Medicine_supplierId_idx" ON "Medicine"("supplierId");

-- CreateIndex
CREATE INDEX "Medicine_sku_idx" ON "Medicine"("sku");

-- CreateIndex
CREATE INDEX "Medicine_batch_idx" ON "Medicine"("batch");

-- CreateIndex
CREATE INDEX "Medicine_expiry_idx" ON "Medicine"("expiry");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Purchase_supplierId_idx" ON "Purchase"("supplierId");

-- CreateIndex
CREATE INDEX "Purchase_medicineId_idx" ON "Purchase"("medicineId");

-- CreateIndex
CREATE INDEX "Purchase_date_idx" ON "Purchase"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE INDEX "Sale_date_idx" ON "Sale"("date");

-- CreateIndex
CREATE INDEX "SaleItem_medicineId_idx" ON "SaleItem"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleItem_saleId_kind_lineNo_key" ON "SaleItem"("saleId", "kind", "lineNo");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPayment_receiptNumber_key" ON "CustomerPayment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPayment_accountTransactionId_key" ON "CustomerPayment"("accountTransactionId");

-- CreateIndex
CREATE INDEX "CustomerPayment_saleId_idx" ON "CustomerPayment"("saleId");

-- CreateIndex
CREATE INDEX "CustomerPayment_customerId_idx" ON "CustomerPayment"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPayment_bankAccountId_idx" ON "CustomerPayment"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryReceipt_receiptNumber_key" ON "DeliveryReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "DeliveryReceipt_saleId_idx" ON "DeliveryReceipt"("saleId");

-- CreateIndex
CREATE INDEX "DeliveryReceipt_customerId_idx" ON "DeliveryReceipt"("customerId");

-- CreateIndex
CREATE INDEX "DeliveryReceiptItem_medicineId_idx" ON "DeliveryReceiptItem"("medicineId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryReceiptItem_deliveryReceiptId_kind_lineNo_key" ON "DeliveryReceiptItem"("deliveryReceiptId", "kind", "lineNo");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_voucherNumber_key" ON "SupplierPayment"("voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_accountTransactionId_key" ON "SupplierPayment"("accountTransactionId");

-- CreateIndex
CREATE INDEX "SupplierPayment_purchaseId_idx" ON "SupplierPayment"("purchaseId");

-- CreateIndex
CREATE INDEX "SupplierPayment_supplierId_idx" ON "SupplierPayment"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPayment_bankAccountId_idx" ON "SupplierPayment"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_expenseNumber_key" ON "Expense"("expenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_accountTransactionId_key" ON "Expense"("accountTransactionId");

-- CreateIndex
CREATE INDEX "Expense_categoryName_idx" ON "Expense"("categoryName");

-- CreateIndex
CREATE INDEX "Expense_paidFromAccountId_idx" ON "Expense"("paidFromAccountId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryPayment_expenseId_key" ON "SalaryPayment"("expenseId");

-- CreateIndex
CREATE INDEX "SalaryPayment_paidFromAccountId_idx" ON "SalaryPayment"("paidFromAccountId");

-- CreateIndex
CREATE INDEX "SalaryPayment_date_idx" ON "SalaryPayment"("date");

-- CreateIndex
CREATE INDEX "SalaryPayment_month_idx" ON "SalaryPayment"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Withdrawal_accountTransactionId_key" ON "Withdrawal"("accountTransactionId");

-- CreateIndex
CREATE INDEX "Withdrawal_accountId_idx" ON "Withdrawal"("accountId");

-- CreateIndex
CREATE INDEX "Withdrawal_date_idx" ON "Withdrawal"("date");

-- CreateIndex
CREATE INDEX "AccountTransaction_accountId_idx" ON "AccountTransaction"("accountId");

-- CreateIndex
CREATE INDEX "AccountTransaction_source_sourceId_idx" ON "AccountTransaction"("source", "sourceId");

-- CreateIndex
CREATE INDEX "AccountTransaction_date_idx" ON "AccountTransaction"("date");

-- CreateIndex
CREATE UNIQUE INDEX "InternalTransfer_transferNumber_key" ON "InternalTransfer"("transferNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InternalTransfer_outTransactionId_key" ON "InternalTransfer"("outTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalTransfer_inTransactionId_key" ON "InternalTransfer"("inTransactionId");

-- CreateIndex
CREATE INDEX "InternalTransfer_fromAccountId_idx" ON "InternalTransfer"("fromAccountId");

-- CreateIndex
CREATE INDEX "InternalTransfer_toAccountId_idx" ON "InternalTransfer"("toAccountId");

-- CreateIndex
CREATE INDEX "InternalTransfer_date_idx" ON "InternalTransfer"("date");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE UNIQUE INDEX "JsonBackupSnapshot_sourcePath_key" ON "JsonBackupSnapshot"("sourcePath");

-- CreateIndex
CREATE UNIQUE INDEX "JsonBackupSnapshot_sha256_key" ON "JsonBackupSnapshot"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_sha256_key" ON "ImportBatch"("sha256");

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_accountTransactionId_fkey" FOREIGN KEY ("accountTransactionId") REFERENCES "AccountTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReceipt" ADD CONSTRAINT "DeliveryReceipt_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReceipt" ADD CONSTRAINT "DeliveryReceipt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReceiptItem" ADD CONSTRAINT "DeliveryReceiptItem_deliveryReceiptId_fkey" FOREIGN KEY ("deliveryReceiptId") REFERENCES "DeliveryReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReceiptItem" ADD CONSTRAINT "DeliveryReceiptItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_accountTransactionId_fkey" FOREIGN KEY ("accountTransactionId") REFERENCES "AccountTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryName_fkey" FOREIGN KEY ("categoryName") REFERENCES "ExpenseCategory"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidFromAccountId_fkey" FOREIGN KEY ("paidFromAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountTransactionId_fkey" FOREIGN KEY ("accountTransactionId") REFERENCES "AccountTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_paidFromAccountId_fkey" FOREIGN KEY ("paidFromAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPayment" ADD CONSTRAINT "SalaryPayment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_accountTransactionId_fkey" FOREIGN KEY ("accountTransactionId") REFERENCES "AccountTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_outTransactionId_fkey" FOREIGN KEY ("outTransactionId") REFERENCES "AccountTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTransfer" ADD CONSTRAINT "InternalTransfer_inTransactionId_fkey" FOREIGN KEY ("inTransactionId") REFERENCES "AccountTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

