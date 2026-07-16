const {
  cloneJson,
  normalizeDatabase,
  countJsonRecords,
} = require("./json-normalize");

const MIGRATION_READY_KEY = "postgres_import_validated";

function createPostgresStore(prisma) {
  return {
    kind: "postgres",
    async isReady() {
      const state = await prisma.migrationState.findUnique({ where: { key: MIGRATION_READY_KEY } });
      return Boolean(state?.active);
    },
    async loadDatabase() {
      return loadDatabaseFromPostgres(prisma);
    },
    async saveDatabase(nextDb) {
      return persistFullDatabase(prisma, nextDb);
    },
  };
}

async function loadDatabaseFromPostgres(prisma) {
  const [
    settingsRow,
    sequenceRows,
    moduleRows,
    hiddenFeatureRows,
    categoryRows,
    userRows,
    supplierRows,
    customerRows,
    accountRows,
    medicineRows,
    purchaseRows,
    saleRows,
    saleItemRows,
    transactionRows,
    customerPaymentRows,
    supplierPaymentRows,
    deliveryReceiptRows,
    deliveryReceiptItemRows,
    expenseRows,
    salaryRows,
    withdrawalRows,
    transferRows,
    auditRows,
  ] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.numberSequence.findMany(),
    prisma.moduleSetting.findMany({ orderBy: { key: "asc" } }),
    prisma.hiddenFeature.findMany({ orderBy: [{ role: "asc" }, { featureKey: "asc" }] }),
    prisma.expenseCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.user.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.supplier.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.customer.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.bankAccount.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.medicine.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.purchase.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.sale.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.saleItem.findMany({ orderBy: [{ saleId: "asc" }, { kind: "asc" }, { lineNo: "asc" }] }),
    prisma.accountTransaction.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.customerPayment.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.supplierPayment.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.deliveryReceipt.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.deliveryReceiptItem.findMany({ orderBy: [{ deliveryReceiptId: "asc" }, { kind: "asc" }, { lineNo: "asc" }] }),
    prisma.expense.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.salaryPayment.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.withdrawal.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.internalTransfer.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.auditLog.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
  ]);

  const sequences = Object.fromEntries(sequenceRows.map((row) => [row.key, row.nextValue]));
  const settings = {
    schemaVersion: settingsRow?.schemaVersion || 2,
    companyName: settingsRow?.companyName || "alnawaa",
    companySubtitle: settingsRow?.companySubtitle || "مجموعة النوى الطبية",
    companyDetails: settingsRow?.companyDetails || "Tripoli - Ben Ashour Street",
    companyPhone: settingsRow?.companyPhone || "+218 091 069 3900",
    companyPhoneAlt: settingsRow?.companyPhoneAlt || "+218 092 069 3900",
    companyEmail: settingsRow?.companyEmail || "INFO@ALNAWAA.COM",
    companyAddress: settingsRow?.companyAddress || "Tripoli - Ben Ashour Street",
    companyAddressArabic: settingsRow?.companyAddressArabic || "طرابلس - شارع بن عاشور",
    currency: settingsRow?.currency || "LYD",
    nextInvoice: sequences.invoice || 1001,
    nextDeliveryReceipt: sequences.deliveryReceipt || 1001,
    nextPaymentReceipt: sequences.paymentReceipt || 1001,
    nextSupplierPayment: sequences.supplierPayment || 1001,
    nextExpense: sequences.expense || 1001,
    nextTransfer: sequences.transfer || 1001,
  };

  const modules = Object.fromEntries(moduleRows.map((row) => [row.key, row.enabled]));
  const featureVisibility = defaultFeatureVisibility();
  for (const row of hiddenFeatureRows) {
    if (!featureVisibility[row.role]) featureVisibility[row.role] = [];
    featureVisibility[row.role].push(row.featureKey);
  }
  featureVisibility.Admin = [];

  const customerPaymentsBySale = groupBy(customerPaymentRows, "saleId");
  const deliveryReceiptsBySale = groupBy(deliveryReceiptRows, "saleId");
  const saleItemsBySale = groupBy(saleItemRows, "saleId");
  const deliveryItemsByReceipt = groupBy(deliveryReceiptItemRows, "deliveryReceiptId");

  const db = {
    settings,
    modules,
    featureVisibility,
    suppliers: supplierRows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      phone: row.phone,
      email: row.email || "",
      address: row.address || "",
      createdAt: toIso(row.createdAt),
    })),
    customers: customerRows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      phone: row.phone,
      email: row.email || "",
      address: row.address || "",
      createdAt: toIso(row.createdAt),
    })),
    medicines: medicineRows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category,
      batch: row.batch,
      productionDate: toDateOnly(row.productionDate),
      supplierId: row.supplierId,
      location: row.location || "",
      stock: row.stock,
      reorderLevel: row.reorderLevel,
      cost: decimalNumber(row.cost),
      price: decimalNumber(row.price),
      expiry: toDateOnly(row.expiry),
      createdAt: toIso(row.createdAt),
    })),
    purchases: purchaseRows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber || "",
      date: toDateOnly(row.date),
      supplierId: row.supplierId,
      medicineId: row.medicineId,
      quantity: row.quantity,
      unitCost: decimalNumber(row.unitCost),
      total: decimalNumber(row.total),
      paidAmount: decimalNumber(row.paidAmount),
      remainingBalance: decimalNumber(row.remainingBalance),
      paymentStatus: fromPaymentStatus(row.paymentStatus),
      createdBy: row.createdById || "",
      createdAt: toIso(row.createdAt),
    })),
    sales: saleRows.map((row) => {
      const relatedItems = saleItemsBySale.get(row.id) || [];
      return cleanUndefined({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        date: toDateOnly(row.date),
        customerId: row.customerId,
        items: relatedItems.filter((item) => item.kind === "NORMAL").map(saleItemToJson),
        bonusItems: relatedItems.filter((item) => item.kind === "BONUS").map(saleItemToJson),
        total: decimalNumber(row.total),
        totalPaid: decimalNumber(row.totalPaid),
        remainingBalance: decimalNumber(row.remainingBalance),
        paymentStatus: fromPaymentStatus(row.paymentStatus),
        deliveryStatus: row.deliveryStatus,
        notes: row.notes || "",
        paymentReceiptIds: (customerPaymentsBySale.get(row.id) || []).map((payment) => payment.id),
        deliveryReceiptIds: (deliveryReceiptsBySale.get(row.id) || []).map((receipt) => receipt.id),
        createdBy: row.createdById || "",
        createdAt: toIso(row.createdAt),
        updatedBy: row.updatedById || undefined,
        updatedAt: toIso(row.updatedAt),
      });
    }),
    users: userRows.map((row) => cleanUndefined({
      id: row.id,
      name: row.name,
      role: row.role,
      email: row.email,
      status: row.status,
      salt: row.salt || undefined,
      passwordHash: row.passwordHash || undefined,
      createdAt: toIso(row.createdAt),
    })),
    customerPayments: customerPaymentRows.map((row) => cleanUndefined({
      id: row.id,
      receiptNumber: row.receiptNumber,
      date: toDateOnly(row.date),
      saleId: row.saleId,
      customerId: row.customerId,
      invoiceNumber: row.invoiceNumber,
      invoiceTotal: decimalNumber(row.invoiceTotal),
      amount: decimalNumber(row.amount),
      method: row.method,
      bankAccountId: row.bankAccountId,
      bankAccountName: row.bankAccountName,
      notes: row.notes || "",
      receivedBy: row.receivedBy || "",
      createdBy: row.createdById || "",
      createdAt: toIso(row.createdAt),
      totalPaidSoFar: decimalNumberOrUndefined(row.totalPaidSoFar),
      remainingBalance: decimalNumberOrUndefined(row.remainingBalance),
      accountTransactionId: row.accountTransactionId || undefined,
    })),
    deliveryReceipts: deliveryReceiptRows.map((row) => {
      const relatedItems = deliveryItemsByReceipt.get(row.id) || [];
      return {
        id: row.id,
        receiptNumber: row.receiptNumber,
        saleId: row.saleId,
        invoiceNumber: row.invoiceNumber,
        date: toDateOnly(row.date),
        customerId: row.customerId,
        customerName: row.customerName,
        customerType: row.customerType || "",
        receiverName: row.receiverName || "",
        receiverPhone: row.receiverPhone || "",
        deliveryPerson: row.deliveryPerson || "",
        notes: row.notes || "",
        total: decimalNumber(row.total),
        items: relatedItems.filter((item) => item.kind === "NORMAL").map(deliveryItemToJson),
        bonusItems: relatedItems.filter((item) => item.kind === "BONUS").map(deliveryItemToJson),
        createdBy: row.createdById || "",
        createdAt: toIso(row.createdAt),
      };
    }),
    supplierPayments: supplierPaymentRows.map((row) => cleanUndefined({
      id: row.id,
      voucherNumber: row.voucherNumber,
      date: toDateOnly(row.date),
      purchaseId: row.purchaseId,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      amount: decimalNumber(row.amount),
      method: row.method,
      bankAccountId: row.bankAccountId,
      bankAccountName: row.bankAccountName,
      notes: row.notes || "",
      paidBy: row.paidBy || "",
      createdBy: row.createdById || "",
      createdAt: toIso(row.createdAt),
      accountTransactionId: row.accountTransactionId || undefined,
      totalPaidSoFar: decimalNumberOrUndefined(row.totalPaidSoFar),
      remainingBalance: decimalNumberOrUndefined(row.remainingBalance),
    })),
    expenseCategories: categoryRows.map((row) => row.name),
    expenses: expenseRows.map((row) => cleanUndefined({
      id: row.id,
      expenseNumber: row.expenseNumber,
      date: toDateOnly(row.date),
      category: row.categoryName,
      amount: decimalNumber(row.amount),
      method: row.method,
      paidFromAccountId: row.paidFromAccountId,
      paidFromAccountName: row.paidFromAccountName,
      notes: row.notes || "",
      attachmentName: row.attachmentName || "",
      source: row.source,
      createdBy: row.createdById || "",
      createdByName: row.createdByName || "",
      createdAt: toIso(row.createdAt),
      accountTransactionId: row.accountTransactionId || undefined,
    })),
    salaryPayments: salaryRows.map((row) => cleanUndefined({
      id: row.id,
      date: toDateOnly(row.date),
      employeeName: row.employeeName,
      month: row.month,
      baseSalary: decimalNumber(row.baseSalary),
      deductions: decimalNumber(row.deductions),
      bonuses: decimalNumber(row.bonuses),
      advances: decimalNumber(row.advances),
      netPaidAmount: decimalNumber(row.netPaidAmount),
      method: row.method,
      paidFromAccountId: row.paidFromAccountId,
      paidFromAccountName: row.paidFromAccountName,
      notes: row.notes || "",
      createdBy: row.createdById || "",
      createdAt: toIso(row.createdAt),
      expenseId: row.expenseId || undefined,
    })),
    withdrawals: withdrawalRows.map((row) => cleanUndefined({
      id: row.id,
      date: toDateOnly(row.date),
      type: row.type,
      amount: decimalNumber(row.amount),
      withdrawnBy: row.withdrawnBy,
      accountId: row.accountId,
      accountName: row.accountName,
      reason: row.reason || "",
      notes: row.notes || "",
      createdBy: row.createdById || "",
      createdAt: toIso(row.createdAt),
      accountTransactionId: row.accountTransactionId || undefined,
    })),
    bankAccounts: accountRows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      openingBalance: decimalNumber(row.openingBalance),
      currentBalance: decimalNumber(row.currentBalance),
      totalDeposits: decimalNumber(row.totalDeposits),
      totalWithdrawals: decimalNumber(row.totalWithdrawals),
      active: row.active,
      createdAt: toIso(row.createdAt),
    })),
    accountTransactions: transactionRows.map((row) => cleanUndefined({
      id: row.id,
      accountId: row.accountId,
      accountName: row.accountName,
      date: toDateOnly(row.date),
      type: row.type,
      source: row.source,
      sourceId: row.sourceId,
      description: row.description,
      amount: decimalNumber(row.amount),
      createdBy: row.createdById || "",
      createdAt: toIso(row.createdAt),
      reversed: row.reversed || undefined,
    })),
    internalTransfers: transferRows.map((row) => cleanUndefined({
      id: row.id,
      transferNumber: row.transferNumber,
      date: toDateOnly(row.date),
      fromAccountId: row.fromAccountId,
      fromAccountName: row.fromAccountName,
      toAccountId: row.toAccountId,
      toAccountName: row.toAccountName,
      amount: decimalNumber(row.amount),
      notes: row.notes || "",
      createdBy: row.createdById || "",
      createdAt: toIso(row.createdAt),
      outTransactionId: row.outTransactionId || undefined,
      inTransactionId: row.inTransactionId || undefined,
    })),
    auditLogs: auditRows.map((row) => ({
      id: row.id,
      at: toIso(row.at),
      userId: row.userId || "",
      userName: row.userName || "",
      action: row.action,
      detail: row.detail || "",
    })),
  };

  return normalizeDatabase(db);
}

async function persistFullDatabase(prisma, sourceDb) {
  const db = normalizeDatabase(cloneJson(sourceDb));
  const userIds = new Set(db.users.map((user) => user.id));
  const counts = countJsonRecords(db);

  await prisma.$transaction(async (tx) => {
    await deleteBusinessTables(tx);

    await tx.companySettings.upsert({
      where: { id: "default" },
      create: settingsData(db.settings),
      update: settingsData(db.settings),
    });

    await createManyIfAny(tx.numberSequence, sequenceRows(db.settings));
    await createManyIfAny(tx.moduleSetting, Object.entries(db.modules || {}).map(([key, enabled]) => ({ key, enabled: Boolean(enabled) })));
    await createManyIfAny(tx.hiddenFeature, Object.entries(db.featureVisibility || {}).flatMap(([role, features]) =>
      (Array.isArray(features) ? features : []).map((featureKey) => ({ role, featureKey }))
    ));
    await createManyIfAny(tx.expenseCategory, db.expenseCategories.map((name, sortOrder) => ({ name, sortOrder })));
    await createManyIfAny(tx.user, db.users.map((user, sortOrder) => userData(user, sortOrder)));
    await createManyIfAny(tx.supplier, db.suppliers.map((supplier, sortOrder) => supplierData(supplier, sortOrder)));
    await createManyIfAny(tx.customer, db.customers.map((customer, sortOrder) => customerData(customer, sortOrder)));
    await createManyIfAny(tx.bankAccount, db.bankAccounts.map((account, sortOrder) => bankAccountData(account, sortOrder)));
    await createManyIfAny(tx.medicine, db.medicines.map((medicine, sortOrder) => medicineData(medicine, sortOrder)));
    await createManyIfAny(tx.purchase, db.purchases.map((purchase, sortOrder) => purchaseData(purchase, sortOrder, userIds)));
    await createManyIfAny(tx.sale, db.sales.map((sale, sortOrder) => saleData(sale, sortOrder, userIds)));
    await createManyIfAny(tx.saleItem, db.sales.flatMap((sale) => saleItemRows(sale)));
    await createManyIfAny(tx.accountTransaction, db.accountTransactions.map((transaction, sortOrder) => accountTransactionData(transaction, sortOrder, userIds)));
    await createManyIfAny(tx.customerPayment, db.customerPayments.map((payment, sortOrder) => customerPaymentData(payment, sortOrder, userIds)));
    await createManyIfAny(tx.supplierPayment, db.supplierPayments.map((payment, sortOrder) => supplierPaymentData(payment, sortOrder, userIds)));
    await createManyIfAny(tx.deliveryReceipt, db.deliveryReceipts.map((receipt, sortOrder) => deliveryReceiptData(receipt, sortOrder, userIds)));
    await createManyIfAny(tx.deliveryReceiptItem, db.deliveryReceipts.flatMap((receipt) => deliveryReceiptItemRows(receipt)));
    await createManyIfAny(tx.expense, db.expenses.map((expense, sortOrder) => expenseData(expense, sortOrder, userIds)));
    await createManyIfAny(tx.salaryPayment, db.salaryPayments.map((salary, sortOrder) => salaryData(salary, sortOrder, userIds)));
    await createManyIfAny(tx.withdrawal, db.withdrawals.map((withdrawal, sortOrder) => withdrawalData(withdrawal, sortOrder, userIds)));
    await createManyIfAny(tx.internalTransfer, db.internalTransfers.map((transfer, sortOrder) => transferData(transfer, sortOrder, userIds)));
    await createManyIfAny(tx.auditLog, db.auditLogs.map((log, sortOrder) => auditLogData(log, sortOrder, userIds)));
  }, { timeout: 120000, maxWait: 120000 });

  return counts;
}

async function createManyIfAny(model, data) {
  if (!data.length) return;
  await model.createMany({ data });
}

async function deleteBusinessTables(tx) {
  await tx.deliveryReceiptItem.deleteMany();
  await tx.saleItem.deleteMany();
  await tx.customerPayment.deleteMany();
  await tx.supplierPayment.deleteMany();
  await tx.salaryPayment.deleteMany();
  await tx.internalTransfer.deleteMany();
  await tx.expense.deleteMany();
  await tx.withdrawal.deleteMany();
  await tx.deliveryReceipt.deleteMany();
  await tx.accountTransaction.deleteMany();
  await tx.purchase.deleteMany();
  await tx.sale.deleteMany();
  await tx.medicine.deleteMany();
  await tx.supplier.deleteMany();
  await tx.customer.deleteMany();
  await tx.bankAccount.deleteMany();
  await tx.auditLog.deleteMany();
  await tx.user.deleteMany();
  await tx.expenseCategory.deleteMany();
  await tx.hiddenFeature.deleteMany();
  await tx.moduleSetting.deleteMany();
  await tx.numberSequence.deleteMany();
}

function settingsData(settings) {
  return {
    id: "default",
    schemaVersion: Number(settings.schemaVersion || 2),
    companyName: settings.companyName || "alnawaa",
    companySubtitle: settings.companySubtitle || "",
    companyDetails: settings.companyDetails || "",
    companyPhone: settings.companyPhone || "",
    companyPhoneAlt: settings.companyPhoneAlt || "",
    companyEmail: settings.companyEmail || "",
    companyAddress: settings.companyAddress || "",
    companyAddressArabic: settings.companyAddressArabic || "",
    currency: settings.currency || "LYD",
  };
}

function sequenceRows(settings) {
  const computed = {
    invoice: settings.nextInvoice,
    deliveryReceipt: settings.nextDeliveryReceipt,
    paymentReceipt: settings.nextPaymentReceipt,
    supplierPayment: settings.nextSupplierPayment,
    expense: settings.nextExpense,
    transfer: settings.nextTransfer,
  };
  return Object.entries(computed).map(([key, value]) => ({ key, nextValue: Number(value || 1001) }));
}

function userData(user, sortOrder) {
  return {
    id: user.id,
    sortOrder,
    name: user.name || "",
    role: user.role || "Sales",
    email: String(user.email || "").toLowerCase(),
    status: user.status === "Suspended" ? "Suspended" : "Active",
    salt: user.salt || null,
    passwordHash: user.passwordHash || null,
    createdAt: parseDateTime(user.createdAt),
  };
}

function supplierData(supplier, sortOrder) {
  return {
    id: supplier.id,
    sortOrder,
    name: supplier.name || "",
    type: supplier.type || "Supplier",
    phone: supplier.phone || "",
    email: supplier.email || "",
    address: supplier.address || "",
    createdAt: parseDateTime(supplier.createdAt) || new Date(),
  };
}

function customerData(customer, sortOrder) {
  return {
    id: customer.id,
    sortOrder,
    name: customer.name || "",
    type: customer.type || "Customer",
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
    createdAt: parseDateTime(customer.createdAt) || new Date(),
  };
}

function medicineData(medicine, sortOrder) {
  return {
    id: medicine.id,
    sortOrder,
    name: medicine.name || "",
    sku: medicine.sku || "",
    category: medicine.category || "",
    batch: medicine.batch || "",
    productionDate: parseDateOnly(medicine.productionDate),
    supplierId: medicine.supplierId,
    location: medicine.location || "",
    stock: Number(medicine.stock || 0),
    reorderLevel: Number(medicine.reorderLevel || 0),
    cost: decimalString(medicine.cost),
    price: decimalString(medicine.price),
    expiry: parseDateOnly(medicine.expiry),
    createdAt: parseDateTime(medicine.createdAt) || new Date(),
  };
}

function purchaseData(purchase, sortOrder, userIds) {
  return {
    id: purchase.id,
    sortOrder,
    invoiceNumber: purchase.invoiceNumber || "",
    date: parseDateOnly(purchase.date) || new Date(),
    supplierId: purchase.supplierId,
    medicineId: purchase.medicineId,
    quantity: Number(purchase.quantity || 0),
    unitCost: decimalString(purchase.unitCost),
    total: decimalString(purchase.total),
    paidAmount: decimalString(purchase.paidAmount),
    remainingBalance: decimalString(purchase.remainingBalance),
    paymentStatus: toPaymentStatus(purchase.paymentStatus),
    createdById: existingId(purchase.createdBy, userIds),
    createdAt: parseDateTime(purchase.createdAt) || new Date(),
  };
}

function saleData(sale, sortOrder, userIds) {
  return {
    id: sale.id,
    sortOrder,
    invoiceNumber: sale.invoiceNumber,
    date: parseDateOnly(sale.date) || new Date(),
    customerId: sale.customerId,
    total: decimalString(sale.total),
    totalPaid: decimalString(sale.totalPaid),
    remainingBalance: decimalString(sale.remainingBalance),
    paymentStatus: toPaymentStatus(sale.paymentStatus),
    deliveryStatus: sale.deliveryStatus || "Ready",
    notes: sale.notes || "",
    createdById: existingId(sale.createdBy, userIds),
    createdAt: parseDateTime(sale.createdAt) || new Date(),
    updatedById: existingId(sale.updatedBy, userIds),
    updatedAt: parseDateTime(sale.updatedAt),
  };
}

function saleItemRows(sale) {
  return [
    ...(sale.items || []).map((item, index) => saleItemData(sale.id, item, index, "NORMAL")),
    ...(sale.bonusItems || []).map((item, index) => saleItemData(sale.id, item, index, "BONUS")),
  ];
}

function saleItemData(saleId, item, index, kind) {
  const lineNo = index + 1;
  return {
    id: `${saleId}:${kind.toLowerCase()}:${lineNo}`,
    saleId,
    lineNo,
    kind,
    medicineId: item.medicineId,
    name: item.name || "",
    sku: item.sku || "",
    batch: item.batch || "",
    productionDate: parseDateOnly(item.productionDate),
    expiry: parseDateOnly(item.expiry),
    quantity: Number(item.quantity || 0),
    unitPrice: decimalString(item.unitPrice),
    unitCost: decimalString(item.unitCost),
    lineTotal: decimalString(item.lineTotal),
  };
}

function accountTransactionData(transaction, sortOrder, userIds) {
  return {
    id: transaction.id,
    sortOrder,
    accountId: transaction.accountId,
    accountName: transaction.accountName || "",
    date: parseDateOnly(transaction.date) || new Date(),
    type: transaction.type === "deposit" ? "deposit" : "withdrawal",
    source: transaction.source || "",
    sourceId: transaction.sourceId || "",
    description: transaction.description || "",
    amount: decimalString(transaction.amount),
    reversed: Boolean(transaction.reversed),
    createdById: existingId(transaction.createdBy, userIds),
    createdAt: parseDateTime(transaction.createdAt) || new Date(),
  };
}

function customerPaymentData(payment, sortOrder, userIds) {
  return {
    id: payment.id,
    sortOrder,
    receiptNumber: payment.receiptNumber,
    date: parseDateOnly(payment.date) || new Date(),
    saleId: payment.saleId,
    customerId: payment.customerId,
    invoiceNumber: payment.invoiceNumber || "",
    invoiceTotal: decimalString(payment.invoiceTotal),
    amount: decimalString(payment.amount),
    method: payment.method || "Cash",
    bankAccountId: payment.bankAccountId,
    bankAccountName: payment.bankAccountName || "",
    notes: payment.notes || "",
    receivedBy: payment.receivedBy || "",
    createdById: existingId(payment.createdBy, userIds),
    createdAt: parseDateTime(payment.createdAt) || new Date(),
    totalPaidSoFar: decimalStringOrNull(payment.totalPaidSoFar),
    remainingBalance: decimalStringOrNull(payment.remainingBalance),
    accountTransactionId: payment.accountTransactionId || null,
  };
}

function supplierPaymentData(payment, sortOrder, userIds) {
  return {
    id: payment.id,
    sortOrder,
    voucherNumber: payment.voucherNumber,
    date: parseDateOnly(payment.date) || new Date(),
    purchaseId: payment.purchaseId,
    supplierId: payment.supplierId,
    supplierName: payment.supplierName || "",
    amount: decimalString(payment.amount),
    method: payment.method || "Cash",
    bankAccountId: payment.bankAccountId,
    bankAccountName: payment.bankAccountName || "",
    notes: payment.notes || "",
    paidBy: payment.paidBy || "",
    createdById: existingId(payment.createdBy, userIds),
    createdAt: parseDateTime(payment.createdAt) || new Date(),
    totalPaidSoFar: decimalStringOrNull(payment.totalPaidSoFar),
    remainingBalance: decimalStringOrNull(payment.remainingBalance),
    accountTransactionId: payment.accountTransactionId || null,
  };
}

function deliveryReceiptData(receipt, sortOrder, userIds) {
  return {
    id: receipt.id,
    sortOrder,
    receiptNumber: receipt.receiptNumber,
    saleId: receipt.saleId,
    invoiceNumber: receipt.invoiceNumber || "",
    date: parseDateOnly(receipt.date) || new Date(),
    customerId: receipt.customerId,
    customerName: receipt.customerName || "",
    customerType: receipt.customerType || "",
    receiverName: receipt.receiverName || "",
    receiverPhone: receipt.receiverPhone || "",
    deliveryPerson: receipt.deliveryPerson || "",
    notes: receipt.notes || "",
    total: decimalString(receipt.total),
    createdById: existingId(receipt.createdBy, userIds),
    createdAt: parseDateTime(receipt.createdAt) || new Date(),
  };
}

function deliveryReceiptItemRows(receipt) {
  return [
    ...(receipt.items || []).map((item, index) => deliveryReceiptItemData(receipt.id, item, index, "NORMAL")),
    ...(receipt.bonusItems || []).map((item, index) => deliveryReceiptItemData(receipt.id, item, index, "BONUS")),
  ];
}

function deliveryReceiptItemData(deliveryReceiptId, item, index, kind) {
  const lineNo = index + 1;
  return {
    id: `${deliveryReceiptId}:${kind.toLowerCase()}:${lineNo}`,
    deliveryReceiptId,
    lineNo,
    kind,
    medicineId: item.medicineId || null,
    name: item.name || "",
    batch: item.batch || "",
    expiry: parseDateOnly(item.expiry),
    quantity: Number(item.quantity || 0),
  };
}

function expenseData(expense, sortOrder, userIds) {
  return {
    id: expense.id,
    sortOrder,
    expenseNumber: expense.expenseNumber,
    date: parseDateOnly(expense.date) || new Date(),
    categoryName: expense.category || "Other expenses",
    amount: decimalString(expense.amount),
    method: expense.method || "Cash",
    paidFromAccountId: expense.paidFromAccountId,
    paidFromAccountName: expense.paidFromAccountName || "",
    notes: expense.notes || "",
    attachmentName: expense.attachmentName || "",
    source: expense.source || "expense",
    createdById: existingId(expense.createdBy, userIds),
    createdByName: expense.createdByName || "",
    createdAt: parseDateTime(expense.createdAt) || new Date(),
    accountTransactionId: expense.accountTransactionId || null,
  };
}

function salaryData(salary, sortOrder, userIds) {
  return {
    id: salary.id,
    sortOrder,
    date: parseDateOnly(salary.date) || new Date(),
    employeeName: salary.employeeName || "",
    month: salary.month || "",
    baseSalary: decimalString(salary.baseSalary),
    deductions: decimalString(salary.deductions),
    bonuses: decimalString(salary.bonuses),
    advances: decimalString(salary.advances),
    netPaidAmount: decimalString(salary.netPaidAmount),
    method: salary.method || "Cash",
    paidFromAccountId: salary.paidFromAccountId,
    paidFromAccountName: salary.paidFromAccountName || "",
    notes: salary.notes || "",
    createdById: existingId(salary.createdBy, userIds),
    createdAt: parseDateTime(salary.createdAt) || new Date(),
    expenseId: salary.expenseId || null,
  };
}

function withdrawalData(withdrawal, sortOrder, userIds) {
  return {
    id: withdrawal.id,
    sortOrder,
    date: parseDateOnly(withdrawal.date) || new Date(),
    type: withdrawal.type || "",
    amount: decimalString(withdrawal.amount),
    withdrawnBy: withdrawal.withdrawnBy || "",
    accountId: withdrawal.accountId,
    accountName: withdrawal.accountName || "",
    reason: withdrawal.reason || "",
    notes: withdrawal.notes || "",
    createdById: existingId(withdrawal.createdBy, userIds),
    createdAt: parseDateTime(withdrawal.createdAt) || new Date(),
    accountTransactionId: withdrawal.accountTransactionId || null,
  };
}

function bankAccountData(account, sortOrder) {
  return {
    id: account.id,
    sortOrder,
    name: account.name || "",
    type: account.type === "Cashbox" ? "Cashbox" : "Bank",
    openingBalance: decimalString(account.openingBalance),
    currentBalance: decimalString(account.currentBalance),
    totalDeposits: decimalString(account.totalDeposits),
    totalWithdrawals: decimalString(account.totalWithdrawals),
    active: account.active !== false,
    createdAt: parseDateTime(account.createdAt) || new Date(),
  };
}

function transferData(transfer, sortOrder, userIds) {
  return {
    id: transfer.id,
    sortOrder,
    transferNumber: transfer.transferNumber,
    date: parseDateOnly(transfer.date) || new Date(),
    fromAccountId: transfer.fromAccountId,
    fromAccountName: transfer.fromAccountName || "",
    toAccountId: transfer.toAccountId,
    toAccountName: transfer.toAccountName || "",
    amount: decimalString(transfer.amount),
    notes: transfer.notes || "",
    createdById: existingId(transfer.createdBy, userIds),
    createdAt: parseDateTime(transfer.createdAt) || new Date(),
    outTransactionId: transfer.outTransactionId || null,
    inTransactionId: transfer.inTransactionId || null,
  };
}

function auditLogData(log, sortOrder, userIds) {
  return {
    id: log.id,
    sortOrder,
    at: parseDateTime(log.at) || new Date(),
    userId: existingId(log.userId, userIds),
    userName: log.userName || "",
    action: log.action || "",
    detail: log.detail || "",
  };
}

function saleItemToJson(row) {
  return {
    medicineId: row.medicineId,
    name: row.name,
    sku: row.sku || "",
    batch: row.batch || "",
    productionDate: toDateOnly(row.productionDate),
    expiry: toDateOnly(row.expiry),
    quantity: row.quantity,
    unitPrice: decimalNumber(row.unitPrice),
    unitCost: decimalNumber(row.unitCost),
    lineTotal: decimalNumber(row.lineTotal),
    ...(row.kind === "BONUS" ? { isBonus: true } : {}),
  };
}

function deliveryItemToJson(row) {
  return {
    medicineId: row.medicineId || "",
    name: row.name,
    batch: row.batch || "",
    expiry: toDateOnly(row.expiry),
    quantity: row.quantity,
    ...(row.kind === "BONUS" ? { isBonus: true } : {}),
  };
}

async function markPostgresImportValidated(prisma, details) {
  await prisma.migrationState.upsert({
    where: { key: MIGRATION_READY_KEY },
    create: { key: MIGRATION_READY_KEY, active: true, value: details || {} },
    update: { active: true, value: details || {} },
  });
}

async function markPostgresImportInvalid(prisma, details) {
  await prisma.migrationState.upsert({
    where: { key: MIGRATION_READY_KEY },
    create: { key: MIGRATION_READY_KEY, active: false, value: details || {} },
    update: { active: false, value: details || {} },
  });
}

function defaultFeatureVisibility() {
  return {
    Admin: [],
    Manager: [],
    Pharmacist: [],
    Sales: [],
    Accountant: [],
  };
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(row);
  }
  return grouped;
}

function existingId(id, ids) {
  return id && ids.has(id) ? id : null;
}

function toPaymentStatus(value) {
  if (value === "Paid") return "Paid";
  if (value === "Partially Paid" || value === "PartiallyPaid") return "PartiallyPaid";
  return "Unpaid";
}

function fromPaymentStatus(value) {
  return value === "PartiallyPaid" ? "Partially Paid" : value || "Unpaid";
}

function parseDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnly(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(value) {
  return value ? new Date(value).toISOString() : undefined;
}

function toDateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function decimalString(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toFixed(3) : "0.000";
}

function decimalStringOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  return decimalString(value);
}

function decimalNumber(value) {
  return Number(value || 0);
}

function decimalNumberOrUndefined(value) {
  if (value === null || value === undefined) return undefined;
  return decimalNumber(value);
}

function cleanUndefined(source) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined));
}

module.exports = {
  MIGRATION_READY_KEY,
  createPostgresStore,
  loadDatabaseFromPostgres,
  persistFullDatabase,
  markPostgresImportValidated,
  markPostgresImportInvalid,
};
