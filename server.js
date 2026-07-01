const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 4280);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "database.json");
const SESSION_COOKIE = "alnawaa_session";
const CURRENT_SCHEMA_VERSION = 2;
const sessions = new Map();

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

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

let db = loadDatabase();

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    if (error.statusCode) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: "Server error", detail: "The ERP server could not finish this request." });
  });
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`AlnawaaERP Official is running at http://${displayHost}:${PORT}`);
  console.log("Admin login: admin@alnawaaerp.com / admin123");
});

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  serveStatic(url.pathname, response);
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, name: "AlnawaaERP Official" });
    return;
  }

  if (url.pathname === "/api/login" && request.method === "POST") {
    const body = await readJsonBody(request);
    const user = db.users.find((item) => item.email.toLowerCase() === String(body.email || "").toLowerCase());
    if (!user || !verifyPassword(body.password || "", user) || user.status !== "Active") {
      sendJson(response, 401, { error: "Invalid login" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { userId: user.id, createdAt: new Date().toISOString() });
    response.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`);
    sendJson(response, 200, { user: sanitizeUser(user) });
    return;
  }

  const currentUser = getCurrentUser(request);
  if (!currentUser) {
    sendJson(response, 401, { error: "Authentication required" });
    return;
  }

  if (url.pathname === "/api/logout" && request.method === "POST") {
    const token = getCookie(request, SESSION_COOKIE);
    if (token) sessions.delete(token);
    response.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/me" && request.method === "GET") {
    sendJson(response, 200, { user: sanitizeUser(currentUser) });
    return;
  }

  if (url.pathname === "/api/me/account" && request.method === "PATCH") {
    const body = await readJsonBody(request);
    const updatedUser = updateOwnAccount(currentUser, body);
    saveDatabase(db);
    sendJson(response, 200, { user: sanitizeUser(updatedUser) });
    return;
  }

  if (url.pathname === "/api/bootstrap" && request.method === "GET") {
    sendJson(response, 200, sanitizeDatabase(db, currentUser));
    return;
  }

  if (url.pathname === "/api/export" && request.method === "GET") {
    requirePermission(currentUser, "reports");
    requireFeature(currentUser, "reports");
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="AlnawaaERP-backup-${dateOnly()}.json"`,
    });
    response.end(JSON.stringify(sanitizeDatabase(db, currentUser), null, 2));
    return;
  }

  if (url.pathname === "/api/reset" && request.method === "POST") {
    requirePermission(currentUser, "all");
    requireFeature(currentUser, "settings");
    db = initialDatabase();
    saveDatabase(db);
    sendJson(response, 200, sanitizeDatabase(db, currentUser));
    return;
  }

  if (url.pathname === "/api/medicines" && request.method === "POST") {
    requirePermission(currentUser, "inventory");
    requireFeature(currentUser, "inventory");
    const body = await readJsonBody(request);
    const medicine = normalizeMedicine(body);
    db.medicines.push(medicine);
    addAudit(currentUser, "medicine:create", medicine.name);
    saveDatabase(db);
    sendJson(response, 201, { medicine });
    return;
  }

  const medicineMatch = url.pathname.match(/^\/api\/medicines\/([^/]+)$/);
  if (medicineMatch && request.method === "PUT") {
    requirePermission(currentUser, "inventory");
    requireFeature(currentUser, "inventory");
    const existing = db.medicines.find((item) => item.id === decodeURIComponent(medicineMatch[1]));
    if (!existing) return sendJson(response, 404, { error: "Medicine not found" });
    const body = await readJsonBody(request);
    Object.assign(existing, normalizeMedicine(body, existing.id, existing.createdAt));
    addAudit(currentUser, "medicine:update", existing.name);
    saveDatabase(db);
    sendJson(response, 200, { medicine: existing });
    return;
  }

  if (medicineMatch && request.method === "DELETE") {
    requirePermission(currentUser, "inventory");
    requireFeature(currentUser, "inventory");
    const medicine = deleteMedicine(decodeURIComponent(medicineMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { medicine });
    return;
  }

  if (url.pathname === "/api/suppliers" && request.method === "POST") {
    requirePermission(currentUser, "partners");
    requireFeature(currentUser, "suppliers");
    const body = await readJsonBody(request);
    const supplier = normalizePartner(body, "supplier");
    db.suppliers.push(supplier);
    addAudit(currentUser, "supplier:create", supplier.name);
    saveDatabase(db);
    sendJson(response, 201, { supplier });
    return;
  }

  const supplierMatch = url.pathname.match(/^\/api\/suppliers\/([^/]+)$/);
  if (supplierMatch && request.method === "DELETE") {
    requirePermission(currentUser, "partners");
    requireFeature(currentUser, "suppliers");
    const supplier = deleteSupplier(decodeURIComponent(supplierMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { supplier });
    return;
  }

  if (url.pathname === "/api/customers" && request.method === "POST") {
    requirePermission(currentUser, "partners");
    requireFeature(currentUser, "customers");
    const body = await readJsonBody(request);
    const customer = normalizePartner(body, "customer");
    db.customers.push(customer);
    addAudit(currentUser, "customer:create", customer.name);
    saveDatabase(db);
    sendJson(response, 201, { customer });
    return;
  }

  const customerMatch = url.pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (customerMatch && request.method === "DELETE") {
    requirePermission(currentUser, "partners");
    requireFeature(currentUser, "customers");
    const customer = deleteCustomer(decodeURIComponent(customerMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { customer });
    return;
  }

  if (url.pathname === "/api/users" && request.method === "POST") {
    requirePermission(currentUser, "all");
    requireFeature(currentUser, "users");
    const body = await readJsonBody(request);
    if (!body.name || !body.email || !body.role || !body.password) {
      return sendJson(response, 400, { error: "Name, email, role, and password are required" });
    }
    if (!permissionsByRole[body.role]) return sendJson(response, 400, { error: "Invalid role" });
    if (db.users.some((user) => user.email.toLowerCase() === String(body.email).toLowerCase())) {
      return sendJson(response, 409, { error: "A user with this email already exists" });
    }
    const user = createUser({
      name: cleanText(body.name),
      email: cleanText(body.email).toLowerCase(),
      role: body.role,
      status: body.status === "Suspended" ? "Suspended" : "Active",
      password: String(body.password),
    });
    db.users.push(user);
    addAudit(currentUser, "user:create", user.email);
    saveDatabase(db);
    sendJson(response, 201, { user: sanitizeUser(user) });
    return;
  }

  const userMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && request.method === "DELETE") {
    requirePermission(currentUser, "all");
    requireFeature(currentUser, "users");
    const targetId = decodeURIComponent(userMatch[1]);
    const targetIndex = db.users.findIndex((user) => user.id === targetId);
    if (targetIndex === -1) return sendJson(response, 404, { error: "User not found" });

    const targetUser = db.users[targetIndex];
    if (targetUser.id === currentUser.id) {
      return sendJson(response, 400, { error: "You cannot delete the account you are currently using" });
    }

    const adminCount = db.users.filter((user) => user.role === "Admin").length;
    if (targetUser.role === "Admin" && adminCount <= 1) {
      return sendJson(response, 400, { error: "At least one admin account must remain" });
    }

    db.users.splice(targetIndex, 1);
    for (const [token, session] of sessions.entries()) {
      if (session.userId === targetUser.id) sessions.delete(token);
    }
    addAudit(currentUser, "user:delete", targetUser.email);
    saveDatabase(db);
    sendJson(response, 200, { user: sanitizeUser(targetUser) });
    return;
  }

  if (url.pathname === "/api/purchases" && request.method === "POST") {
    requirePermission(currentUser, "purchases");
    requireFeature(currentUser, "purchases");
    const body = await readJsonBody(request);
    const purchase = createPurchase(body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { purchase });
    return;
  }

  const purchaseMatch = url.pathname.match(/^\/api\/purchases\/([^/]+)$/);
  if (purchaseMatch && request.method === "DELETE") {
    requirePermission(currentUser, "purchases");
    requireFeature(currentUser, "purchases");
    const purchase = deletePurchase(decodeURIComponent(purchaseMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { purchase });
    return;
  }

  const purchasePaymentMatch = url.pathname.match(/^\/api\/purchases\/([^/]+)\/payments$/);
  if (purchasePaymentMatch && request.method === "POST") {
    requirePermission(currentUser, "manageAccounting");
    requireAnyFeature(currentUser, ["purchases", "accounting"]);
    const body = await readJsonBody(request);
    const payment = createSupplierPayment(decodeURIComponent(purchasePaymentMatch[1]), body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { payment });
    return;
  }

  const supplierPaymentMatch = url.pathname.match(/^\/api\/supplier-payments\/([^/]+)$/);
  if (supplierPaymentMatch && request.method === "DELETE") {
    requirePermission(currentUser, "manageAccounting");
    requireAnyFeature(currentUser, ["purchases", "accounting"]);
    const payment = deleteSupplierPayment(decodeURIComponent(supplierPaymentMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { payment });
    return;
  }

  if (url.pathname === "/api/sales" && request.method === "POST") {
    requirePermission(currentUser, "sales");
    requireFeature(currentUser, "sales");
    const body = await readJsonBody(request);
    const sale = createSale(body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { sale });
    return;
  }

  const saleMatch = url.pathname.match(/^\/api\/sales\/([^/]+)$/);
  if (saleMatch && request.method === "PUT") {
    requirePermission(currentUser, "sales");
    requireAnyFeature(currentUser, ["sales", "invoices"]);
    const body = await readJsonBody(request);
    const sale = updateSale(decodeURIComponent(saleMatch[1]), body, currentUser);
    saveDatabase(db);
    sendJson(response, 200, { sale });
    return;
  }

  if (saleMatch && request.method === "DELETE") {
    requirePermission(currentUser, "sales");
    requireAnyFeature(currentUser, ["sales", "invoices"]);
    const sale = deleteSale(decodeURIComponent(saleMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { sale });
    return;
  }

  const paymentMatch = url.pathname.match(/^\/api\/sales\/([^/]+)\/payments$/);
  if (paymentMatch && request.method === "POST") {
    requirePermission(currentUser, "createPaymentReceipts");
    requireFeature(currentUser, "invoices");
    const body = await readJsonBody(request);
    const payment = createCustomerPayment(decodeURIComponent(paymentMatch[1]), body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { payment });
    return;
  }

  const customerPaymentMatch = url.pathname.match(/^\/api\/customer-payments\/([^/]+)$/);
  if (customerPaymentMatch && request.method === "DELETE") {
    requirePermission(currentUser, "createPaymentReceipts");
    requireFeature(currentUser, "invoices");
    const payment = deleteCustomerPayment(decodeURIComponent(customerPaymentMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { payment });
    return;
  }

  const deliveryMatch = url.pathname.match(/^\/api\/sales\/([^/]+)\/delivery-receipts$/);
  if (deliveryMatch && request.method === "POST") {
    requirePermission(currentUser, "sales");
    requireFeature(currentUser, "invoices");
    const body = await readJsonBody(request);
    const receipt = createDeliveryReceipt(decodeURIComponent(deliveryMatch[1]), body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { receipt });
    return;
  }

  const deliveryReceiptMatch = url.pathname.match(/^\/api\/delivery-receipts\/([^/]+)$/);
  if (deliveryReceiptMatch && request.method === "DELETE") {
    requirePermission(currentUser, "sales");
    requireFeature(currentUser, "invoices");
    const receipt = deleteDeliveryReceipt(decodeURIComponent(deliveryReceiptMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { receipt });
    return;
  }

  const legacyPaymentMatch = url.pathname.match(/^\/api\/sales\/([^/]+)\/payment$/);
  if (legacyPaymentMatch && request.method === "PATCH") {
    requirePermission(currentUser, "createPaymentReceipts");
    requireFeature(currentUser, "invoices");
    const sale = db.sales.find((item) => item.id === decodeURIComponent(legacyPaymentMatch[1]));
    if (!sale) return sendJson(response, 404, { error: "Invoice not found" });
    const body = await readJsonBody(request);
    if (body.paymentStatus === "Paid" && remainingBalance(sale) > 0) {
      createCustomerPayment(sale.id, {
        amount: remainingBalance(sale),
        method: "Cash",
        accountId: defaultCashAccount().id,
        notes: "Marked paid from invoice",
      }, currentUser);
    } else {
      recalculateSalePaymentStatus(sale);
    }
    addAudit(currentUser, "payment:update", `${sale.invoiceNumber} -> ${sale.paymentStatus}`);
    saveDatabase(db);
    sendJson(response, 200, { sale });
    return;
  }

  if (url.pathname === "/api/expenses" && request.method === "POST") {
    requirePermission(currentUser, "manageExpenses");
    requireFeature(currentUser, "expenses");
    const body = await readJsonBody(request);
    const expense = createExpense(body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { expense });
    return;
  }

  const expenseMatch = url.pathname.match(/^\/api\/expenses\/([^/]+)$/);
  if (expenseMatch && request.method === "DELETE") {
    requirePermission(currentUser, "manageExpenses");
    requireFeature(currentUser, "expenses");
    const expense = deleteExpense(decodeURIComponent(expenseMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { expense });
    return;
  }

  if (url.pathname === "/api/salaries" && request.method === "POST") {
    requirePermission(currentUser, "manageExpenses");
    requireFeature(currentUser, "payroll");
    const body = await readJsonBody(request);
    const salary = createSalaryPayment(body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { salary });
    return;
  }

  const salaryMatch = url.pathname.match(/^\/api\/salaries\/([^/]+)$/);
  if (salaryMatch && request.method === "DELETE") {
    requirePermission(currentUser, "manageExpenses");
    requireFeature(currentUser, "payroll");
    const salary = deleteSalaryPayment(decodeURIComponent(salaryMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { salary });
    return;
  }

  if (url.pathname === "/api/withdrawals" && request.method === "POST") {
    requirePermission(currentUser, "manageAccounting");
    requireFeature(currentUser, "banking");
    const body = await readJsonBody(request);
    const withdrawal = createWithdrawal(body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { withdrawal });
    return;
  }

  const withdrawalMatch = url.pathname.match(/^\/api\/withdrawals\/([^/]+)$/);
  if (withdrawalMatch && request.method === "DELETE") {
    requirePermission(currentUser, "manageAccounting");
    requireFeature(currentUser, "banking");
    const withdrawal = deleteWithdrawal(decodeURIComponent(withdrawalMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { withdrawal });
    return;
  }

  if (url.pathname === "/api/bank-accounts" && request.method === "POST") {
    requirePermission(currentUser, "manageBankAccounts");
    requireFeature(currentUser, "banking");
    const body = await readJsonBody(request);
    const account = createBankAccount(body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { account });
    return;
  }

  const bankAccountMatch = url.pathname.match(/^\/api\/bank-accounts\/([^/]+)$/);
  if (bankAccountMatch && request.method === "DELETE") {
    requirePermission(currentUser, "manageBankAccounts");
    requireFeature(currentUser, "banking");
    const account = deleteBankAccount(decodeURIComponent(bankAccountMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { account });
    return;
  }

  if (url.pathname === "/api/internal-transfers" && request.method === "POST") {
    requirePermission(currentUser, "manageBankAccounts");
    requireFeature(currentUser, "banking");
    const body = await readJsonBody(request);
    const transfer = createInternalTransfer(body, currentUser);
    saveDatabase(db);
    sendJson(response, 201, { transfer });
    return;
  }

  const internalTransferMatch = url.pathname.match(/^\/api\/internal-transfers\/([^/]+)$/);
  if (internalTransferMatch && request.method === "DELETE") {
    requirePermission(currentUser, "manageBankAccounts");
    requireFeature(currentUser, "banking");
    const transfer = deleteInternalTransfer(decodeURIComponent(internalTransferMatch[1]), currentUser);
    saveDatabase(db);
    sendJson(response, 200, { transfer });
    return;
  }

  const moduleMatch = url.pathname.match(/^\/api\/modules\/([^/]+)$/);
  if (moduleMatch && request.method === "PATCH") {
    requirePermission(currentUser, "all");
    requireFeature(currentUser, "settings");
    const key = moduleMatch[1];
    if (!(key in db.modules)) return sendJson(response, 404, { error: "Module not found" });
    const body = await readJsonBody(request);
    db.modules[key] = Boolean(body.enabled);
    addAudit(currentUser, "module:update", `${key} ${db.modules[key] ? "on" : "off"}`);
    saveDatabase(db);
    sendJson(response, 200, { modules: db.modules });
    return;
  }

  if (url.pathname === "/api/feature-visibility" && request.method === "PATCH") {
    requirePermission(currentUser, "all");
    requireFeature(currentUser, "settings");
    const body = await readJsonBody(request);
    const role = cleanText(body.role || "");
    if (!permissionsByRole[role]) return sendJson(response, 400, { error: "Invalid role" });
    if (role === "Admin") return sendJson(response, 400, { error: "Admin features cannot be hidden" });
    const hiddenFeatures = Array.isArray(body.hiddenFeatures) ? body.hiddenFeatures : [];
    db.featureVisibility[role] = [...new Set(hiddenFeatures.filter((feature) => featureKeys.includes(feature) && feature !== "dashboard"))];
    addAudit(currentUser, "feature-visibility:update", `${role}: ${db.featureVisibility[role].join(", ") || "all default"}`);
    saveDatabase(db);
    sendJson(response, 200, {
      featureVisibility: db.featureVisibility,
      roleFeatureDefaults: roleFeatureDefaults(),
    });
    return;
  }

  sendJson(response, 404, { error: "API route not found" });
}

function serveStatic(requestPath, response) {
  const safePath = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    const indexPath = path.join(PUBLIC_DIR, "index.html");
    response.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    response.end(fs.readFileSync(indexPath));
    return;
  }

  const ext = path.extname(filePath);
  response.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  response.end(fs.readFileSync(filePath));
}

function loadDatabase() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const fresh = initialDatabase();
    saveDatabase(fresh);
    return fresh;
  }

  try {
    const loaded = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
    return migrateDatabase(loaded);
  } catch (error) {
    console.error("Failed to read database.json. The file was not modified.", error);
    return initialDatabase();
  }
}

function saveDatabase(nextDb) {
  migrateDatabase(nextDb);
  updateAccountBalances(nextDb);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(nextDb, null, 2));
}

function initialDatabase() {
  const now = new Date().toISOString();
  return migrateDatabase({
    settings: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
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
    },
    modules: {
      barcode: true,
      payments: true,
      delivery: true,
      accounting: true,
    },
    featureVisibility: defaultFeatureVisibility(),
    suppliers: [],
    customers: [],
    medicines: [],
    purchases: [],
    sales: [],
    customerPayments: [],
    deliveryReceipts: [],
    supplierPayments: [],
    expenseCategories: [...expenseCategories],
    expenses: [],
    salaryPayments: [],
    withdrawals: [],
    bankAccounts: defaultAccounts(now),
    accountTransactions: [],
    internalTransfers: [],
    users: [
      createUser({ id: "usr-1", name: "Omar Alnawaa", role: "Admin", email: "admin@alnawaaerp.com", status: "Active", password: "admin123" }),
    ],
    auditLogs: [],
  });
}

function migrateDatabase(source) {
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
    purchase.total = moneyNumber(purchase.total) ?? roundMoney((purchase.quantity || 0) * (purchase.unitCost || 0));
    purchase.paidAmount = moneyNumber(purchase.paidAmount) ?? 0;
    purchase.remainingBalance = roundMoney(Math.max(purchase.total - purchase.paidAmount, 0));
    purchase.paymentStatus = purchase.remainingBalance <= 0 ? "Paid" : purchase.paidAmount > 0 ? "Partially Paid" : "Unpaid";
  }

  for (const sale of dbToMigrate.sales) {
    const existingItems = Array.isArray(sale.items) ? sale.items : [];
    sale.items = existingItems.length ? existingItems : saleItemsFromLegacySale(sale, dbToMigrate);
    for (const item of sale.items) {
      const medicine = dbToMigrate.medicines.find((entry) => entry.id === item.medicineId);
      item.name = item.name || item.medicineName || item.productName || medicine?.name || "";
      item.sku = item.sku || medicine?.sku || "";
      item.batch = item.batch || medicine?.batch || "";
      item.productionDate = item.productionDate || medicine?.productionDate || "";
      item.expiry = item.expiry || medicine?.expiry || "";
      item.unitCost = moneyNumber(item.unitCost) ?? medicine?.cost ?? 0;
      item.unitPrice = moneyNumber(item.unitPrice) ?? medicine?.price ?? 0;
      item.quantity = positiveNumber(item.quantity);
      item.lineTotal = roundMoney(item.quantity * item.unitPrice);
    }
    sale.bonusItems = Array.isArray(sale.bonusItems) ? sale.bonusItems : [];
    for (const item of sale.bonusItems) {
      const medicine = dbToMigrate.medicines.find((entry) => entry.id === item.medicineId);
      item.name = item.name || medicine?.name || "";
      item.sku = item.sku || medicine?.sku || "";
      item.batch = item.batch || medicine?.batch || "";
      item.productionDate = item.productionDate || medicine?.productionDate || "";
      item.expiry = item.expiry || medicine?.expiry || "";
      item.unitCost = moneyNumber(item.unitCost) ?? medicine?.cost ?? 0;
      item.unitPrice = 0;
      item.quantity = positiveNumber(item.quantity);
      item.lineTotal = 0;
      item.isBonus = true;
    }
    sale.total = roundMoney(sale.items.reduce((sum, item) => sum + item.lineTotal, 0));
    sale.paymentReceiptIds = Array.isArray(sale.paymentReceiptIds) ? sale.paymentReceiptIds : [];
    sale.deliveryReceiptIds = Array.isArray(sale.deliveryReceiptIds) ? sale.deliveryReceiptIds : [];
    recalculateSalePaymentStatus(sale, dbToMigrate);
  }

  for (const receipt of dbToMigrate.deliveryReceipts) {
    receipt.items = Array.isArray(receipt.items) ? receipt.items : [];
    receipt.bonusItems = Array.isArray(receipt.bonusItems) ? receipt.bonusItems : [];
  }

  for (const account of dbToMigrate.bankAccounts) {
    account.openingBalance = moneyNumber(account.openingBalance) ?? 0;
    account.currentBalance = moneyNumber(account.currentBalance) ?? account.openingBalance;
    account.totalDeposits = moneyNumber(account.totalDeposits) ?? 0;
    account.totalWithdrawals = moneyNumber(account.totalWithdrawals) ?? 0;
    account.active = account.active !== false;
  }

  dbToMigrate.settings.schemaVersion = CURRENT_SCHEMA_VERSION;
  updateAccountBalances(dbToMigrate);
  return dbToMigrate;
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

function roleFeatureDefaults() {
  return Object.fromEntries(Object.keys(permissionsByRole).map((role) => [
    role,
    featureCatalog.filter((feature) => hasBaseFeatureAccess(role, feature.key)).map((feature) => feature.key),
  ]));
}

function hasBaseFeatureAccess(role, featureKey) {
  if (role === "Admin") return true;
  const feature = featureCatalog.find((item) => item.key === featureKey);
  if (!feature) return false;
  if (!feature.permissions.length) return true;
  const allowed = permissionsByRole[role] || [];
  return feature.permissions.some((permission) => allowed.includes("all") || allowed.includes(permission));
}

function canAccessFeature(user, featureKey, source = db) {
  if (!user) return false;
  if (user.role === "Admin" || hasPermission(user, "all")) return true;
  if (!hasBaseFeatureAccess(user.role, featureKey)) return false;
  const hidden = source.featureVisibility?.[user.role] || [];
  return !hidden.includes(featureKey);
}

function requireFeature(user, featureKey) {
  if (!canAccessFeature(user, featureKey)) throwError("This feature is hidden for your role", 403);
}

function requireAnyFeature(user, featureList) {
  if (!featureList.some((feature) => canAccessFeature(user, feature))) {
    throwError("This feature is hidden for your role", 403);
  }
}

function deleteMedicine(medicineId, currentUser) {
  const index = db.medicines.findIndex((item) => item.id === medicineId);
  if (index === -1) throwError("Medicine batch not found", 404);

  const medicine = db.medicines[index];
  const usedInSales = db.sales.some((sale) => [...(sale.items || []), ...(sale.bonusItems || [])].some((item) => item.medicineId === medicine.id));
  const usedInPurchases = db.purchases.some((purchase) => purchase.medicineId === medicine.id);
  if (usedInSales || usedInPurchases) {
    throwError("This medicine batch is used in invoices or purchases. Delete those records first.", 400);
  }

  db.medicines.splice(index, 1);
  addAudit(currentUser, "medicine:delete", `${medicine.name} ${medicine.batch}`);
  return medicine;
}

function deleteSupplier(supplierId, currentUser) {
  const index = db.suppliers.findIndex((item) => item.id === supplierId);
  if (index === -1) throwError("Supplier not found", 404);

  const supplier = db.suppliers[index];
  if (db.medicines.some((medicine) => medicine.supplierId === supplier.id) || db.purchases.some((purchase) => purchase.supplierId === supplier.id)) {
    throwError("This supplier is used by medicines or purchases. Delete those records first.", 400);
  }
  if (db.supplierPayments.some((payment) => payment.supplierId === supplier.id)) {
    throwError("This supplier has payment vouchers. Delete those vouchers first.", 400);
  }

  db.suppliers.splice(index, 1);
  addAudit(currentUser, "supplier:delete", supplier.name);
  return supplier;
}

function deleteCustomer(customerId, currentUser) {
  const index = db.customers.findIndex((item) => item.id === customerId);
  if (index === -1) throwError("Customer not found", 404);

  const customer = db.customers[index];
  if (db.sales.some((sale) => sale.customerId === customer.id) || db.customerPayments.some((payment) => payment.customerId === customer.id)) {
    throwError("This customer has invoices or payment receipts. Delete those records first.", 400);
  }
  if (db.deliveryReceipts.some((receipt) => receipt.customerId === customer.id)) {
    throwError("This customer has delivery receipts. Delete those receipts first.", 400);
  }

  db.customers.splice(index, 1);
  addAudit(currentUser, "customer:delete", customer.name);
  return customer;
}

function createPurchase(body, currentUser) {
  const medicine = db.medicines.find((item) => item.id === body.medicineId);
  const supplier = db.suppliers.find((item) => item.id === body.supplierId);
  if (!medicine || !supplier) throwError("Valid medicine and supplier are required", 400);

  const quantity = positiveNumber(body.quantity);
  const unitCost = moneyNumber(body.unitCost);
  if (!quantity || unitCost === null) throwError("Valid quantity and unit cost are required", 400);

  const paidAmount = moneyNumber(body.paidAmount) ?? 0;
  const total = roundMoney(quantity * unitCost);
  if (paidAmount > total) throwError("Paid amount cannot exceed purchase total", 400);

  const purchase = {
    id: newId("pur"),
    invoiceNumber: cleanText(body.invoiceNumber || ""),
    date: body.date || dateOnly(),
    supplierId: supplier.id,
    medicineId: medicine.id,
    quantity,
    unitCost,
    total,
    paidAmount: 0,
    remainingBalance: total,
    paymentStatus: "Unpaid",
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };

  medicine.stock += quantity;
  medicine.cost = unitCost;
  medicine.supplierId = supplier.id;
  db.purchases.push(purchase);

  if (paidAmount > 0) {
    createSupplierPayment(purchase.id, {
      amount: paidAmount,
      method: body.paymentMethod || "Cash",
      accountId: body.accountId || defaultCashAccount().id,
      notes: "Initial purchase payment",
    }, currentUser);
  }

  recalculatePurchasePaymentStatus(purchase);
  addAudit(currentUser, "purchase:create", `${medicine.name} x ${quantity}`);
  return purchase;
}

function deletePurchase(purchaseId, currentUser) {
  const index = db.purchases.findIndex((item) => item.id === purchaseId);
  if (index === -1) throwError("Purchase invoice not found", 404);

  const purchase = db.purchases[index];
  const medicine = db.medicines.find((item) => item.id === purchase.medicineId);
  if (medicine && medicine.stock < purchase.quantity) {
    throwError("This purchase cannot be deleted because some of its stock may already be sold.", 400);
  }

  const payments = db.supplierPayments.filter((payment) => payment.purchaseId === purchase.id);
  for (const payment of payments) {
    reverseAccountTransaction(payment.accountTransactionId);
  }
  db.supplierPayments = db.supplierPayments.filter((payment) => payment.purchaseId !== purchase.id);

  if (medicine) medicine.stock -= purchase.quantity;
  db.purchases.splice(index, 1);
  addAudit(currentUser, "purchase:delete", purchase.invoiceNumber || purchase.id);
  return purchase;
}

function createSale(body, currentUser) {
  const customer = db.customers.find((item) => item.id === body.customerId);
  if (!customer) throwError("Valid customer is required", 400);

  const items = normalizeSaleItems(body.items, currentUser, {
    allowExpiredOverride: body.allowExpiredOverride,
    skipInventoryValidation: true,
  });
  const bonusItems = normalizeBonusItems(body.bonusItems, currentUser, {
    allowExpiredOverride: body.allowExpiredOverride,
  });
  validateSaleInventory([...items, ...bonusItems]);
  const total = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const sale = {
    id: newId("sale"),
    invoiceNumber: `INV-${db.settings.nextInvoice++}`,
    date: normalizeDateOnly(body.date),
    customerId: customer.id,
    items,
    bonusItems,
    total,
    totalPaid: 0,
    remainingBalance: total,
    paymentStatus: "Unpaid",
    deliveryStatus: ["Ready", "Scheduled", "Delivered"].includes(body.deliveryStatus) ? body.deliveryStatus : "Ready",
    notes: cleanText(body.notes || ""),
    paymentReceiptIds: [],
    deliveryReceiptIds: [],
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  deductSaleItemsFromInventory([...items, ...bonusItems]);
  db.sales.push(sale);

  const initialPayment = moneyNumber(body.initialPaymentAmount) ?? 0;
  if (initialPayment > 0) {
    createCustomerPayment(sale.id, {
      amount: initialPayment,
      method: body.paymentMethod || "Cash",
      accountId: body.accountId || defaultCashAccount().id,
      notes: "Initial invoice payment",
    }, currentUser);
  }

  recalculateSalePaymentStatus(sale);
  addAudit(currentUser, "sale:create", `${sale.invoiceNumber} ${customer.name}`);
  return sale;
}

function updateSale(saleId, body, currentUser) {
  const sale = db.sales.find((item) => item.id === saleId);
  if (!sale) throwError("Invoice not found", 404);

  const customer = db.customers.find((item) => item.id === body.customerId);
  if (!customer) throwError("Valid customer is required", 400);

  const restoredQuantities = quantitiesByMedicine([...(sale.items || []), ...(sale.bonusItems || [])]);
  const items = normalizeSaleItems(body.items, currentUser, {
    allowExpiredOverride: body.allowExpiredOverride,
    availableAdjustments: restoredQuantities,
    skipInventoryValidation: true,
  });
  const bonusItems = normalizeBonusItems(body.bonusItems, currentUser, {
    allowExpiredOverride: body.allowExpiredOverride,
  });
  validateSaleInventory([...items, ...bonusItems], restoredQuantities);
  const total = roundMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const paid = roundMoney(db.customerPayments.filter((payment) => payment.saleId === sale.id).reduce((sum, payment) => sum + payment.amount, 0));
  if (paid > total) {
    throwError(`Invoice total cannot be lower than recorded payments of ${paid}. Delete or adjust payments first.`, 400);
  }

  restoreSaleItemsToInventory([...(sale.items || []), ...(sale.bonusItems || [])]);
  deductSaleItemsFromInventory([...items, ...bonusItems]);

  sale.customerId = customer.id;
  sale.date = normalizeDateOnly(body.date, sale.date || dateOnly());
  sale.items = items;
  sale.bonusItems = bonusItems;
  sale.total = total;
  sale.deliveryStatus = ["Ready", "Scheduled", "Delivered"].includes(body.deliveryStatus) ? body.deliveryStatus : sale.deliveryStatus || "Ready";
  sale.notes = cleanText(body.notes || "");
  sale.updatedBy = currentUser.id;
  sale.updatedAt = new Date().toISOString();
  syncSaleLinkedDocuments(sale, customer);
  recalculateSalePaymentStatus(sale);

  addAudit(currentUser, "sale:update", `${sale.invoiceNumber} ${customer.name}`);
  return sale;
}

function deleteSale(saleId, currentUser) {
  const saleIndex = db.sales.findIndex((item) => item.id === saleId);
  if (saleIndex === -1) throwError("Invoice not found", 404);

  const sale = db.sales[saleIndex];
  restoreSaleItemsToInventory([...(sale.items || []), ...(sale.bonusItems || [])]);

  const payments = db.customerPayments.filter((payment) => payment.saleId === sale.id);
  for (const payment of payments) {
    reverseAccountTransaction(payment.accountTransactionId);
  }
  db.customerPayments = db.customerPayments.filter((payment) => payment.saleId !== sale.id);
  db.deliveryReceipts = db.deliveryReceipts.filter((receipt) => receipt.saleId !== sale.id);
  db.sales.splice(saleIndex, 1);
  addAudit(currentUser, "sale:delete", sale.invoiceNumber);
  return sale;
}

function normalizeSaleItems(rawItems, currentUser, options = {}) {
  const items = [];
  const sourceItems = Array.isArray(rawItems) ? rawItems : [];
  if (!sourceItems.length) throwError("At least one sale item is required", 400);

  for (const item of sourceItems) {
    const medicine = db.medicines.find((entry) => entry.id === item.medicineId);
    if (!medicine) throwError("Sale includes an unknown medicine batch", 400);
    const quantity = positiveNumber(item.quantity);
    const unitPrice = item.unitPrice === undefined || item.unitPrice === "" ? medicine.price : moneyNumber(item.unitPrice);
    if (!quantity || unitPrice === null) throwError("Valid quantity and price are required", 400);
    if (isExpired(medicine.expiry) && !(options.allowExpiredOverride && currentUser.role === "Admin")) {
      throwError(`${medicine.name} batch ${medicine.batch} is expired and cannot be sold without admin override`, 409);
    }

    items.push({
      medicineId: medicine.id,
      name: medicine.name,
      sku: medicine.sku,
      batch: medicine.batch,
      productionDate: medicine.productionDate || "",
      expiry: medicine.expiry || "",
      quantity,
      unitPrice,
      unitCost: medicine.cost,
      lineTotal: roundMoney(quantity * unitPrice),
    });
  }

  if (!options.skipInventoryValidation) validateSaleInventory(items, options.availableAdjustments);

  return items;
}

function normalizeBonusItems(rawItems, currentUser, options = {}) {
  const items = [];
  const sourceItems = Array.isArray(rawItems) ? rawItems : [];

  for (const item of sourceItems) {
    const medicine = db.medicines.find((entry) => entry.id === item.medicineId);
    if (!medicine) throwError("Bonus includes an unknown medicine batch", 400);
    const quantity = positiveNumber(item.quantity);
    if (!quantity) throwError("Valid bonus quantity is required", 400);
    if (isExpired(medicine.expiry) && !(options.allowExpiredOverride && currentUser.role === "Admin")) {
      throwError(`${medicine.name} batch ${medicine.batch} is expired and cannot be added as a bonus without admin override`, 409);
    }

    items.push({
      medicineId: medicine.id,
      name: medicine.name,
      sku: medicine.sku,
      batch: medicine.batch,
      productionDate: medicine.productionDate || "",
      expiry: medicine.expiry || "",
      quantity,
      unitPrice: 0,
      unitCost: medicine.cost,
      lineTotal: 0,
      isBonus: true,
    });
  }

  return items;
}

function validateSaleInventory(items, availableAdjustments) {
  const requiredQuantities = quantitiesByMedicine(items);
  for (const [medicineId, requiredQuantity] of requiredQuantities.entries()) {
    const medicine = db.medicines.find((entry) => entry.id === medicineId);
    const available = medicine.stock + Number(availableAdjustments?.get(medicineId) || 0);
    if (available < requiredQuantity) {
      throwError(`${medicine.name} batch ${medicine.batch} only has ${available} units available`, 409);
    }
  }
}

function quantitiesByMedicine(items) {
  return items.reduce((totals, item) => {
    totals.set(item.medicineId, (totals.get(item.medicineId) || 0) + Number(item.quantity || 0));
    return totals;
  }, new Map());
}

function restoreSaleItemsToInventory(items) {
  for (const item of items) {
    const medicine = db.medicines.find((entry) => entry.id === item.medicineId);
    if (medicine) medicine.stock += Number(item.quantity || 0);
  }
}

function deductSaleItemsFromInventory(items) {
  for (const item of items) {
    const medicine = db.medicines.find((entry) => entry.id === item.medicineId);
    medicine.stock -= Number(item.quantity || 0);
  }
}

function syncSaleLinkedDocuments(sale, customer) {
  const deliveryItems = sale.items.map((item) => ({
    medicineId: item.medicineId,
    name: item.name,
    batch: item.batch,
    expiry: item.expiry,
    quantity: item.quantity,
  }));
  const bonusDeliveryItems = (sale.bonusItems || []).map((item) => ({
    medicineId: item.medicineId,
    name: item.name,
    batch: item.batch,
    expiry: item.expiry,
    quantity: item.quantity,
    isBonus: true,
  }));

  for (const payment of db.customerPayments.filter((item) => item.saleId === sale.id)) {
    payment.customerId = customer.id;
    payment.invoiceTotal = sale.total;
    payment.remainingBalance = roundMoney(Math.max(sale.total - Number(payment.totalPaidSoFar || payment.amount || 0), 0));
  }

  for (const receipt of db.deliveryReceipts.filter((item) => item.saleId === sale.id)) {
    receipt.customerId = customer.id;
    receipt.customerName = customer.name;
    receipt.total = sale.total;
    receipt.items = deliveryItems.map((item) => ({ ...item }));
    receipt.bonusItems = bonusDeliveryItems.map((item) => ({ ...item }));
  }
}

function createCustomerPayment(saleId, body, currentUser) {
  const sale = db.sales.find((item) => item.id === saleId);
  if (!sale) throwError("Invoice not found", 404);
  const customer = db.customers.find((item) => item.id === sale.customerId);
  const amount = moneyNumber(body.amount);
  if (!amount || amount <= 0) throwError("Payment amount must be greater than zero", 400);
  const remaining = remainingBalance(sale);
  if (amount > remaining) throwError(`Payment cannot exceed remaining balance of ${remaining}`, 400);
  const account = requireAccount(body.accountId || defaultCashAccount().id);
  const receiptNumber = `RCPT-${db.settings.nextPaymentReceipt++}`;

  const payment = {
    id: newId("pay"),
    receiptNumber,
    date: body.date || dateOnly(),
    saleId: sale.id,
    customerId: sale.customerId,
    invoiceNumber: sale.invoiceNumber,
    invoiceTotal: sale.total,
    amount,
    method: cleanText(body.method || "Cash"),
    bankAccountId: account.id,
    bankAccountName: account.name,
    notes: cleanText(body.notes || ""),
    receivedBy: currentUser.name,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };

  const totalPaidSoFar = roundMoney(db.customerPayments.filter((item) => item.saleId === sale.id).reduce((sum, item) => sum + item.amount, 0) + amount);
  payment.totalPaidSoFar = totalPaidSoFar;
  payment.remainingBalance = roundMoney(Math.max(sale.total - totalPaidSoFar, 0));
  payment.accountTransactionId = addAccountTransaction({
    accountId: account.id,
    date: payment.date,
    type: "deposit",
    source: "customer_payment",
    sourceId: payment.id,
    description: `${receiptNumber} ${customer?.name || ""} ${sale.invoiceNumber}`.trim(),
    amount,
    createdBy: currentUser.id,
  });

  db.customerPayments.push(payment);
  sale.paymentReceiptIds.push(payment.id);
  recalculateSalePaymentStatus(sale);
  addAudit(currentUser, "customer-payment:create", `${receiptNumber} ${sale.invoiceNumber}`);
  return payment;
}

function deleteCustomerPayment(paymentId, currentUser) {
  const index = db.customerPayments.findIndex((item) => item.id === paymentId);
  if (index === -1) throwError("Payment receipt not found", 404);

  const payment = db.customerPayments[index];
  reverseAccountTransaction(payment.accountTransactionId);
  db.customerPayments.splice(index, 1);

  const sale = db.sales.find((item) => item.id === payment.saleId);
  if (sale) {
    sale.paymentReceiptIds = (sale.paymentReceiptIds || []).filter((id) => id !== payment.id);
    recalculateSalePaymentStatus(sale);
  }

  addAudit(currentUser, "customer-payment:delete", payment.receiptNumber);
  return payment;
}

function createDeliveryReceipt(saleId, body, currentUser) {
  const sale = db.sales.find((item) => item.id === saleId);
  if (!sale) throwError("Invoice not found", 404);
  const customer = db.customers.find((item) => item.id === sale.customerId);
  const receipt = {
    id: newId("del"),
    receiptNumber: `GDR-${db.settings.nextDeliveryReceipt++}`,
    saleId: sale.id,
    invoiceNumber: sale.invoiceNumber,
    date: body.date || dateOnly(),
    customerId: sale.customerId,
    customerName: customer?.name || "",
    customerType: cleanText(body.customerType || customer?.type || "Customer"),
    receiverName: cleanText(body.receiverName || ""),
    receiverPhone: cleanText(body.receiverPhone || ""),
    deliveryPerson: cleanText(body.deliveryPerson || currentUser.name),
    notes: cleanText(body.notes || ""),
    total: sale.total,
    items: sale.items.map((item) => ({
      medicineId: item.medicineId,
      name: item.name,
      batch: item.batch,
      expiry: item.expiry,
      quantity: item.quantity,
    })),
    bonusItems: (sale.bonusItems || []).map((item) => ({
      medicineId: item.medicineId,
      name: item.name,
      batch: item.batch,
      expiry: item.expiry,
      quantity: item.quantity,
      isBonus: true,
    })),
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  db.deliveryReceipts.push(receipt);
  sale.deliveryReceiptIds.push(receipt.id);
  sale.deliveryStatus = "Delivered";
  addAudit(currentUser, "delivery-receipt:create", `${receipt.receiptNumber} ${sale.invoiceNumber}`);
  return receipt;
}

function deleteDeliveryReceipt(receiptId, currentUser) {
  const index = db.deliveryReceipts.findIndex((item) => item.id === receiptId);
  if (index === -1) throwError("Delivery receipt not found", 404);

  const receipt = db.deliveryReceipts[index];
  db.deliveryReceipts.splice(index, 1);

  const sale = db.sales.find((item) => item.id === receipt.saleId);
  if (sale) {
    sale.deliveryReceiptIds = (sale.deliveryReceiptIds || []).filter((id) => id !== receipt.id);
    if (!sale.deliveryReceiptIds.length && sale.deliveryStatus === "Delivered") sale.deliveryStatus = "Ready";
  }

  addAudit(currentUser, "delivery-receipt:delete", receipt.receiptNumber);
  return receipt;
}

function createSupplierPayment(purchaseId, body, currentUser) {
  const purchase = db.purchases.find((item) => item.id === purchaseId);
  if (!purchase) throwError("Purchase invoice not found", 404);
  const supplier = db.suppliers.find((item) => item.id === purchase.supplierId);
  const amount = moneyNumber(body.amount);
  if (!amount || amount <= 0) throwError("Payment amount must be greater than zero", 400);
  if (amount > purchase.remainingBalance) throwError("Supplier payment cannot exceed remaining purchase balance", 400);
  const account = requireAccount(body.accountId || defaultCashAccount().id);
  const payment = {
    id: newId("spay"),
    voucherNumber: `SPV-${db.settings.nextSupplierPayment++}`,
    date: body.date || dateOnly(),
    purchaseId,
    supplierId: purchase.supplierId,
    supplierName: supplier?.name || "",
    amount,
    method: cleanText(body.method || "Cash"),
    bankAccountId: account.id,
    bankAccountName: account.name,
    notes: cleanText(body.notes || ""),
    paidBy: currentUser.name,
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  payment.accountTransactionId = addAccountTransaction({
    accountId: account.id,
    date: payment.date,
    type: "withdrawal",
    source: "supplier_payment",
    sourceId: payment.id,
    description: `${payment.voucherNumber} ${supplier?.name || ""}`.trim(),
    amount: -amount,
    createdBy: currentUser.id,
  });
  db.supplierPayments.push(payment);
  purchase.paidAmount = roundMoney((purchase.paidAmount || 0) + amount);
  recalculatePurchasePaymentStatus(purchase);
  payment.totalPaidSoFar = purchase.paidAmount;
  payment.remainingBalance = purchase.remainingBalance;
  addAudit(currentUser, "supplier-payment:create", payment.voucherNumber);
  return payment;
}

function deleteSupplierPayment(paymentId, currentUser) {
  const index = db.supplierPayments.findIndex((item) => item.id === paymentId);
  if (index === -1) throwError("Supplier payment voucher not found", 404);

  const payment = db.supplierPayments[index];
  reverseAccountTransaction(payment.accountTransactionId);
  db.supplierPayments.splice(index, 1);

  const purchase = db.purchases.find((item) => item.id === payment.purchaseId);
  if (purchase) {
    purchase.paidAmount = roundMoney(Math.max((purchase.paidAmount || 0) - payment.amount, 0));
    recalculatePurchasePaymentStatus(purchase);
  }

  addAudit(currentUser, "supplier-payment:delete", payment.voucherNumber);
  return payment;
}

function createExpense(body, currentUser, source = "expense") {
  const amount = moneyNumber(body.amount);
  if (!amount || amount <= 0) throwError("Expense amount must be greater than zero", 400);
  const account = requireAccount(body.accountId || defaultCashAccount().id);
  const category = cleanText(body.category || "Other expenses");
  if (!db.expenseCategories.includes(category)) db.expenseCategories.push(category);
  const expense = {
    id: newId("exp"),
    expenseNumber: `EXP-${db.settings.nextExpense++}`,
    date: body.date || dateOnly(),
    category,
    amount,
    method: cleanText(body.method || "Cash"),
    paidFromAccountId: account.id,
    paidFromAccountName: account.name,
    notes: cleanText(body.notes || ""),
    attachmentName: cleanText(body.attachmentName || ""),
    source,
    createdBy: currentUser.id,
    createdByName: currentUser.name,
    createdAt: new Date().toISOString(),
  };
  expense.accountTransactionId = addAccountTransaction({
    accountId: account.id,
    date: expense.date,
    type: "withdrawal",
    source,
    sourceId: expense.id,
    description: `${expense.expenseNumber} ${category}`,
    amount: -amount,
    createdBy: currentUser.id,
  });
  db.expenses.push(expense);
  addAudit(currentUser, "expense:create", `${expense.expenseNumber} ${category}`);
  return expense;
}

function deleteExpense(expenseId, currentUser, options = {}) {
  const index = db.expenses.findIndex((item) => item.id === expenseId);
  if (index === -1) throwError("Expense not found", 404);

  const expense = db.expenses[index];
  reverseAccountTransaction(expense.accountTransactionId);
  db.expenses.splice(index, 1);

  if (expense.source === "salary" && !options.skipSalaryRemoval) {
    db.salaryPayments = db.salaryPayments.filter((salary) => salary.expenseId !== expense.id);
  }

  addAudit(currentUser, "expense:delete", expense.expenseNumber);
  return expense;
}

function createSalaryPayment(body, currentUser) {
  const baseSalary = moneyNumber(body.baseSalary) ?? 0;
  const deductions = moneyNumber(body.deductions) ?? 0;
  const bonuses = moneyNumber(body.bonuses) ?? 0;
  const advances = moneyNumber(body.advances) ?? 0;
  const netPaid = moneyNumber(body.netPaidAmount) ?? roundMoney(baseSalary + bonuses - deductions - advances);
  if (netPaid <= 0) throwError("Net salary amount must be greater than zero", 400);
  const account = requireAccount(body.accountId || defaultCashAccount().id);
  const salary = {
    id: newId("sal"),
    date: body.date || dateOnly(),
    employeeName: cleanText(body.employeeName || ""),
    month: cleanText(body.month || dateOnly().slice(0, 7)),
    baseSalary,
    deductions,
    bonuses,
    advances,
    netPaidAmount: netPaid,
    method: cleanText(body.method || "Cash"),
    paidFromAccountId: account.id,
    paidFromAccountName: account.name,
    notes: cleanText(body.notes || ""),
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  db.salaryPayments.push(salary);
  const expense = createExpense({
    date: salary.date,
    category: "Salaries",
    amount: netPaid,
    method: salary.method,
    accountId: account.id,
    notes: `Salary payment for ${salary.employeeName} ${salary.month}`,
  }, currentUser, "salary");
  salary.expenseId = expense.id;
  addAudit(currentUser, "salary:create", `${salary.employeeName} ${salary.month}`);
  return salary;
}

function deleteSalaryPayment(salaryId, currentUser) {
  const index = db.salaryPayments.findIndex((item) => item.id === salaryId);
  if (index === -1) throwError("Salary payment not found", 404);

  const salary = db.salaryPayments[index];
  if (salary.expenseId && db.expenses.some((expense) => expense.id === salary.expenseId)) {
    deleteExpense(salary.expenseId, currentUser, { skipSalaryRemoval: true });
  }
  db.salaryPayments.splice(index, 1);
  addAudit(currentUser, "salary:delete", `${salary.employeeName} ${salary.month}`);
  return salary;
}

function createWithdrawal(body, currentUser) {
  const amount = moneyNumber(body.amount);
  if (!amount || amount <= 0) throwError("Withdrawal amount must be greater than zero", 400);
  const account = requireAccount(body.accountId || defaultCashAccount().id);
  const withdrawal = {
    id: newId("wd"),
    date: body.date || dateOnly(),
    type: cleanText(body.type || "Other withdrawals"),
    amount,
    withdrawnBy: cleanText(body.withdrawnBy || currentUser.name),
    accountId: account.id,
    accountName: account.name,
    reason: cleanText(body.reason || ""),
    notes: cleanText(body.notes || ""),
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  withdrawal.accountTransactionId = addAccountTransaction({
    accountId: account.id,
    date: withdrawal.date,
    type: "withdrawal",
    source: "withdrawal",
    sourceId: withdrawal.id,
    description: `${withdrawal.type} ${withdrawal.withdrawnBy}`,
    amount: -amount,
    createdBy: currentUser.id,
  });
  db.withdrawals.push(withdrawal);
  addAudit(currentUser, "withdrawal:create", `${withdrawal.type} ${amount}`);
  return withdrawal;
}

function deleteWithdrawal(withdrawalId, currentUser) {
  const index = db.withdrawals.findIndex((item) => item.id === withdrawalId);
  if (index === -1) throwError("Withdrawal not found", 404);

  const withdrawal = db.withdrawals[index];
  reverseAccountTransaction(withdrawal.accountTransactionId);
  db.withdrawals.splice(index, 1);
  addAudit(currentUser, "withdrawal:delete", `${withdrawal.type} ${withdrawal.amount}`);
  return withdrawal;
}

function createBankAccount(body, currentUser) {
  if (!body.name) throwError("Account name is required", 400);
  const account = {
    id: newId("acct"),
    name: cleanText(body.name),
    type: body.type === "Cashbox" ? "Cashbox" : "Bank",
    openingBalance: moneyNumber(body.openingBalance) ?? 0,
    currentBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.bankAccounts.push(account);
  updateAccountBalances(db);
  addAudit(currentUser, "bank-account:create", account.name);
  return account;
}

function deleteBankAccount(accountId, currentUser) {
  const index = db.bankAccounts.findIndex((item) => item.id === accountId);
  if (index === -1) throwError("Bank account not found", 404);

  const account = db.bankAccounts[index];
  if (["acct-cashbox", "acct-al-nouran", "acct-jumhouria"].includes(account.id)) {
    throwError("Default cashbox and bank accounts cannot be deleted.", 400);
  }
  if (db.accountTransactions.some((transaction) => transaction.accountId === account.id && !transaction.reversed)) {
    throwError("This account has active transactions. Delete or reverse those records first.", 400);
  }

  db.bankAccounts.splice(index, 1);
  addAudit(currentUser, "bank-account:delete", account.name);
  return account;
}

function createInternalTransfer(body, currentUser) {
  const from = requireAccount(body.fromAccountId);
  const to = requireAccount(body.toAccountId);
  if (from.id === to.id) throwError("Transfer accounts must be different", 400);
  const amount = moneyNumber(body.amount);
  if (!amount || amount <= 0) throwError("Transfer amount must be greater than zero", 400);
  const transfer = {
    id: newId("trf"),
    transferNumber: `TRF-${db.settings.nextTransfer++}`,
    date: body.date || dateOnly(),
    fromAccountId: from.id,
    fromAccountName: from.name,
    toAccountId: to.id,
    toAccountName: to.name,
    amount,
    notes: cleanText(body.notes || ""),
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
  };
  transfer.outTransactionId = addAccountTransaction({
    accountId: from.id,
    date: transfer.date,
    type: "withdrawal",
    source: "internal_transfer",
    sourceId: transfer.id,
    description: `${transfer.transferNumber} to ${to.name}`,
    amount: -amount,
    createdBy: currentUser.id,
  });
  transfer.inTransactionId = addAccountTransaction({
    accountId: to.id,
    date: transfer.date,
    type: "deposit",
    source: "internal_transfer",
    sourceId: transfer.id,
    description: `${transfer.transferNumber} from ${from.name}`,
    amount,
    createdBy: currentUser.id,
  });
  db.internalTransfers.push(transfer);
  addAudit(currentUser, "transfer:create", `${from.name} -> ${to.name}`);
  return transfer;
}

function deleteInternalTransfer(transferId, currentUser) {
  const index = db.internalTransfers.findIndex((item) => item.id === transferId);
  if (index === -1) throwError("Internal transfer not found", 404);

  const transfer = db.internalTransfers[index];
  reverseAccountTransaction(transfer.outTransactionId);
  reverseAccountTransaction(transfer.inTransactionId);
  db.internalTransfers.splice(index, 1);
  addAudit(currentUser, "transfer:delete", transfer.transferNumber);
  return transfer;
}

function addAccountTransaction({ accountId, date, type, source, sourceId, description, amount, createdBy }) {
  const account = requireAccount(accountId);
  const transaction = {
    id: newId("txn"),
    accountId: account.id,
    accountName: account.name,
    date: date || dateOnly(),
    type,
    source,
    sourceId,
    description: cleanText(description || source),
    amount: roundMoney(amount),
    createdBy,
    createdAt: new Date().toISOString(),
  };
  db.accountTransactions.push(transaction);
  updateAccountBalances(db);
  return transaction.id;
}

function reverseAccountTransaction(transactionId) {
  const transaction = db.accountTransactions.find((item) => item.id === transactionId);
  if (!transaction) return;
  transaction.reversed = true;
  updateAccountBalances(db);
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

function recalculateSalePaymentStatus(sale, source = db) {
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

function remainingBalance(sale) {
  recalculateSalePaymentStatus(sale);
  return sale.remainingBalance;
}

function defaultCashAccount() {
  const account = db.bankAccounts.find((item) => item.id === "acct-cashbox") || db.bankAccounts.find((item) => item.type === "Cashbox") || db.bankAccounts[0];
  if (!account) throwError("No cashbox or bank account is configured", 400);
  return account;
}

function requireAccount(id) {
  const account = db.bankAccounts.find((item) => item.id === id);
  if (!account) throwError("Valid cashbox or bank account is required", 400);
  return account;
}

function normalizeMedicine(body, existingId, existingCreatedAt) {
  const required = ["name", "sku", "category", "batch", "supplierId", "expiry"];
  for (const field of required) {
    if (!String(body[field] || "").trim()) throwError(`${field} is required`, 400);
  }
  if (!db.suppliers.some((supplier) => supplier.id === body.supplierId)) {
    throwError("Valid supplier is required", 400);
  }
  return {
    id: existingId || newId("med"),
    name: cleanText(body.name),
    sku: cleanText(body.sku),
    category: cleanText(body.category),
    batch: cleanText(body.batch),
    productionDate: cleanText(body.productionDate || ""),
    supplierId: cleanText(body.supplierId),
    location: cleanText(body.location || ""),
    stock: nonNegativeNumber(body.stock),
    reorderLevel: nonNegativeNumber(body.reorderLevel),
    cost: moneyNumber(body.cost) ?? 0,
    price: moneyNumber(body.price) ?? 0,
    expiry: cleanText(body.expiry),
    createdAt: existingCreatedAt || body.createdAt || new Date().toISOString(),
  };
}

function normalizePartner(body, prefix) {
  if (!body.name || !body.phone) throwError("Name and phone are required", 400);
  return {
    id: newId(prefix === "supplier" ? "sup" : "cus"),
    name: cleanText(body.name),
    type: cleanText(body.type || (prefix === "customer" ? "Customer" : "Supplier")),
    phone: cleanText(body.phone),
    email: cleanText(body.email || ""),
    address: cleanText(body.address || ""),
    createdAt: new Date().toISOString(),
  };
}

function requirePermission(user, permission) {
  if (!hasPermission(user, permission)) throwError("You do not have permission for this action", 403);
}

function hasPermission(user, permission) {
  const allowed = permissionsByRole[user.role] || [];
  return allowed.includes("all") || allowed.includes(permission);
}

function getCurrentUser(request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token || !sessions.has(token)) return null;
  const session = sessions.get(token);
  const user = db.users.find((item) => item.id === session.userId);
  return user?.status === "Active" ? user : null;
}

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter((pair) => pair.length === 2)
  );
  return cookies[name] || "";
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sanitizeDatabase(source, user) {
  const canViewFinance = hasPermission(user, "viewAccounting") || hasPermission(user, "viewFinancialDashboard");
  const availableFeatures = featureCatalog.filter((feature) => canAccessFeature(user, feature.key, source)).map((feature) => feature.key);
  return {
    settings: source.settings,
    modules: source.modules,
    features: featureCatalog,
    featureVisibility: hasPermission(user, "all") ? source.featureVisibility : {},
    roleFeatureDefaults: hasPermission(user, "all") ? roleFeatureDefaults() : {},
    availableFeatures,
    suppliers: source.suppliers,
    customers: source.customers,
    medicines: source.medicines,
    purchases: source.purchases,
    sales: source.sales,
    users: canAccessFeature(user, "users", source) ? source.users.map(sanitizeUser) : [],
    customerPayments: canViewFinance || hasPermission(user, "sales") ? source.customerPayments : [],
    deliveryReceipts: source.deliveryReceipts,
    supplierPayments: canViewFinance ? source.supplierPayments : [],
    expenseCategories: source.expenseCategories,
    expenses: canViewFinance ? source.expenses : [],
    salaryPayments: canViewFinance ? source.salaryPayments : [],
    withdrawals: canViewFinance ? source.withdrawals : [],
    bankAccounts: canViewFinance ? source.bankAccounts : [],
    accountTransactions: canViewFinance ? source.accountTransactions : [],
    internalTransfers: canViewFinance ? source.internalTransfers : [],
    permissions: permissionsByRole[user.role] || [],
    auditLogs: source.auditLogs.slice(-50),
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    status: user.status,
  };
}

function updateOwnAccount(user, body) {
  const email = cleanText(body.email || "").toLowerCase();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const wantsEmailChange = email && email !== user.email.toLowerCase();
  const wantsPasswordChange = Boolean(newPassword);

  if (!wantsEmailChange && !wantsPasswordChange) {
    throwError("Enter a new email or password to update your account", 400);
  }
  if (!verifyPassword(currentPassword, user)) {
    throwError("Current password is incorrect", 401);
  }

  if (wantsEmailChange) {
    if (!email.includes("@") || !email.includes(".")) throwError("Enter a valid email address", 400);
    if (db.users.some((item) => item.id !== user.id && item.email.toLowerCase() === email)) {
      throwError("Another user already has this email", 409);
    }
    user.email = email;
  }

  if (wantsPasswordChange) {
    if (newPassword.length < 8) throwError("New password must be at least 8 characters", 400);
    setUserPassword(user, newPassword);
  }

  addAudit(user, "account:update", wantsEmailChange && wantsPasswordChange ? "email and password" : wantsEmailChange ? "email" : "password");
  return user;
}

function createUser({ id, name, role, email, status, password }) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: id || newId("usr"),
    name,
    role,
    email,
    status,
    salt,
    passwordHash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
}

function setUserPassword(user, password) {
  user.salt = crypto.randomBytes(16).toString("hex");
  user.passwordHash = hashPassword(password, user.salt);
}

function verifyPassword(password, user) {
  const hash = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash));
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 120_000, 32, "sha256").toString("hex");
}

function addAudit(user, action, detail) {
  db.auditLogs.push({
    id: newId("log"),
    at: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    action,
    detail,
  });
  db.auditLogs = db.auditLogs.slice(-200);
}

function throwError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
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

function normalizeDateOnly(value, fallback = dateOnly()) {
  const text = cleanText(value || "");
  if (!text) return fallback;
  const parsed = new Date(`${text}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throwError("Invoice date must be a valid YYYY-MM-DD date", 400);
  }
  return text;
}

function daysUntil(dateText) {
  if (!dateText) return Infinity;
  const target = new Date(`${dateText}T00:00:00`);
  const now = new Date();
  const ms = target.getTime() - now.setHours(0, 0, 0, 0);
  return Math.ceil(ms / 86400000);
}

function isExpired(dateText) {
  return daysUntil(dateText) < 0;
}

function newId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

process.on("uncaughtException", (error) => {
  if (error.statusCode) return;
  console.error(error);
});
