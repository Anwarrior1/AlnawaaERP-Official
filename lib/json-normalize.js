const CURRENT_SCHEMA_VERSION = 2;

const permissionsByRole = {
  Admin: ["all"],
  Manager: [
    "inventory",
    "sales",
    "purchases",
    "reports",
    "partners",
    "viewAccounting",
    "viewExpenses",
    "viewBankAccounts",
    "createPaymentReceipts",
    "printPaymentReceipts",
    "viewFinancialDashboard",
    "viewProfitReports",
  ],
  Pharmacist: ["inventory", "sales", "reports", "printPaymentReceipts"],
  Sales: ["sales", "partners", "createPaymentReceipts", "printPaymentReceipts"],
  Accountant: [
    "reports",
    "payments",
    "purchases",
    "viewAccounting",
    "manageAccounting",
    "viewExpenses",
    "manageExpenses",
    "viewBankAccounts",
    "manageBankAccounts",
    "createPaymentReceipts",
    "printPaymentReceipts",
    "viewFinancialDashboard",
    "viewProfitReports",
  ],
};

const featureCatalog = [
  { key: "dashboard", label: "Dashboard", permissions: [] },
  { key: "inventory", label: "Inventory", permissions: ["inventory"] },
  { key: "sales", label: "Sales", permissions: ["sales"] },
  { key: "invoices", label: "Invoices", permissions: ["sales", "createPaymentReceipts", "printPaymentReceipts"] },
  { key: "purchases", label: "Purchases", permissions: ["purchases"] },
  { key: "suppliers", label: "Suppliers", permissions: ["partners", "purchases"] },
  { key: "customers", label: "Customers", permissions: ["partners", "sales"] },
  { key: "users", label: "Users", permissions: ["all"] },
  { key: "reports", label: "Reports", permissions: ["reports", "viewProfitReports"] },
  { key: "accounting", label: "Accounting", permissions: ["viewAccounting", "manageAccounting", "viewFinancialDashboard"] },
  { key: "expenses", label: "Expenses", permissions: ["viewExpenses", "manageExpenses"] },
  { key: "payroll", label: "Payroll", permissions: ["viewExpenses", "manageExpenses"] },
  { key: "banking", label: "Banking", permissions: ["viewBankAccounts", "manageBankAccounts"] },
  { key: "settings", label: "Settings", permissions: ["all"] },
];

const featureKeys = featureCatalog.map((feature) => feature.key);

const expenseCategories = [
  "Office rent",
  "Worker housing rent",
  "Salaries",
  "Petty cash",
  "Fuel",
  "Delivery expenses",
  "Utilities",
  "Maintenance",
  "Other expenses",
];

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeDatabase(source) {
  const dbToMigrate = source || {};
  dbToMigrate.settings = {
    schemaVersion: 1,
    companyName: "alnawaa",
    companySubtitle: "مجموعة النوى الطبية",
    companyDetails: "Tripoli - Ben Ashour Street",
    companyPhone: "+218 091 069 3900",
    companyPhoneAlt: "+218 092 069 3900",
    companyEmail: "INFO@ALNAWAA.COM",
    companyAddress: "Tripoli - Ben Ashour Street",
    companyAddressArabic: "طرابلس - شارع بن عاشور",
    currency: "LYD",
    nextInvoice: 1001,
    nextDeliveryReceipt: 1001,
    nextPaymentReceipt: 1001,
    nextSupplierPayment: 1001,
    nextExpense: 1001,
    nextTransfer: 1001,
    ...dbToMigrate.settings,
  };
  dbToMigrate.modules = {
    barcode: true,
    payments: true,
    delivery: true,
    accounting: true,
    ...(dbToMigrate.modules || {}),
  };
  dbToMigrate.featureVisibility = normalizeFeatureVisibility(dbToMigrate.featureVisibility);

  for (const key of [
    "suppliers",
    "customers",
    "medicines",
    "purchases",
    "sales",
    "users",
    "auditLogs",
    "customerPayments",
    "deliveryReceipts",
    "supplierPayments",
    "expenses",
    "salaryPayments",
    "withdrawals",
    "bankAccounts",
    "accountTransactions",
    "internalTransfers",
  ]) {
    if (!Array.isArray(dbToMigrate[key])) dbToMigrate[key] = [];
  }
  if (!Array.isArray(dbToMigrate.expenseCategories) || !dbToMigrate.expenseCategories.length) {
    dbToMigrate.expenseCategories = [...expenseCategories];
  }
  if (!dbToMigrate.bankAccounts.length) {
    dbToMigrate.bankAccounts = defaultAccounts(new Date().toISOString());
  }

  for (const partner of [...dbToMigrate.suppliers, ...dbToMigrate.customers]) {
    partner.type = partner.type || (dbToMigrate.suppliers.includes(partner) ? "Supplier" : "Customer");
    partner.email = partner.email || "";
    partner.address = partner.address || "";
    partner.createdAt = partner.createdAt || new Date().toISOString();
  }

  for (const medicine of dbToMigrate.medicines) {
    medicine.productionDate = medicine.productionDate || "";
    medicine.expiry = medicine.expiry || "";
    medicine.stock = nonNegativeNumber(medicine.stock);
    medicine.reorderLevel = nonNegativeNumber(medicine.reorderLevel);
    medicine.cost = moneyNumber(medicine.cost) ?? 0;
    medicine.price = moneyNumber(medicine.price) ?? 0;
    medicine.createdAt = medicine.createdAt || new Date().toISOString();
  }

  for (const purchase of dbToMigrate.purchases) {
    purchase.quantity = positiveNumber(purchase.quantity);
    purchase.unitCost = moneyNumber(purchase.unitCost) ?? 0;
    purchase.total = moneyNumber(purchase.total) ?? roundMoney((purchase.quantity || 0) * (purchase.unitCost || 0));
    purchase.paidAmount = moneyNumber(purchase.paidAmount) ?? 0;
    purchase.remainingBalance = roundMoney(Math.max(purchase.total - purchase.paidAmount, 0));
    purchase.paymentStatus = purchase.remainingBalance <= 0 ? "Paid" : purchase.paidAmount > 0 ? "Partially Paid" : "Unpaid";
    purchase.date = purchase.date || dateOnly();
    purchase.createdAt = purchase.createdAt || new Date().toISOString();
  }

  for (const sale of dbToMigrate.sales) {
    const existingItems = Array.isArray(sale.items) ? sale.items : [];
    sale.items = existingItems.length ? existingItems : saleItemsFromLegacySale(sale, dbToMigrate);
    for (const item of sale.items) normalizeSaleItem(item, dbToMigrate, false);
    sale.bonusItems = Array.isArray(sale.bonusItems) ? sale.bonusItems : [];
    for (const item of sale.bonusItems) normalizeSaleItem(item, dbToMigrate, true);
    sale.total = roundMoney(sale.items.reduce((sum, item) => sum + item.lineTotal, 0));
    sale.paymentReceiptIds = Array.isArray(sale.paymentReceiptIds) ? sale.paymentReceiptIds : [];
    sale.deliveryReceiptIds = Array.isArray(sale.deliveryReceiptIds) ? sale.deliveryReceiptIds : [];
    sale.date = sale.date || dateOnly();
    sale.deliveryStatus = ["Ready", "Scheduled", "Delivered"].includes(sale.deliveryStatus) ? sale.deliveryStatus : "Ready";
    sale.createdAt = sale.createdAt || new Date().toISOString();
    recalculateSalePaymentStatus(sale, dbToMigrate);
  }

  for (const receipt of dbToMigrate.deliveryReceipts) {
    receipt.items = Array.isArray(receipt.items) ? receipt.items : [];
    receipt.bonusItems = Array.isArray(receipt.bonusItems) ? receipt.bonusItems : [];
    receipt.date = receipt.date || dateOnly();
    receipt.createdAt = receipt.createdAt || new Date().toISOString();
  }

  for (const payment of dbToMigrate.customerPayments) {
    payment.date = payment.date || dateOnly();
    payment.amount = moneyNumber(payment.amount) ?? 0;
    payment.invoiceTotal = moneyNumber(payment.invoiceTotal) ?? 0;
    payment.totalPaidSoFar = moneyNumber(payment.totalPaidSoFar);
    payment.remainingBalance = moneyNumber(payment.remainingBalance);
    payment.createdAt = payment.createdAt || new Date().toISOString();
  }

  for (const payment of dbToMigrate.supplierPayments) {
    payment.date = payment.date || dateOnly();
    payment.amount = moneyNumber(payment.amount) ?? 0;
    payment.totalPaidSoFar = moneyNumber(payment.totalPaidSoFar);
    payment.remainingBalance = moneyNumber(payment.remainingBalance);
    payment.createdAt = payment.createdAt || new Date().toISOString();
  }

  for (const expense of dbToMigrate.expenses) {
    expense.date = expense.date || dateOnly();
    expense.category = expense.category || "Other expenses";
    if (!dbToMigrate.expenseCategories.includes(expense.category)) dbToMigrate.expenseCategories.push(expense.category);
    expense.amount = moneyNumber(expense.amount) ?? 0;
    expense.source = expense.source || "expense";
    expense.createdAt = expense.createdAt || new Date().toISOString();
  }

  for (const salary of dbToMigrate.salaryPayments) {
    salary.date = salary.date || dateOnly();
    salary.baseSalary = moneyNumber(salary.baseSalary) ?? 0;
    salary.deductions = moneyNumber(salary.deductions) ?? 0;
    salary.bonuses = moneyNumber(salary.bonuses) ?? 0;
    salary.advances = moneyNumber(salary.advances) ?? 0;
    salary.netPaidAmount = moneyNumber(salary.netPaidAmount) ?? 0;
    salary.createdAt = salary.createdAt || new Date().toISOString();
  }

  for (const withdrawal of dbToMigrate.withdrawals) {
    withdrawal.date = withdrawal.date || dateOnly();
    withdrawal.amount = moneyNumber(withdrawal.amount) ?? 0;
    withdrawal.createdAt = withdrawal.createdAt || new Date().toISOString();
  }

  for (const account of dbToMigrate.bankAccounts) {
    account.openingBalance = moneyNumber(account.openingBalance) ?? 0;
    account.currentBalance = moneyNumber(account.currentBalance) ?? account.openingBalance;
    account.totalDeposits = moneyNumber(account.totalDeposits) ?? 0;
    account.totalWithdrawals = moneyNumber(account.totalWithdrawals) ?? 0;
    account.active = account.active !== false;
    account.createdAt = account.createdAt || new Date().toISOString();
  }

  for (const transaction of dbToMigrate.accountTransactions) {
    transaction.date = transaction.date || dateOnly();
    transaction.amount = roundMoney(transaction.amount);
    transaction.createdAt = transaction.createdAt || new Date().toISOString();
  }

  for (const transfer of dbToMigrate.internalTransfers) {
    transfer.date = transfer.date || dateOnly();
    transfer.amount = moneyNumber(transfer.amount) ?? 0;
    transfer.createdAt = transfer.createdAt || new Date().toISOString();
  }

  for (const log of dbToMigrate.auditLogs) {
    log.at = log.at || new Date().toISOString();
  }

  dbToMigrate.settings.schemaVersion = CURRENT_SCHEMA_VERSION;
  updateAccountBalances(dbToMigrate);
  return dbToMigrate;
}

function normalizeSaleItem(item, source, isBonus) {
  const medicine = source.medicines.find((entry) => entry.id === item.medicineId);
  item.name = item.name || item.medicineName || item.productName || medicine?.name || "";
  item.sku = item.sku || medicine?.sku || "";
  item.batch = item.batch || medicine?.batch || "";
  item.productionDate = item.productionDate || medicine?.productionDate || "";
  item.expiry = item.expiry || medicine?.expiry || "";
  item.unitCost = moneyNumber(item.unitCost) ?? medicine?.cost ?? 0;
  item.unitPrice = isBonus ? 0 : moneyNumber(item.unitPrice) ?? medicine?.price ?? 0;
  item.quantity = positiveNumber(item.quantity);
  item.lineTotal = isBonus ? 0 : roundMoney(item.quantity * item.unitPrice);
  if (isBonus) item.isBonus = true;
}

function saleItemsFromLegacySale(sale, source) {
  const medicineId = cleanText(sale.medicineId || sale.productId || sale.itemId || "");
  if (!medicineId) return [];
  const quantity = positiveNumber(sale.quantity ?? sale.qty ?? sale.units);
  if (!quantity) return [];

  const medicine = source.medicines.find((entry) => entry.id === medicineId);
  const saleTotal = moneyNumber(sale.lineTotal ?? sale.total);
  const derivedUnitPrice = saleTotal && quantity ? roundMoney(saleTotal / quantity) : null;
  const unitPrice = moneyNumber(sale.unitPrice ?? sale.price ?? sale.sellingPrice) ?? derivedUnitPrice ?? medicine?.price ?? 0;

  return [{
    medicineId,
    name: cleanText(sale.name || sale.medicineName || sale.productName || medicine?.name || ""),
    sku: cleanText(sale.sku || medicine?.sku || ""),
    batch: cleanText(sale.batch || medicine?.batch || ""),
    productionDate: cleanText(sale.productionDate || medicine?.productionDate || ""),
    expiry: cleanText(sale.expiry || medicine?.expiry || ""),
    quantity,
    unitPrice,
    unitCost: moneyNumber(sale.unitCost ?? sale.cost) ?? medicine?.cost ?? 0,
    lineTotal: roundMoney(quantity * unitPrice),
  }];
}

function defaultAccounts(createdAt) {
  return [
    accountSeed("acct-cashbox", "Main Cashbox", "Cashbox", 0, createdAt),
    accountSeed("acct-al-nouran", "Al Nouran Bank", "Bank", 0, createdAt),
    accountSeed("acct-jumhouria", "Jumhouria Bank", "Bank", 0, createdAt),
  ];
}

function accountSeed(id, name, type, openingBalance, createdAt) {
  return {
    id,
    name,
    type,
    openingBalance,
    currentBalance: openingBalance,
    totalDeposits: 0,
    totalWithdrawals: 0,
    active: true,
    createdAt,
  };
}

function defaultFeatureVisibility() {
  return Object.fromEntries(Object.keys(permissionsByRole).map((role) => [role, []]));
}

function normalizeFeatureVisibility(source = {}) {
  const normalized = defaultFeatureVisibility();
  for (const role of Object.keys(permissionsByRole)) {
    const hidden = Array.isArray(source[role]) ? source[role] : [];
    normalized[role] = [...new Set(hidden.filter((feature) => featureKeys.includes(feature) && feature !== "dashboard"))];
  }
  normalized.Admin = [];
  return normalized;
}

function updateAccountBalances(source) {
  if (!source.bankAccounts) return;
  for (const account of source.bankAccounts) {
    const transactions = (source.accountTransactions || []).filter((item) => item.accountId === account.id && !item.reversed);
    const deposits = transactions.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
    const withdrawals = transactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0);
    account.totalDeposits = roundMoney(deposits);
    account.totalWithdrawals = roundMoney(withdrawals);
    account.currentBalance = roundMoney((account.openingBalance || 0) + deposits - withdrawals);
  }
}

function recalculateSalePaymentStatus(sale, source) {
  const paid = (source.customerPayments || []).filter((payment) => payment.saleId === sale.id).reduce((sum, payment) => sum + payment.amount, 0);
  sale.totalPaid = roundMoney(paid);
  sale.remainingBalance = roundMoney(Math.max((sale.total || 0) - sale.totalPaid, 0));
  if (sale.remainingBalance <= 0 && sale.total > 0) sale.paymentStatus = "Paid";
  else if (sale.totalPaid > 0) sale.paymentStatus = "Partially Paid";
  else sale.paymentStatus = "Unpaid";
}

function recalculatePurchasePaymentStatus(purchase) {
  purchase.paidAmount = roundMoney(purchase.paidAmount || 0);
  purchase.remainingBalance = roundMoney(Math.max((purchase.total || 0) - purchase.paidAmount, 0));
  if (purchase.remainingBalance <= 0 && purchase.total > 0) purchase.paymentStatus = "Paid";
  else if (purchase.paidAmount > 0) purchase.paymentStatus = "Partially Paid";
  else purchase.paymentStatus = "Unpaid";
}

function countJsonRecords(source) {
  const db = normalizeDatabase(cloneJson(source));
  return {
    suppliers: db.suppliers.length,
    customers: db.customers.length,
    medicines: db.medicines.length,
    purchases: db.purchases.length,
    sales: db.sales.length,
    saleItems: db.sales.reduce((sum, sale) => sum + (sale.items || []).length, 0),
    saleBonusItems: db.sales.reduce((sum, sale) => sum + (sale.bonusItems || []).length, 0),
    customerPayments: db.customerPayments.length,
    deliveryReceipts: db.deliveryReceipts.length,
    deliveryReceiptItems: db.deliveryReceipts.reduce((sum, receipt) => sum + (receipt.items || []).length, 0),
    deliveryReceiptBonusItems: db.deliveryReceipts.reduce((sum, receipt) => sum + (receipt.bonusItems || []).length, 0),
    supplierPayments: db.supplierPayments.length,
    expenseCategories: db.expenseCategories.length,
    expenses: db.expenses.length,
    salaryPayments: db.salaryPayments.length,
    withdrawals: db.withdrawals.length,
    bankAccounts: db.bankAccounts.length,
    accountTransactions: db.accountTransactions.length,
    internalTransfers: db.internalTransfers.length,
    users: db.users.length,
    auditLogs: db.auditLogs.length,
    moduleSettings: Object.keys(db.modules || {}).length,
    hiddenFeatures: Object.values(db.featureVisibility || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
  };
}

function cleanText(value) {
  return String(value || "").trim().slice(0, 240);
}

function positiveNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number);
}

function nonNegativeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function moneyNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return roundMoney(number);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function dateOnly() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  CURRENT_SCHEMA_VERSION,
  permissionsByRole,
  featureCatalog,
  expenseCategories,
  cloneJson,
  normalizeDatabase,
  countJsonRecords,
  updateAccountBalances,
  recalculateSalePaymentStatus,
  recalculatePurchasePaymentStatus,
  roundMoney,
};
