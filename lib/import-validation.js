const fs = require("node:fs");
const path = require("node:path");
const { cloneJson, normalizeDatabase, countJsonRecords } = require("./json-normalize");

const DATA_ARRAY_KEYS = [
  "suppliers",
  "customers",
  "medicines",
  "purchases",
  "sales",
  "customerPayments",
  "deliveryReceipts",
  "supplierPayments",
  "expenseCategories",
  "expenses",
  "salaryPayments",
  "withdrawals",
  "bankAccounts",
  "accountTransactions",
  "internalTransfers",
  "users",
  "auditLogs",
];

async function validatePostgresAgainstJson(prisma, jsonPath = path.join(process.cwd(), "data", "database.json")) {
  const source = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const db = normalizeDatabase(cloneJson(source));
  const expected = expectedCounts(db);
  const actual = await postgresCounts(prisma);
  const mismatches = compareCounts(expected, actual);
  const referenceErrors = validateReferences(db);
  const duplicateIds = findDuplicateTopLevelIds(db);
  const usersMissingCredentials = db.users
    .filter((user) => !user.salt || !user.passwordHash)
    .map((user) => ({ id: user.id, email: user.email, role: user.role, status: user.status }));

  return {
    ok: mismatches.length === 0 && referenceErrors.length === 0 && duplicateIds.length === 0,
    expected,
    actual,
    mismatches,
    referenceErrors,
    duplicateIds,
    usersMissingCredentials,
  };
}

async function validateJsonSnapshots(prisma, dataDir = path.join(process.cwd(), "data")) {
  const jsonFiles = fs.readdirSync(dataDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => path.join(dataDir, file));
  const snapshots = await prisma.jsonBackupSnapshot.findMany();
  const byPath = new Map(snapshots.map((snapshot) => [snapshot.sourcePath, snapshot]));
  const results = [];

  for (const filePath of jsonFiles) {
    const relativePath = path.relative(process.cwd(), filePath);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const expected = countJsonRecords(raw);
    const snapshot = byPath.get(relativePath);
    if (!snapshot) {
      results.push({ sourcePath: relativePath, ok: false, error: "Missing JsonBackupSnapshot row" });
      continue;
    }
    const mismatches = compareCounts(expected, snapshot.recordCounts || {});
    results.push({ sourcePath: relativePath, ok: mismatches.length === 0, mismatches });
  }

  return {
    ok: results.every((item) => item.ok) && snapshots.length >= jsonFiles.length,
    expectedSnapshotCount: jsonFiles.length,
    actualSnapshotCount: snapshots.length,
    results,
  };
}

function expectedCounts(db) {
  const counts = countJsonRecords(db);
  return {
    companySettings: 1,
    numberSequences: 6,
    moduleSettings: counts.moduleSettings,
    hiddenFeatures: counts.hiddenFeatures,
    expenseCategories: counts.expenseCategories,
    users: counts.users,
    suppliers: counts.suppliers,
    customers: counts.customers,
    bankAccounts: counts.bankAccounts,
    medicines: counts.medicines,
    purchases: counts.purchases,
    sales: counts.sales,
    saleItems: counts.saleItems + counts.saleBonusItems,
    accountTransactions: counts.accountTransactions,
    customerPayments: counts.customerPayments,
    supplierPayments: counts.supplierPayments,
    deliveryReceipts: counts.deliveryReceipts,
    deliveryReceiptItems: counts.deliveryReceiptItems + counts.deliveryReceiptBonusItems,
    expenses: counts.expenses,
    salaryPayments: counts.salaryPayments,
    withdrawals: counts.withdrawals,
    internalTransfers: counts.internalTransfers,
    auditLogs: counts.auditLogs,
  };
}

async function postgresCounts(prisma) {
  const [
    companySettings,
    numberSequences,
    moduleSettings,
    hiddenFeatures,
    expenseCategories,
    users,
    suppliers,
    customers,
    bankAccounts,
    medicines,
    purchases,
    sales,
    saleItems,
    accountTransactions,
    customerPayments,
    supplierPayments,
    deliveryReceipts,
    deliveryReceiptItems,
    expenses,
    salaryPayments,
    withdrawals,
    internalTransfers,
    auditLogs,
  ] = await Promise.all([
    prisma.companySettings.count(),
    prisma.numberSequence.count(),
    prisma.moduleSetting.count(),
    prisma.hiddenFeature.count(),
    prisma.expenseCategory.count(),
    prisma.user.count(),
    prisma.supplier.count(),
    prisma.customer.count(),
    prisma.bankAccount.count(),
    prisma.medicine.count(),
    prisma.purchase.count(),
    prisma.sale.count(),
    prisma.saleItem.count(),
    prisma.accountTransaction.count(),
    prisma.customerPayment.count(),
    prisma.supplierPayment.count(),
    prisma.deliveryReceipt.count(),
    prisma.deliveryReceiptItem.count(),
    prisma.expense.count(),
    prisma.salaryPayment.count(),
    prisma.withdrawal.count(),
    prisma.internalTransfer.count(),
    prisma.auditLog.count(),
  ]);

  return {
    companySettings,
    numberSequences,
    moduleSettings,
    hiddenFeatures,
    expenseCategories,
    users,
    suppliers,
    customers,
    bankAccounts,
    medicines,
    purchases,
    sales,
    saleItems,
    accountTransactions,
    customerPayments,
    supplierPayments,
    deliveryReceipts,
    deliveryReceiptItems,
    expenses,
    salaryPayments,
    withdrawals,
    internalTransfers,
    auditLogs,
  };
}

function compareCounts(expected, actual) {
  return Object.keys(expected)
    .filter((key) => Number(expected[key] || 0) !== Number(actual[key] || 0))
    .map((key) => ({ key, expected: Number(expected[key] || 0), actual: Number(actual[key] || 0) }));
}

function validateReferences(db) {
  const errors = [];
  const has = (key, id) => !id || (db[key] || []).some((item) => item.id === id);
  const assertRef = (label, ownerId, targetKey, targetId) => {
    if (!has(targetKey, targetId)) errors.push({ label, ownerId, targetKey, targetId });
  };

  for (const medicine of db.medicines) assertRef("medicine.supplierId", medicine.id, "suppliers", medicine.supplierId);
  for (const purchase of db.purchases) {
    assertRef("purchase.supplierId", purchase.id, "suppliers", purchase.supplierId);
    assertRef("purchase.medicineId", purchase.id, "medicines", purchase.medicineId);
    assertRef("purchase.createdBy", purchase.id, "users", purchase.createdBy);
  }
  for (const sale of db.sales) {
    assertRef("sale.customerId", sale.id, "customers", sale.customerId);
    assertRef("sale.createdBy", sale.id, "users", sale.createdBy);
    for (const item of [...(sale.items || []), ...(sale.bonusItems || [])]) {
      assertRef("sale.item.medicineId", sale.id, "medicines", item.medicineId);
    }
  }
  for (const payment of db.customerPayments) {
    assertRef("customerPayment.saleId", payment.id, "sales", payment.saleId);
    assertRef("customerPayment.customerId", payment.id, "customers", payment.customerId);
    assertRef("customerPayment.bankAccountId", payment.id, "bankAccounts", payment.bankAccountId);
    assertRef("customerPayment.accountTransactionId", payment.id, "accountTransactions", payment.accountTransactionId);
  }
  for (const receipt of db.deliveryReceipts) {
    assertRef("deliveryReceipt.saleId", receipt.id, "sales", receipt.saleId);
    assertRef("deliveryReceipt.customerId", receipt.id, "customers", receipt.customerId);
  }
  for (const payment of db.supplierPayments) {
    assertRef("supplierPayment.purchaseId", payment.id, "purchases", payment.purchaseId);
    assertRef("supplierPayment.supplierId", payment.id, "suppliers", payment.supplierId);
    assertRef("supplierPayment.bankAccountId", payment.id, "bankAccounts", payment.bankAccountId);
    assertRef("supplierPayment.accountTransactionId", payment.id, "accountTransactions", payment.accountTransactionId);
  }
  for (const expense of db.expenses) {
    assertRef("expense.paidFromAccountId", expense.id, "bankAccounts", expense.paidFromAccountId);
    assertRef("expense.accountTransactionId", expense.id, "accountTransactions", expense.accountTransactionId);
    assertRef("expense.createdBy", expense.id, "users", expense.createdBy);
  }
  for (const salary of db.salaryPayments) {
    assertRef("salary.expenseId", salary.id, "expenses", salary.expenseId);
    assertRef("salary.paidFromAccountId", salary.id, "bankAccounts", salary.paidFromAccountId);
    assertRef("salary.createdBy", salary.id, "users", salary.createdBy);
  }
  for (const withdrawal of db.withdrawals) {
    assertRef("withdrawal.accountId", withdrawal.id, "bankAccounts", withdrawal.accountId);
    assertRef("withdrawal.accountTransactionId", withdrawal.id, "accountTransactions", withdrawal.accountTransactionId);
  }
  for (const transfer of db.internalTransfers) {
    assertRef("transfer.fromAccountId", transfer.id, "bankAccounts", transfer.fromAccountId);
    assertRef("transfer.toAccountId", transfer.id, "bankAccounts", transfer.toAccountId);
    assertRef("transfer.outTransactionId", transfer.id, "accountTransactions", transfer.outTransactionId);
    assertRef("transfer.inTransactionId", transfer.id, "accountTransactions", transfer.inTransactionId);
  }
  for (const transaction of db.accountTransactions) {
    assertRef("accountTransaction.accountId", transaction.id, "bankAccounts", transaction.accountId);
    assertRef("accountTransaction.createdBy", transaction.id, "users", transaction.createdBy);
  }

  return errors;
}

function findDuplicateTopLevelIds(db) {
  const seen = new Map();
  for (const key of DATA_ARRAY_KEYS) {
    for (const item of db[key] || []) {
      if (!item || !item.id) continue;
      if (!seen.has(item.id)) seen.set(item.id, []);
      seen.get(item.id).push(key);
    }
  }
  return [...seen.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([id, owners]) => ({ id, owners }));
}

module.exports = {
  validatePostgresAgainstJson,
  validateJsonSnapshots,
  expectedCounts,
  postgresCounts,
  compareCounts,
  validateReferences,
  findDuplicateTopLevelIds,
};
