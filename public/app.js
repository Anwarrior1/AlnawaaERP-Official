let state = null;
let currentUser = null;
let activeView = "dashboard";
let inventoryFilter = "all";
let selectedInvoiceId = null;
let selectedPurchaseId = null;
let editingSaleId = null;
let selectedImportFile = null;
let saleItemRows = [];
let saleItemSequence = 0;
let bonusItemRows = [];
let bonusItemSequence = 0;
let selectedDocumentHtml = "";
let currentLanguage = localStorage.getItem("alnawaa_language") || "en";
let currentTheme = localStorage.getItem("alnawaa_theme") || "dark";
let alertsPanelExpanded = localStorage.getItem("alnawaa_alerts_expanded") !== "false";
let dashboardMotion = null;
let dashboardMotionLoading = false;

const translations = {
  ar: {
    "alnawaa medical group": "مجموعة النوى الطبية",
    Search: "بحث",
    Export: "تصدير",
    Logout: "تسجيل الخروج",
    Dashboard: "لوحة التحكم",
    Inventory: "المخزون",
    Sales: "المبيعات",
    Invoices: "الفواتير",
    Purchases: "المشتريات",
    Suppliers: "الموردون",
    Customers: "العملاء",
    Users: "المستخدمون",
    Reports: "التقارير",
    Accounting: "المحاسبة",
    Expenses: "المصاريف",
    Payroll: "الرواتب",
    Banking: "الصندوق والبنوك",
    Settings: "الإعدادات",
    Barcode: "الباركود",
    Payments: "المدفوعات",
    Delivery: "التسليم",
    Modules: "الوحدات",
    "Admin controls": "تحكم المدير",
    "Feature Visibility": "إظهار وإخفاء الميزات",
    "Hide ERP sections by role": "إخفاء أقسام النظام حسب الدور",
    "Audit & Data": "السجل والبيانات",
    "Server database": "قاعدة بيانات الخادم",
    "My Account": "حسابي",
    "Email and password": "البريد الإلكتروني وكلمة المرور",
    Email: "البريد الإلكتروني",
    "Current password": "كلمة المرور الحالية",
    "New password": "كلمة مرور جديدة",
    "Confirm new password": "تأكيد كلمة المرور الجديدة",
    "Save account changes": "حفظ تغييرات الحساب",
    "Scan barcode / SKU": "مسح الباركود / الرمز",
    "Download backup": "تنزيل نسخة احتياطية",
    "Reset empty system": "إعادة النظام فارغا",
    "Export backup": "تصدير نسخة احتياطية",
    "Import backup": "استيراد نسخة احتياطية",
    "Switch to English": "التبديل إلى الإنجليزية",
    "Switch to Arabic": "التبديل إلى العربية",
    "Switch to light mode": "التبديل إلى الوضع الفاتح",
    "Switch to dark mode": "التبديل إلى الوضع الداكن",
    Logout: "تسجيل الخروج",
    Cancel: "إلغاء",
    Enabled: "مفعل",
    Off: "متوقف",
    Visible: "ظاهر",
    Hidden: "مخفي",
    "No configurable features for this role.": "لا توجد ميزات قابلة للتعديل لهذا الدور.",
    "Search anything in the ERP": "ابحث في النظام",
  },
};

function t(value) {
  return translations[currentLanguage]?.[value] || value;
}

function featureLabel(key) {
  return state?.features?.find((feature) => feature.key === key)?.label || titleCase(key);
}

const iconPaths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect>',
  inventory: '<path d="m21 8-9-5-9 5 9 5 9-5Z"></path><path d="M3 8v8l9 5 9-5V8"></path><path d="M12 13v8"></path>',
  sales: '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 6H6"></path>',
  invoices: '<path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z"></path><path d="M9 8h6"></path><path d="M9 12h6"></path><path d="M9 16h4"></path>',
  purchases: '<path d="M16 16V8a2 2 0 0 0-2-2h-2"></path><path d="M8 16V8a2 2 0 0 1 2-2h2"></path><path d="M3 16h18v4H3z"></path><path d="M7 16v-4h10v4"></path>',
  suppliers: '<path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-4"></path><path d="M9 9h1"></path><path d="M9 13h1"></path><path d="M9 17h1"></path>',
  customers: '<path d="M16 21v-2a4 4 0 0 0-8 0v2"></path><circle cx="12" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  users: '<path d="M16 21v-2a4 4 0 0 0-8 0v2"></path><circle cx="12" cy="7" r="4"></circle><path d="m19 8 2 2 2-4"></path>',
  reports: '<path d="M3 3v18h18"></path><path d="M7 15v3"></path><path d="M12 10v8"></path><path d="M17 6v12"></path>',
  accounting: '<path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path>',
  expenses: '<path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8"></path><path d="M16 16h6"></path><path d="M19 13v6"></path>',
  payroll: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle><path d="M16 11h4"></path>',
  banking: '<path d="M3 21h18"></path><path d="m4 10 8-6 8 6"></path><path d="M6 10v7"></path><path d="M10 10v7"></path><path d="M14 10v7"></path><path d="M18 10v7"></path>',
  settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"></path><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.39 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.39H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .39-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.36.7.6 1 .3.25.7.39 1.1.39H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"></path>',
  search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
  money: '<path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"></path>',
  profit: '<path d="M3 17 9 11l4 4 8-8"></path><path d="M14 7h7v7"></path>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5"></path><path d="M12 3v12"></path>',
  globe: '<circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 0 20"></path><path d="M12 2a15.3 15.3 0 0 0 0 20"></path>',
  sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
  moon: '<path d="M20.99 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.78 9.79Z"></path>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path>',
  bell: '<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"></path><path d="M18 8A6 6 0 0 0 6 8c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>',
  chevronDown: '<path d="m6 9 6 6 6-6"></path>',
  warning: '<path d="m21.7 18.4-8.6-15a1.3 1.3 0 0 0-2.2 0l-8.6 15A1.3 1.3 0 0 0 3.4 20h17.2a1.3 1.3 0 0 0 1.1-1.6Z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4"></path><path d="M8 2v4"></path><path d="M3 10h18"></path><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path>',
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 22a8 8 0 0 1 16 0"></path>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"></path><path d="M8 12h8"></path><path d="M8 16h6"></path>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M2 10h20"></path><path d="M6 15h2"></path><path d="M10 15h4"></path>',
  clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
  hash: '<path d="M4 9h16"></path><path d="M4 15h16"></path><path d="M10 3 8 21"></path><path d="m16 3-2 18"></path>',
  pen: '<path d="M12 20h9"></path><path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z"></path>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1Z"></path>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path>',
  location: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>',
};

function iconSvg(name) {
  const path = iconPaths[name] || iconPaths.dashboard;
  return `<svg class="app-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "LYD",
});

const elements = {
  loginScreen: document.getElementById("loginScreen"),
  appShell: document.getElementById("appShell"),
  loginForm: document.getElementById("loginForm"),
  loginError: document.getElementById("loginError"),
  viewTitle: document.getElementById("viewTitle"),
  search: document.getElementById("globalSearch"),
  toast: document.getElementById("toast"),
  alertStrip: document.getElementById("alertStrip"),
  metricGrid: document.getElementById("metricGrid"),
  dashboardAlerts: document.getElementById("dashboardAlerts"),
  recentSales: document.getElementById("recentSales"),
  inventoryTable: document.getElementById("inventoryTable"),
  salesTable: document.getElementById("salesTable"),
  saleItemsBody: document.getElementById("saleItemsBody"),
  saleInvoiceTotal: document.getElementById("saleInvoiceTotal"),
  bonusItemsBody: document.getElementById("bonusItemsBody"),
  invoiceTable: document.getElementById("invoiceTable"),
  purchaseTable: document.getElementById("purchaseTable"),
  supplierCards: document.getElementById("supplierCards"),
  customerCards: document.getElementById("customerCards"),
  userTable: document.getElementById("userTable"),
  moduleGrid: document.getElementById("moduleGrid"),
  auditLog: document.getElementById("auditLog"),
  featureVisibilityGrid: document.getElementById("featureVisibilityGrid"),
  financialReport: document.getElementById("financialReport"),
  salesBars: document.getElementById("salesBars"),
  expiryReport: document.getElementById("expiryReport"),
  reorderReport: document.getElementById("reorderReport"),
  accountingSummary: document.getElementById("accountingSummary"),
  customerBalanceTable: document.getElementById("customerBalanceTable"),
  supplierBalanceTable: document.getElementById("supplierBalanceTable"),
  transactionTable: document.getElementById("transactionTable"),
  expenseTable: document.getElementById("expenseTable"),
  salaryTable: document.getElementById("salaryTable"),
  bankAccountCards: document.getElementById("bankAccountCards"),
  withdrawalTable: document.getElementById("withdrawalTable"),
  transferTable: document.getElementById("transferTable"),
  importBackupFile: document.getElementById("importBackupFile"),
  importDialog: document.getElementById("importDialog"),
  importFileName: document.getElementById("importFileName"),
  importFileMeta: document.getElementById("importFileMeta"),
  invoiceDialog: document.getElementById("invoiceDialog"),
  invoicePreview: document.getElementById("invoicePreview"),
  paymentDialog: document.getElementById("paymentDialog"),
  supplierPaymentDialog: document.getElementById("supplierPaymentDialog"),
  deliveryDialog: document.getElementById("deliveryDialog"),
  documentDialog: document.getElementById("documentDialog"),
  documentTitle: document.getElementById("documentTitle"),
  documentPreview: document.getElementById("documentPreview"),
  receiptDialog: document.getElementById("receiptDialog"),
  receiptEditor: document.getElementById("receiptEditor"),
  printArea: document.getElementById("printArea"),
};

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();
  loadDashboardMotion();
  decorateNavigation();
  applyLanguage();
  bindDepthInteractions();
  bindBaseEvents();
  checkSession();
});

function decorateNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    const label = button.dataset.label || button.textContent.trim();
    button.dataset.label = label;
    const iconName = button.dataset.view || "dashboard";
    button.innerHTML = `<span class="nav-icon">${iconSvg(iconName)}</span><span>${escapeHtml(t(label))}</span>`;
  });
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === "ar" ? "ar" : "en";
  document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("rtl", currentLanguage === "ar");
  renderTopbarActions();
  translateStaticText();
  decorateNavigation();
}

function applyTheme() {
  document.body.classList.toggle("theme-dark", currentTheme === "dark");
  renderTopbarActions();
}

function updateThemeToggleLabel() {
  renderTopbarActions();
}

function renderTopbarActions() {
  const actions = [
    ["exportData", "download", "Export backup"],
    ["importData", "upload", "Import backup"],
    ["languageToggle", "globe", currentLanguage === "ar" ? "Switch to English" : "Switch to Arabic"],
    ["themeToggle", currentTheme === "dark" ? "sun" : "moon", currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"],
    ["logoutButton", "logout", "Logout"],
  ];
  for (const [id, icon, label] of actions) {
    const button = document.getElementById(id);
    if (!button) continue;
    button.innerHTML = iconSvg(icon);
    button.title = t(label);
    button.setAttribute("aria-label", t(label));
  }
}

function translateStaticText() {
  const textMap = [
    [".brand-row p", "alnawaa medical group"],
    [".eyebrow", "alnawaa medical group"],
    [".search-field span", "Search"],
    ["#downloadBackup", "Download backup"],
    ["#resetDemo", "Reset empty system"],
    ["#accountForm button[type='submit']", "Save account changes"],
  ];
  for (const [selector, label] of textMap) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = t(label);
    });
  }
  document.querySelectorAll(".panel-header h3").forEach((heading) => {
    const base = heading.dataset.label || heading.textContent.trim();
    heading.dataset.label = base;
    heading.textContent = t(base);
  });
  document.querySelectorAll(".panel-header .subtle").forEach((label) => {
    const base = label.dataset.label || label.textContent.trim();
    label.dataset.label = base;
    label.textContent = t(base);
  });
  document.querySelectorAll("label").forEach((label) => {
    const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (!textNode) return;
    const base = label.dataset.label || textNode.textContent.trim();
    label.dataset.label = base;
    textNode.textContent = t(base);
  });
  const search = document.getElementById("globalSearch");
  if (search) search.placeholder = currentLanguage === "ar" ? "دواء، تشغيلة، عميل، فاتورة" : "Medicine, batch, customer, invoice";
  const saleBarcode = document.getElementById("saleBarcode");
  if (saleBarcode) saleBarcode.placeholder = currentLanguage === "ar" ? "امسح باركود الدواء هنا" : "Scan medicine barcode here";
  const purchaseBarcode = document.getElementById("purchaseBarcode");
  if (purchaseBarcode) purchaseBarcode.placeholder = currentLanguage === "ar" ? "امسح باركود الدواء المستلم هنا" : "Scan received medicine barcode here";
  if (elements.viewTitle) elements.viewTitle.textContent = t(featureLabel(activeView));
}

function bindDepthInteractions() {
  const selector = ".metric-card, .entity-card, .module-card, .report-card";
  document.addEventListener("pointermove", (event) => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest(selector);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty("--tilt-x", `${(-y * 3).toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${(x * 3).toFixed(2)}deg`);
  });
  document.addEventListener("pointerout", (event) => {
    if (!(event.target instanceof Element)) return;
    const card = event.target.closest(selector);
    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (!card || (relatedTarget && card.contains(relatedTarget))) return;
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
  });
}

function loadDashboardMotion() {
  if (dashboardMotion || dashboardMotionLoading) return;
  dashboardMotionLoading = true;
  import("https://cdn.jsdelivr.net/npm/motion@12/+esm")
    .then((module) => {
      dashboardMotion = module;
      animateDashboardMetricCards();
    })
    .catch(() => {
      dashboardMotion = null;
    })
    .finally(() => {
      dashboardMotionLoading = false;
    });
}

function animateDashboardMetricCards() {
  if (activeView !== "dashboard" || !dashboardMotion?.animate || !elements.metricGrid) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cards = [...elements.metricGrid.querySelectorAll(".metric-card")];
  if (!cards.length) return;
  cards.forEach((card) => {
    card.style.opacity = "0";
    card.style.setProperty("--entry-y", "14px");
  });
  dashboardMotion.animate(
    cards,
    { opacity: [0, 1], "--entry-y": ["14px", "0px"] },
    {
      duration: 0.52,
      delay: dashboardMotion.stagger ? dashboardMotion.stagger(0.035) : 0,
      ease: "easeOut",
    }
  );
}

function metricValueMarkup(value) {
  const text = String(value);
  const match = text.match(/^([A-Z]{3})[\s\u00a0]+(.+)$/);
  if (!match) return escapeHtml(text);
  return `<span class="metric-currency">${escapeHtml(match[1])}</span><span class="metric-amount">${escapeHtml(match[2])}</span>`;
}

function bindBaseEvents() {
  elements.loginForm.addEventListener("submit", login);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("languageToggle").addEventListener("click", toggleLanguage);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("exportData").addEventListener("click", downloadBackup);
  document.getElementById("importData").addEventListener("click", openImportFilePicker);
  elements.importBackupFile.addEventListener("change", handleImportFileSelection);
  document.getElementById("closeImportDialog").addEventListener("click", closeImportDialog);
  document.getElementById("cancelImport").addEventListener("click", closeImportDialog);
  document.getElementById("confirmImport").addEventListener("click", importSelectedBackup);
  document.getElementById("downloadBackup").addEventListener("click", downloadBackup);
  document.getElementById("resetDemo").addEventListener("click", resetSystemData);
  document.getElementById("closeInvoiceDialog").addEventListener("click", () => elements.invoiceDialog.close());
  document.getElementById("printCustomerInvoice").addEventListener("click", () => printSelectedInvoice("customer"));
  document.getElementById("printInternalInvoice").addEventListener("click", () => printSelectedInvoice("internal"));
  document.getElementById("markInvoicePaid").addEventListener("click", markInvoicePaid);
  document.getElementById("editInvoice").addEventListener("click", () => editSale(selectedInvoiceId));
  document.getElementById("addInvoicePayment").addEventListener("click", openPaymentDialog);
  document.getElementById("generateDeliveryReceipt").addEventListener("click", openDeliveryDialog);
  document.getElementById("printDeliveryReceipt").addEventListener("click", printDeliveryReceipt);
  document.getElementById("deleteDeliveryReceipt").addEventListener("click", deleteLatestDeliveryReceipt);
  document.getElementById("downloadCustomerInvoicePdf").addEventListener("click", () => printSelectedInvoice("customer"));
  document.getElementById("downloadInternalInvoicePdf").addEventListener("click", () => printSelectedInvoice("internal"));
  document.getElementById("closePaymentDialog").addEventListener("click", () => elements.paymentDialog.close());
  document.getElementById("closeSupplierPaymentDialog").addEventListener("click", () => elements.supplierPaymentDialog.close());
  document.getElementById("cancelSupplierPayment").addEventListener("click", () => elements.supplierPaymentDialog.close());
  document.getElementById("closeDeliveryDialog").addEventListener("click", () => elements.deliveryDialog.close());
  document.getElementById("closeDocumentDialog").addEventListener("click", () => elements.documentDialog.close());
  document.getElementById("closeReceiptDialog").addEventListener("click", () => elements.receiptDialog.close());
  document.getElementById("printDocument").addEventListener("click", printCurrentDocument);
  document.getElementById("downloadDocumentPdf").addEventListener("click", printCurrentDocument);
  document.getElementById("saveReceipt").addEventListener("click", saveManualReceipt);
  document.getElementById("clearReceipt").addEventListener("click", clearManualReceipt);
  document.getElementById("printReceipt").addEventListener("click", printManualReceipt);
  document.getElementById("downloadReceiptPdf").addEventListener("click", printManualReceipt);
  document.getElementById("printReport").addEventListener("click", printReportView);
  document.getElementById("exportReportCsv").addEventListener("click", exportReportCsv);
  elements.alertStrip.addEventListener("click", handleAlertsPanelClick);
  elements.search.addEventListener("input", render);

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewLink));
  });

  document.querySelectorAll("[data-inventory-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      inventoryFilter = button.dataset.inventoryFilter;
      document.querySelectorAll("[data-inventory-filter]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderInventory();
    });
  });

  document.getElementById("medicineForm").addEventListener("submit", saveMedicine);
  bindBarcodeInput("medicineSku", fillMedicineFormFromBarcode);
  document.getElementById("cancelMedicineEdit").addEventListener("click", resetMedicineForm);
  document.getElementById("saleForm").addEventListener("submit", saveSale);
  document.getElementById("saleAddItem").addEventListener("click", () => addSaleItemRow());
  document.getElementById("bonusAddItem")?.addEventListener("click", () => addBonusItemRow());
  document.getElementById("cancelSaleEdit").addEventListener("click", resetSaleForm);
  elements.saleItemsBody.addEventListener("input", handleSaleItemInput);
  elements.saleItemsBody.addEventListener("change", handleSaleItemInput);
  elements.saleItemsBody.addEventListener("click", handleSaleItemClick);
  if (elements.bonusItemsBody) {
    elements.bonusItemsBody.addEventListener("input", handleBonusItemInput);
    elements.bonusItemsBody.addEventListener("change", handleBonusItemInput);
    elements.bonusItemsBody.addEventListener("click", handleBonusItemClick);
  }
  bindBarcodeInput("saleBarcode", fillSaleFromBarcode);
  document.getElementById("purchaseForm").addEventListener("submit", savePurchase);
  document.getElementById("purchaseMedicine").addEventListener("change", syncPurchaseCost);
  bindBarcodeInput("purchaseBarcode", fillPurchaseFromBarcode);
  document.getElementById("supplierForm").addEventListener("submit", saveSupplier);
  document.getElementById("customerForm").addEventListener("submit", saveCustomer);
  document.getElementById("userForm").addEventListener("submit", saveUser);
  document.getElementById("paymentForm").addEventListener("submit", saveCustomerPayment);
  document.getElementById("supplierPaymentForm").addEventListener("submit", saveSupplierPayment);
  document.getElementById("deliveryForm").addEventListener("submit", saveDeliveryReceipt);
  document.getElementById("expenseForm").addEventListener("submit", saveExpense);
  document.getElementById("salaryForm").addEventListener("submit", saveSalary);
  document.getElementById("withdrawalForm").addEventListener("submit", saveWithdrawal);
  document.getElementById("transferForm").addEventListener("submit", saveTransfer);
  document.getElementById("bankAccountForm").addEventListener("submit", saveBankAccount);
  document.getElementById("accountForm").addEventListener("submit", saveAccount);
  ["salaryBase", "salaryDeductions", "salaryBonuses", "salaryAdvances"].forEach((id) => {
    document.getElementById(id).addEventListener("input", syncSalaryNet);
  });
  ["reportDateFrom", "reportDateTo", "reportCustomer", "reportSupplier"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderReports);
  });
}

async function checkSession() {
  try {
    const response = await api("/api/me", { silentAuth: true });
    currentUser = response.user;
    await loadApp();
  } catch {
    showLogin();
  }
}

async function login(event) {
  event.preventDefault();
  elements.loginError.textContent = "";
  try {
    const response = await api("/api/login", {
      method: "POST",
      body: {
        email: document.getElementById("loginEmail").value,
        password: document.getElementById("loginPassword").value,
      },
      skipAuthRedirect: true,
    });
    currentUser = response.user;
    await loadApp();
    toast(`Welcome, ${currentUser.name}.`);
  } catch (error) {
    elements.loginError.textContent = error.message;
  }
}

async function logout() {
  await api("/api/logout", { method: "POST", skipAuthRedirect: true }).catch(() => {});
  state = null;
  currentUser = null;
  showLogin();
}

async function loadApp() {
  state = await api("/api/bootstrap");
  elements.loginScreen.classList.add("hidden");
  elements.appShell.classList.remove("hidden");
  document.getElementById("currentUserName").textContent = currentUser.name;
  document.getElementById("currentUserRole").textContent = currentUser.role;
  fillAccountForm();
  hydrateSelects();
  setDefaultFormValues();
  applyFeatureVisibility();
  applyLanguage();
  setView(activeView);
}

function fillAccountForm() {
  const email = document.getElementById("accountEmail");
  if (email && currentUser) email.value = currentUser.email || "";
  ["accountCurrentPassword", "accountNewPassword", "accountConfirmPassword"].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });
}

function showLogin() {
  elements.appShell.classList.add("hidden");
  elements.loginScreen.classList.remove("hidden");
}

async function reloadData() {
  state = await api("/api/bootstrap");
  hydrateSelects();
  render();
}

async function api(path, options = {}) {
  const headers = {};
  const request = {
    method: options.method || "GET",
    headers,
    credentials: "same-origin",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    request.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, request);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (response.status === 401 && !options.skipAuthRedirect && !options.silentAuth) showLogin();
  if (!response.ok) throw new Error(payload?.error || "Request failed");
  return payload;
}

function setView(viewName) {
  if (!canUseFeature(viewName)) viewName = firstAvailableFeature();
  activeView = viewName;
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.getElementById(`${viewName}View`)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  elements.viewTitle.textContent = t(featureLabel(viewName));
  render();
}

function render() {
  if (!state) return;
  applyFeatureVisibility();
  hydrateSelects();
  renderAlerts();
  renderDashboard();
  renderInventory();
  renderSales();
  renderInvoices();
  renderPurchases();
  renderSuppliers();
  renderCustomers();
  renderUsers();
  renderReports();
  renderAccounting();
  renderExpenses();
  renderPayroll();
  renderBanking();
  renderSettings();
  applyLanguage();
}

function toggleLanguage() {
  currentLanguage = currentLanguage === "ar" ? "en" : "ar";
  localStorage.setItem("alnawaa_language", currentLanguage);
  render();
  toast(currentLanguage === "ar" ? "تم تفعيل اللغة العربية." : "English language enabled.");
}

function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("alnawaa_theme", currentTheme);
  applyTheme();
  toast(currentTheme === "dark" ? "Dark mode enabled." : "Light mode enabled.");
}

function canUseFeature(featureKey) {
  if (!state?.availableFeatures) return true;
  return state.availableFeatures.includes(featureKey);
}

function canUseInternalInvoice() {
  return currentUser?.role === "Admin" || canUseFeature("accounting");
}

function firstAvailableFeature() {
  const preferred = ["dashboard", "sales", "inventory", "invoices", "reports", "settings"];
  return preferred.find((feature) => canUseFeature(feature)) || state.availableFeatures?.[0] || "dashboard";
}

function applyFeatureVisibility() {
  if (!state) return;
  document.querySelectorAll("[data-view]").forEach((button) => {
    const visible = canUseFeature(button.dataset.view);
    button.classList.toggle("hidden", !visible);
    button.disabled = !visible;
  });
  document.querySelectorAll("[data-view-link]").forEach((button) => {
    const visible = canUseFeature(button.dataset.viewLink);
    button.classList.toggle("hidden", !visible);
    button.disabled = !visible;
  });
}

function bindBarcodeInput(id, handler) {
  const input = document.getElementById(id);
  if (!input) return;
  let scanTimer = null;
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    clearTimeout(scanTimer);
    handler(input.value, true);
  });
  input.addEventListener("input", () => {
    clearTimeout(scanTimer);
    const value = input.value.trim();
    if (value.length < 3) return;
    scanTimer = setTimeout(() => handler(value, false), 180);
  });
}

function normalizeBarcode(value) {
  return String(value || "").trim().toLowerCase();
}

function medicinesForBarcode(value) {
  const code = normalizeBarcode(value);
  if (!code) return [];
  return state.medicines.filter((medicine) => [medicine.sku, medicine.batch].some((field) => normalizeBarcode(field) === code));
}

function bestSaleMedicineForBarcode(value) {
  const matches = medicinesForBarcode(value);
  const available = matches.filter((medicine) => medicine.stock > 0);
  const sellable = available.filter((medicine) => daysUntil(medicine.expiry) >= 0);
  return [...(sellable.length ? sellable : available)].sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry))[0] || matches[0] || null;
}

function fillSaleFromBarcode(value, force = false) {
  const medicine = bestSaleMedicineForBarcode(value);
  if (!medicine) {
    if (force) toast(`No medicine found for barcode ${String(value || "").trim()}.`);
    return;
  }
  ensureSaleItemRows();
  const existingRow = saleItemRows.find((row) => row.medicineId === medicine.id);
  if (existingRow) {
    existingRow.quantity = Number(existingRow.quantity || 0) + 1;
    existingRow.unitPrice = existingRow.unitPrice || medicine.price;
  } else {
    const emptyRow = saleItemRows.find((row) => !row.medicineId);
    if (emptyRow) {
      emptyRow.medicineId = medicine.id;
      emptyRow.quantity = 1;
      emptyRow.unitPrice = medicine.price;
    } else {
      saleItemRows.push(createSaleItemRow({ medicineId: medicine.id, quantity: 1, unitPrice: medicine.price }));
    }
  }
  document.getElementById("saleBarcode").value = medicine.sku;
  renderSaleItems();
  const row = saleItemRows.find((item) => item.medicineId === medicine.id);
  elements.saleItemsBody.querySelector(`[data-sale-item-row="${row?.rowId}"] [data-sale-field="quantity"]`)?.focus();
  const status = stockStatus(medicine);
  toast(`Scanned ${medicine.name} | batch ${medicine.batch} | ${status.label}.`);
}

function fillPurchaseFromBarcode(value, force = false) {
  const medicine = medicinesForBarcode(value)[0];
  if (!medicine) {
    if (force) toast(`No medicine found for barcode ${String(value || "").trim()}. Add it in Inventory first.`);
    return;
  }
  document.getElementById("purchaseBarcode").value = medicine.sku;
  document.getElementById("purchaseMedicine").value = medicine.id;
  syncPurchaseCost();
  document.getElementById("purchaseQuantity").focus();
  toast(`Scanned ${medicine.name} | batch ${medicine.batch}.`);
}

function fillMedicineFormFromBarcode(value, force = false) {
  const medicine = medicinesForBarcode(value)[0];
  const currentId = getValue("medicineId");
  if (!medicine) {
    if (force) toast("New barcode ready. Fill the medicine details and save.");
    return;
  }
  if (medicine.id === currentId) return;
  editMedicine(medicine.id);
  toast(`Existing barcode found: ${medicine.name} batch ${medicine.batch}.`);
}

function hydrateSelects() {
  const supplierOptions = state.suppliers.map((supplier) => optionMarkup(supplier.id, supplier.name)).join("");
  const customerOptions = state.customers.map((customer) => optionMarkup(customer.id, customer.name)).join("");
  const accountOptions = state.bankAccounts.map((account) => optionMarkup(account.id, `${account.name} (${formatMoney(account.currentBalance)})`)).join("");
  const allCustomerOptions = `<option value="">All customers</option>${customerOptions}`;
  const allSupplierOptions = `<option value="">All suppliers</option>${supplierOptions}`;
  const medicineOptions = state.medicines
    .map((medicine) => {
      const status = stockStatus(medicine);
      const label = `${medicine.name} | batch ${medicine.batch} | exp ${medicine.expiry || "N/A"} | ${medicine.stock} in stock | ${status.label}`;
      return optionMarkup(medicine.id, label);
    })
    .join("");
  const categoryOptions = state.expenseCategories.map((category) => optionMarkup(category, category)).join("");

  setSelectOptions("medicineSupplier", supplierOptions);
  setSelectOptions("purchaseSupplier", supplierOptions);
  setSelectOptions("saleCustomer", customerOptions);
  setSelectOptions("purchaseMedicine", medicineOptions);
  setSelectOptions("salePaymentAccount", accountOptions);
  setSelectOptions("purchasePaymentAccount", accountOptions);
  setSelectOptions("supplierPaymentAccount", accountOptions);
  setSelectOptions("paymentAccount", accountOptions);
  setSelectOptions("expenseAccount", accountOptions);
  setSelectOptions("salaryAccount", accountOptions);
  setSelectOptions("withdrawalAccount", accountOptions);
  setSelectOptions("transferFrom", accountOptions);
  setSelectOptions("transferTo", accountOptions);
  setSelectOptions("expenseCategory", categoryOptions);
  setSelectOptions("reportCustomer", allCustomerOptions);
  setSelectOptions("reportSupplier", allSupplierOptions);
}

function setSelectOptions(id, html) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  select.innerHTML = html;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function createSaleItemRow(data = {}) {
  const medicine = findMedicine(data.medicineId);
  const unitPrice = data.unitPrice ?? medicine?.price ?? 0;
  return {
    rowId: data.rowId || `sale-item-${++saleItemSequence}`,
    medicineId: data.medicineId || "",
    quantity: data.quantity === undefined || data.quantity === "" ? 1 : Number(data.quantity),
    unitPrice: unitPrice === "" ? "" : Number(unitPrice || 0),
  };
}

function ensureSaleItemRows() {
  if (!saleItemRows.length) saleItemRows = [createSaleItemRow()];
}

function addSaleItemRow(data = {}) {
  saleItemRows.push(createSaleItemRow(data));
  renderSaleItems();
  const row = saleItemRows[saleItemRows.length - 1];
  elements.saleItemsBody.querySelector(`[data-sale-item-row="${row.rowId}"] select`)?.focus();
}

function renderSaleItems() {
  if (!state || !elements.saleItemsBody) return;
  ensureSaleItemRows();
  elements.saleItemsBody.innerHTML = saleItemRows.map((row) => saleItemRowMarkup(row)).join("");
  updateSaleTotals();
}

function saleItemRowMarkup(row) {
  return `
    <tr data-sale-item-row="${escapeHtml(row.rowId)}">
      <td>
        <select data-sale-field="medicineId" required>
          ${saleMedicineOptions(row.medicineId)}
        </select>
      </td>
      <td>
        <input data-sale-field="quantity" type="number" min="1" step="1" value="${escapeHtml(row.quantity || "")}" required>
      </td>
      <td>
        <input data-sale-field="unitPrice" type="number" min="0" step="0.001" value="${escapeHtml(row.unitPrice === "" ? "" : roundMoney(row.unitPrice))}" required>
      </td>
      <td><strong data-sale-line-total>${formatMoney(saleItemLineTotal(row))}</strong></td>
      <td><button class="mini-button danger" type="button" data-remove-sale-item="${escapeHtml(row.rowId)}">Remove</button></td>
    </tr>
  `;
}

function saleMedicineOptions(selectedId = "") {
  const options = state.medicines.map((medicine) => {
    const status = stockStatus(medicine);
    const label = `${medicine.name} | batch ${medicine.batch} | ${medicine.stock} in stock | ${status.label}`;
    return `<option value="${escapeHtml(medicine.id)}" ${medicine.id === selectedId ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");
  return `<option value="">Select product</option>${options}`;
}

function handleSaleItemInput(event) {
  const control = event.target.closest("[data-sale-field]");
  if (!control) return;
  const rowElement = control.closest("[data-sale-item-row]");
  const row = saleItemRows.find((item) => item.rowId === rowElement?.dataset.saleItemRow);
  if (!row) return;

  const field = control.dataset.saleField;
  if (field === "medicineId") {
    row.medicineId = control.value;
    const medicine = findMedicine(row.medicineId);
    if (medicine) row.unitPrice = medicine.price;
    if (!row.quantity) row.quantity = 1;
    renderSaleItems();
    elements.saleItemsBody.querySelector(`[data-sale-item-row="${row.rowId}"] [data-sale-field="quantity"]`)?.focus();
    return;
  }

  row[field] = control.value === "" ? "" : Number(control.value);
  updateSaleTotals();
}

function handleSaleItemClick(event) {
  const button = event.target.closest("[data-remove-sale-item]");
  if (!button) return;
  removeSaleItemRow(button.dataset.removeSaleItem);
}

function removeSaleItemRow(rowId) {
  if (saleItemRows.length <= 1) {
    saleItemRows = [createSaleItemRow()];
  } else {
    saleItemRows = saleItemRows.filter((row) => row.rowId !== rowId);
  }
  renderSaleItems();
}

function updateSaleTotals() {
  let total = 0;
  for (const row of saleItemRows) {
    const lineTotal = saleItemLineTotal(row);
    total += lineTotal;
    elements.saleItemsBody
      .querySelector(`[data-sale-item-row="${row.rowId}"] [data-sale-line-total]`)
      ?.replaceChildren(document.createTextNode(formatMoney(lineTotal)));
  }
  const populatedRows = saleItemRows.filter((row) => row.medicineId).length;
  document.getElementById("saleItemsCount").textContent = populatedRows === 1 ? "1 item" : `${populatedRows} items`;
  elements.saleInvoiceTotal.textContent = formatMoney(total);
}

function saleItemLineTotal(row) {
  return roundMoney(Number(row.quantity || 0) * Number(row.unitPrice || 0));
}

function syncSaleItemRowsFromDom() {
  saleItemRows = [...elements.saleItemsBody.querySelectorAll("[data-sale-item-row]")].map((rowElement) => {
    const row = saleItemRows.find((item) => item.rowId === rowElement.dataset.saleItemRow) || createSaleItemRow();
    return {
      rowId: row.rowId,
      medicineId: rowElement.querySelector("[data-sale-field='medicineId']").value,
      quantity: Number(rowElement.querySelector("[data-sale-field='quantity']").value || 0),
      unitPrice: Number(rowElement.querySelector("[data-sale-field='unitPrice']").value || 0),
    };
  });
}

function collectSaleItems() {
  syncSaleItemRowsFromDom();
  return saleItemRows
    .filter((row) => row.medicineId)
    .map((row) => ({
      medicineId: row.medicineId,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
    }));
}

function createBonusItemRow(data = {}) {
  return {
    rowId: data.rowId || `bonus-item-${++bonusItemSequence}`,
    medicineId: data.medicineId || "",
    quantity: data.quantity === undefined || data.quantity === "" ? 1 : Number(data.quantity),
  };
}

function addBonusItemRow(data = {}) {
  bonusItemRows.push(createBonusItemRow(data));
  renderBonusItems();
  const row = bonusItemRows[bonusItemRows.length - 1];
  elements.bonusItemsBody?.querySelector(`[data-bonus-item-row="${row.rowId}"] select`)?.focus();
}

function renderBonusItems() {
  if (!state || !elements.bonusItemsBody) return;
  elements.bonusItemsBody.innerHTML = bonusItemRows.length
    ? bonusItemRows.map((row) => bonusItemRowMarkup(row)).join("")
    : `<tr><td colspan="4"><div class="compact-empty">No bonus items.</div></td></tr>`;
  updateBonusCount();
}

function updateBonusCount() {
  const populatedRows = bonusItemRows.filter((row) => row.medicineId).length;
  const count = document.getElementById("bonusItemsCount");
  if (count) count.textContent = populatedRows ? `${populatedRows} FREE` : "No bonus items";
}

function bonusItemRowMarkup(row) {
  return `
    <tr data-bonus-item-row="${escapeHtml(row.rowId)}">
      <td>
        <select data-bonus-field="medicineId" required>
          ${saleMedicineOptions(row.medicineId)}
        </select>
      </td>
      <td>
        <input data-bonus-field="quantity" type="number" min="1" step="1" value="${escapeHtml(row.quantity || "")}" required>
      </td>
      <td><strong class="free-label">FREE</strong></td>
      <td><button class="mini-button danger" type="button" data-remove-bonus-item="${escapeHtml(row.rowId)}">Remove</button></td>
    </tr>
  `;
}

function handleBonusItemInput(event) {
  const control = event.target.closest("[data-bonus-field]");
  if (!control) return;
  const rowElement = control.closest("[data-bonus-item-row]");
  const row = bonusItemRows.find((item) => item.rowId === rowElement?.dataset.bonusItemRow);
  if (!row) return;

  const field = control.dataset.bonusField;
  row[field] = field === "medicineId" ? control.value : Number(control.value || 0);
  updateBonusCount();
}

function handleBonusItemClick(event) {
  const button = event.target.closest("[data-remove-bonus-item]");
  if (!button) return;
  bonusItemRows = bonusItemRows.filter((row) => row.rowId !== button.dataset.removeBonusItem);
  renderBonusItems();
}

function syncBonusItemRowsFromDom() {
  if (!elements.bonusItemsBody) {
    bonusItemRows = [];
    return;
  }
  bonusItemRows = [...elements.bonusItemsBody.querySelectorAll("[data-bonus-item-row]")].map((rowElement) => {
    const row = bonusItemRows.find((item) => item.rowId === rowElement.dataset.bonusItemRow) || createBonusItemRow();
    return {
      rowId: row.rowId,
      medicineId: rowElement.querySelector("[data-bonus-field='medicineId']").value,
      quantity: Number(rowElement.querySelector("[data-bonus-field='quantity']").value || 0),
    };
  });
}

function collectBonusItems() {
  syncBonusItemRowsFromDom();
  return bonusItemRows
    .filter((row) => row.medicineId)
    .map((row) => ({
      medicineId: row.medicineId,
      quantity: row.quantity,
    }));
}

function optionMarkup(value, label) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
}

function renderAlerts() {
  const lowStock = state.medicines.filter((medicine) => medicine.stock <= medicine.reorderLevel).length;
  const expiring = state.medicines.filter((medicine) => daysUntil(medicine.expiry) <= 90 && daysUntil(medicine.expiry) >= 0).length;
  const expired = state.medicines.filter((medicine) => daysUntil(medicine.expiry) < 0).length;
  const unpaid = state.sales.filter((sale) => sale.paymentStatus !== "Paid").length;
  const monthlyExpenses = sumByDate(state.expenses, "amount", currentMonthStart(), currentMonthEnd());
  const salesThisMonth = sumByDate(state.sales, "total", currentMonthStart(), currentMonthEnd());
  const expenseWarning = monthlyExpenses > 0 && monthlyExpenses > salesThisMonth * 0.7;
  const alerts = [
    {
      active: Boolean(lowStock),
      tone: "warning",
      icon: "inventory",
      title: lowStock === 1 ? "Low Stock" : "Low Stock",
      detail: lowStock === 1 ? "1 product is below the minimum stock level." : `${lowStock} products are below the minimum stock level.`,
      target: "inventory",
      filter: "low",
    },
    {
      active: Boolean(expired || expiring),
      tone: expired ? "danger" : "orange",
      icon: expired ? "warning" : "calendar",
      title: expired ? "Critical Expiry Alert" : "Near Expiry",
      detail: expired
        ? `${expired} expired ${expired === 1 ? "batch is" : "batches are"} blocked from sale.`
        : `${expiring} ${expiring === 1 ? "product is" : "products are"} approaching expiry.`,
      target: "inventory",
      filter: "expiry",
    },
    {
      active: Boolean(unpaid),
      tone: "orange",
      icon: "invoices",
      title: "Unpaid Invoice",
      detail: unpaid === 1 ? "1 invoice requires payment." : `${unpaid} invoices require payment.`,
      target: "invoices",
    },
    {
      active: Boolean(expenseWarning),
      tone: "danger",
      icon: "expenses",
      title: "Critical Alert",
      detail: `Monthly expenses are high: ${formatMoney(monthlyExpenses)} vs ${formatMoney(salesThisMonth)} sales.`,
      target: "expenses",
    },
  ].filter((alert) => alert.active);

  elements.alertStrip.innerHTML = `
    <section class="alerts-panel ${alertsPanelExpanded ? "is-expanded" : ""}" aria-label="Dashboard alerts">
      <button class="alerts-panel-header" type="button" data-alert-toggle aria-expanded="${alertsPanelExpanded}">
        <span class="alerts-heading">
          <span class="alerts-bell">${iconSvg("bell")}</span>
          <span class="alerts-title">Alerts</span>
          <span class="alerts-count" aria-label="${alerts.length} active alerts">(${alerts.length})</span>
        </span>
        <span class="alerts-chevron" aria-hidden="true">${iconSvg("chevronDown")}</span>
      </button>
      <div class="alerts-panel-body">
        <div class="alerts-panel-inner">
          ${alerts.length ? alerts.map(alertListItem).join("") : emptyAlertsMarkup()}
        </div>
      </div>
    </section>
  `;
}

function alertListItem(alert) {
  return `
    <button class="alert-list-item alert-${escapeHtml(alert.tone)}" type="button" data-alert-target="${escapeHtml(alert.target)}" ${alert.filter ? `data-alert-filter="${escapeHtml(alert.filter)}"` : ""}>
      <span class="alert-status-dot" aria-hidden="true"></span>
      <span class="alert-list-icon">${iconSvg(alert.icon)}</span>
      <span class="alert-list-copy">
        <strong>${escapeHtml(alert.title)}</strong>
        <span>${escapeHtml(alert.detail)}</span>
      </span>
    </button>
  `;
}

function emptyAlertsMarkup() {
  return `
    <div class="alert-list-item alert-success alert-empty" aria-live="polite">
      <span class="alert-status-dot" aria-hidden="true"></span>
      <span class="alert-list-icon">${iconSvg("bell")}</span>
      <span class="alert-list-copy">
        <strong>No active alerts</strong>
        <span>Inventory, invoices, and expenses look stable right now.</span>
      </span>
    </div>
  `;
}

function handleAlertsPanelClick(event) {
  const toggle = event.target.closest("[data-alert-toggle]");
  if (toggle) {
    alertsPanelExpanded = !alertsPanelExpanded;
    localStorage.setItem("alnawaa_alerts_expanded", alertsPanelExpanded ? "true" : "false");
    renderAlerts();
    return;
  }

  const item = event.target.closest("[data-alert-target]");
  if (!item) return;
  const target = item.dataset.alertTarget;
  if (target === "inventory" && item.dataset.alertFilter) {
    inventoryFilter = item.dataset.alertFilter;
  }
  setView(target);
  if (target === "inventory") {
    document.querySelectorAll("[data-inventory-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.inventoryFilter === inventoryFilter);
    });
  }
}

function renderDashboard() {
  const monthStart = currentMonthStart();
  const monthEnd = currentMonthEnd();
  const totalSales = sumByDate(state.sales, "total", monthStart, monthEnd);
  const totalPurchases = sumByDate(state.purchases, "total", monthStart, monthEnd);
  const paymentsReceived = sumByDate(state.customerPayments, "amount", monthStart, monthEnd);
  const supplierPayments = sumByDate(state.supplierPayments, "amount", monthStart, monthEnd);
  const expenses = sumByDate(state.expenses.filter((item) => item.source !== "salary"), "amount", monthStart, monthEnd);
  const salaries = sumByDate(state.salaryPayments, "netPaidAmount", monthStart, monthEnd);
  const withdrawals = sumByDate(state.withdrawals, "amount", monthStart, monthEnd);
  const cogs = state.sales
    .filter((sale) => inDateRange(sale.date, monthStart, monthEnd))
    .reduce((sum, sale) => sum + saleItemCostTotal(sale), 0);
  const grossProfit = totalSales - cogs;
  const netProfit = grossProfit - expenses - salaries;
  const receivables = customerBalances().reduce((sum, item) => sum + item.balance, 0);
  const payables = supplierBalances().reduce((sum, item) => sum + item.balance, 0);
  const cashbox = accountByName("Main Cashbox")?.currentBalance || 0;
  const alNouran = accountByName("Al Nouran Bank")?.currentBalance || 0;
  const jumhouria = accountByName("Jumhouria Bank")?.currentBalance || 0;

  elements.metricGrid.innerHTML = [
    ["Sales this month", formatMoney(totalSales), "Invoice revenue", "sales", "primary", "financial"],
    ["Purchases this month", formatMoney(totalPurchases), "Supplier invoices", "purchases", "warning", "financial"],
    ["Gross profit", formatMoney(grossProfit), "Sales - COGS", "profit", "positive", "profit"],
    ["Net profit estimate", formatMoney(netProfit), "Gross profit - expenses - salaries", "reports", "primary", "profit"],
    ["Payments received", formatMoney(paymentsReceived), "Customer receipts", "money", "positive", "payments"],
    ["Supplier payments", formatMoney(supplierPayments), "Accounts payable paid", "accounting", "warning", "payments"],
    ["Customer receivables", formatMoney(receivables), "Open customer balances", "customers", "primary", "payments"],
    ["Supplier payables", formatMoney(payables), "Open supplier balances", "suppliers", "negative", "payments"],
    ["Cashbox balance", formatMoney(cashbox), "Main cashbox", "money", "primary", "banking"],
    ["Al Nouran Bank", formatMoney(alNouran), "Bank account", "banking", "primary", "banking"],
    ["Jumhouria Bank", formatMoney(jumhouria), "Bank account", "banking", "primary", "banking"],
    ["Withdrawals", formatMoney(withdrawals), "Owner/employee/cash withdrawals", "banking", "danger", "banking"],
    ["Expenses this month", formatMoney(expenses), "Operating expenses", "expenses", "negative", "operating"],
    ["Salaries this month", formatMoney(salaries), "Payroll paid", "payroll", "warning", "operating"],
  ]
    .map(([label, value, detail, icon, tone, group], index) => `
      <article class="metric-card metric-${tone}" data-metric-group="${escapeHtml(group)}" style="--metric-index: ${index}">
        <div class="metric-content">
          <span class="metric-title">${escapeHtml(label)}</span>
          <strong class="metric-value" aria-label="${escapeHtml(String(value))}">${metricValueMarkup(value)}</strong>
          <small class="metric-detail">${escapeHtml(detail)}</small>
        </div>
        <span class="metric-icon">${iconSvg(icon)}</span>
      </article>
    `)
    .join("");
  animateDashboardMetricCards();

  const alerts = state.medicines
    .filter((medicine) => medicine.stock <= medicine.reorderLevel || daysUntil(medicine.expiry) <= 120)
    .sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry))
    .slice(0, 6);
  elements.dashboardAlerts.innerHTML = alerts.length
    ? alerts.map((medicine) => dashboardAlertRow(medicine)).join("")
    : emptyTableRow("No stock alerts right now.", 5);

  const recent = [...state.sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  elements.recentSales.innerHTML = recent.length
    ? recent.map((sale) => `
        <article class="activity-item">
          <div>
            <strong>${escapeHtml(sale.invoiceNumber)}</strong>
            <span>${escapeHtml(customerName(sale.customerId))} bought ${escapeHtml(saleItemsLabel(sale))}</span>
          </div>
          <strong>${formatMoney(sale.total)}</strong>
        </article>
      `).join("")
    : `<div class="empty-state">No sales yet.</div>`;
}

function renderInventory() {
  const term = getSearchTerm();
  const medicines = state.medicines
    .filter((medicine) => matchesSearch([medicine.name, medicine.sku, medicine.batch, medicine.category, supplierName(medicine.supplierId)], term))
    .filter((medicine) => {
      if (inventoryFilter === "low") return medicine.stock <= medicine.reorderLevel;
      if (inventoryFilter === "expiry") return daysUntil(medicine.expiry) <= 120;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  elements.inventoryTable.innerHTML = medicines.length
    ? medicines.map((medicine) => inventoryRow(medicine)).join("")
    : emptyTableRow("No medicines match this view.", 8);

  elements.inventoryTable.querySelectorAll("[data-edit-medicine]").forEach((button) => {
    button.addEventListener("click", () => editMedicine(button.dataset.editMedicine));
  });
  elements.inventoryTable.querySelectorAll("[data-delete-medicine]").forEach((button) => {
    button.addEventListener("click", () => deleteMedicine(button.dataset.deleteMedicine));
  });
}

function dashboardAlertRow(medicine) {
  const status = stockStatus(medicine);
  return `
    <tr>
      <td><strong>${escapeHtml(medicine.name)}</strong><br><span class="subtle">${escapeHtml(medicine.sku)}</span></td>
      <td>${escapeHtml(medicine.batch)}</td>
      <td>${medicine.stock}</td>
      <td>${formatDate(medicine.expiry)}</td>
      <td>${pill(status.label, status.type)}</td>
    </tr>
  `;
}

function inventoryRow(medicine) {
  const status = stockStatus(medicine);
  return `
    <tr>
      <td><strong>${escapeHtml(medicine.name)}</strong><br><span class="subtle">${escapeHtml(medicine.sku)} | ${escapeHtml(medicine.category)} | MFG ${escapeHtml(medicine.productionDate || "N/A")}</span></td>
      <td>${escapeHtml(medicine.batch)}</td>
      <td>${escapeHtml(supplierName(medicine.supplierId))}</td>
      <td>${medicine.stock}</td>
      <td>${formatMoney(medicine.price)}</td>
      <td>${formatDate(medicine.expiry)}</td>
      <td>${pill(status.label, status.type)}</td>
      <td>
        <div class="table-actions">
          <button class="mini-button" type="button" data-edit-medicine="${medicine.id}">Edit</button>
          <button class="mini-button danger" type="button" data-delete-medicine="${medicine.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function renderSales() {
  const term = getSearchTerm();
  const sales = [...state.sales]
    .filter((sale) => matchesSearch([sale.invoiceNumber, customerName(sale.customerId), saleItemsLabel(sale), bonusItemsLabel(sale), sale.paymentStatus, sale.deliveryStatus], term))
    .sort((a, b) => b.date.localeCompare(a.date));

  elements.salesTable.innerHTML = sales.length
    ? sales.map((sale) => `
        <tr>
          <td><strong>${escapeHtml(sale.invoiceNumber)}</strong><br><span class="subtle">${formatDate(sale.date)}</span></td>
          <td>${escapeHtml(customerName(sale.customerId))}</td>
          <td>${escapeHtml(saleItemsLabel(sale))}</td>
          <td>${formatMoney(sale.total)}<br><span class="subtle">Due ${formatMoney(sale.remainingBalance || 0)}</span></td>
          <td>${paymentPill(sale.paymentStatus)}</td>
          <td>${deliveryPill(sale.deliveryStatus)}</td>
          <td>
            <div class="table-actions">
              <button class="mini-button" type="button" data-open-invoice="${sale.id}">Preview</button>
              <button class="mini-button" type="button" data-edit-sale="${sale.id}">Edit</button>
              <button class="mini-button danger" type="button" data-delete-sale="${sale.id}">Delete</button>
            </div>
          </td>
        </tr>
      `).join("")
    : emptyTableRow("No sales match this search.", 7);

  document.getElementById("salesTotalLabel").textContent = `${sales.length} records | ${formatMoney(sales.reduce((sum, sale) => sum + sale.total, 0))}`;
  bindSaleTableActions(elements.salesTable);
}

function renderInvoices() {
  const term = getSearchTerm();
  const invoices = [...state.sales]
    .filter((sale) => matchesSearch([sale.invoiceNumber, customerName(sale.customerId), saleItemsLabel(sale), bonusItemsLabel(sale), sale.paymentStatus], term))
    .sort((a, b) => b.date.localeCompare(a.date));

  elements.invoiceTable.innerHTML = invoices.length
    ? invoices.map((sale) => `
        <tr>
          <td><strong>${escapeHtml(sale.invoiceNumber)}</strong></td>
          <td>${formatDate(sale.date)}</td>
          <td>${escapeHtml(customerName(sale.customerId))}</td>
          <td>${formatMoney(sale.total)}<br><span class="subtle">Paid ${formatMoney(sale.totalPaid || 0)} | Due ${formatMoney(sale.remainingBalance || 0)}</span></td>
          <td>${paymentPill(sale.paymentStatus)}</td>
          <td>
            <div class="table-actions">
              <button class="mini-button" type="button" data-open-invoice="${sale.id}">Preview</button>
              <button class="mini-button" type="button" data-edit-sale="${sale.id}">Edit</button>
              ${sale.paymentStatus !== "Paid" ? `<button class="mini-button" type="button" data-add-payment="${sale.id}">Add payment</button>` : ""}
              <button class="mini-button danger" type="button" data-delete-sale="${sale.id}">Delete</button>
            </div>
          </td>
        </tr>
      `).join("")
    : emptyTableRow("No invoices match this search.", 6);

  bindSaleTableActions(elements.invoiceTable);
  elements.invoiceTable.querySelectorAll("[data-add-payment]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedInvoiceId = button.dataset.addPayment;
      openPaymentDialog();
    });
  });
}

function bindSaleTableActions(container) {
  container.querySelectorAll("[data-open-invoice]").forEach((button) => {
    button.addEventListener("click", () => openInvoice(button.dataset.openInvoice));
  });
  container.querySelectorAll("[data-edit-sale]").forEach((button) => {
    button.addEventListener("click", () => editSale(button.dataset.editSale));
  });
  container.querySelectorAll("[data-delete-sale]").forEach((button) => {
    button.addEventListener("click", () => deleteSale(button.dataset.deleteSale));
  });
}

function renderPurchases() {
  const term = getSearchTerm();
  const purchases = [...state.purchases]
    .filter((purchase) => matchesSearch([medicineName(purchase.medicineId), supplierName(purchase.supplierId), purchase.date, purchase.paymentStatus], term))
    .sort((a, b) => b.date.localeCompare(a.date));

  elements.purchaseTable.innerHTML = purchases.length
    ? purchases.map((purchase) => `
        <tr>
          <td>${formatDate(purchase.date)}</td>
          <td>${escapeHtml(supplierName(purchase.supplierId))}</td>
          <td>${escapeHtml(medicineName(purchase.medicineId))}</td>
          <td>${purchase.quantity}</td>
          <td>${formatMoney(purchase.total)}</td>
          <td>${formatMoney(purchase.paidAmount || 0)}<br><span class="subtle">Due ${formatMoney(purchase.remainingBalance || 0)}</span></td>
          <td>${paymentPill(purchase.paymentStatus)}</td>
          <td>
            <div class="table-actions">
              ${purchase.paymentStatus !== "Paid" ? `<button class="mini-button" type="button" data-add-supplier-payment="${purchase.id}">Pay</button>` : ""}
              ${supplierPaymentsForPurchase(purchase.id).map((payment) => `
                <button class="mini-button" type="button" data-print-supplier-payment="${payment.id}">Print ${escapeHtml(payment.voucherNumber)}</button>
                <button class="mini-button danger" type="button" data-delete-supplier-payment="${payment.id}">Delete ${escapeHtml(payment.voucherNumber)}</button>
              `).join("")}
              <button class="mini-button danger" type="button" data-delete-purchase="${purchase.id}">Delete</button>
            </div>
          </td>
        </tr>
      `).join("")
    : emptyTableRow("No purchase records match this search.", 8);

  document.getElementById("purchaseTotalLabel").textContent = `${purchases.length} records | ${formatMoney(purchases.reduce((sum, purchase) => sum + purchase.total, 0))}`;
  elements.purchaseTable.querySelectorAll("[data-add-supplier-payment]").forEach((button) => {
    button.addEventListener("click", () => openSupplierPaymentDialog(button.dataset.addSupplierPayment));
  });
  elements.purchaseTable.querySelectorAll("[data-print-supplier-payment]").forEach((button) => {
    button.addEventListener("click", () => {
      const payment = state.supplierPayments.find((item) => item.id === button.dataset.printSupplierPayment);
      if (payment) openDocument("Supplier Payment Voucher", supplierPaymentVoucherMarkup(payment));
    });
  });
  elements.purchaseTable.querySelectorAll("[data-delete-supplier-payment]").forEach((button) => {
    button.addEventListener("click", () => deleteSupplierPayment(button.dataset.deleteSupplierPayment));
  });
  elements.purchaseTable.querySelectorAll("[data-delete-purchase]").forEach((button) => {
    button.addEventListener("click", () => deletePurchase(button.dataset.deletePurchase));
  });
}

function renderSuppliers() {
  const term = getSearchTerm();
  const balances = supplierBalances();
  const suppliers = state.suppliers.filter((supplier) => matchesSearch([supplier.name, supplier.phone, supplier.email, supplier.address], term));
  elements.supplierCards.innerHTML = suppliers.length
    ? suppliers.map((supplier) => {
        const balance = balances.find((item) => item.supplierId === supplier.id);
        return entityCard(
          supplier,
          `${supplierMedicines(supplier.id)} medicine batches | Payable ${formatMoney(balance?.balance || 0)}`,
          `<button class="mini-button danger" type="button" data-delete-supplier="${supplier.id}">Delete</button>`
        );
      }).join("")
    : `<div class="empty-state">No suppliers match this search.</div>`;

  elements.supplierCards.querySelectorAll("[data-delete-supplier]").forEach((button) => {
    button.addEventListener("click", () => deleteSupplier(button.dataset.deleteSupplier));
  });
}

function renderCustomers() {
  const term = getSearchTerm();
  const balances = customerBalances();
  const customers = state.customers.filter((customer) => matchesSearch([customer.name, customer.phone, customer.email, customer.address], term));
  elements.customerCards.innerHTML = customers.length
    ? customers.map((customer) => {
        const balance = balances.find((item) => item.customerId === customer.id);
        return entityCard(
          customer,
          `${customerSales(customer.id)} invoices | Balance ${formatMoney(balance?.balance || 0)}`,
          `<button class="mini-button" type="button" data-print-customer-receipt="${customer.id}">Print Receipt</button>
          <button class="mini-button danger" type="button" data-delete-customer="${customer.id}">Delete</button>`
        );
      }).join("")
    : `<div class="empty-state">No customers match this search.</div>`;

  elements.customerCards.querySelectorAll("[data-print-customer-receipt]").forEach((button) => {
    button.addEventListener("click", () => printCustomerReceipt(button.dataset.printCustomerReceipt));
  });
  elements.customerCards.querySelectorAll("[data-delete-customer]").forEach((button) => {
    button.addEventListener("click", () => deleteCustomer(button.dataset.deleteCustomer));
  });
}

function renderUsers() {
  const term = getSearchTerm();
  const users = state.users.filter((user) => matchesSearch([user.name, user.role, user.email, user.status], term));
  elements.userTable.innerHTML = users.length
    ? users.map((user) => `
        <tr>
          <td><strong>${escapeHtml(user.name)}</strong></td>
          <td>${escapeHtml(user.role)}</td>
          <td>${escapeHtml(user.email)}</td>
          <td>${pill(user.status, user.status === "Active" ? "success" : "warning")}</td>
          <td>
            ${
              user.id === currentUser.id
                ? pill("Current user", "success")
                : `<button class="mini-button danger" type="button" data-delete-user="${user.id}">Delete</button>`
            }
          </td>
        </tr>
      `).join("")
    : emptyTableRow("No users match this search.", 5);

  elements.userTable.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.deleteUser));
  });
}

function renderReports() {
  const { from, to, customerId, supplierId } = reportFilters();
  const sales = state.sales.filter((sale) => inDateRange(sale.date, from, to) && (!customerId || sale.customerId === customerId));
  const purchases = state.purchases.filter((purchase) => inDateRange(purchase.date, from, to) && (!supplierId || purchase.supplierId === supplierId));
  const expenses = state.expenses.filter((expense) => inDateRange(expense.date, from, to));
  const salaries = state.salaryPayments.filter((salary) => inDateRange(salary.date, from, to));
  const withdrawals = state.withdrawals.filter((withdrawal) => inDateRange(withdrawal.date, from, to));
  const salesTotal = sales.reduce((sum, sale) => sum + sale.total, 0);
  const purchaseTotal = purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const salaryTotal = salaries.reduce((sum, salary) => sum + salary.netPaidAmount, 0);
  const withdrawalTotal = withdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount, 0);
  const inventoryValue = state.medicines.reduce((sum, medicine) => sum + medicine.stock * medicine.cost, 0);
  const cogs = sales.reduce((sum, sale) => sum + saleItemCostTotal(sale), 0);
  const grossProfit = salesTotal - cogs;
  const netProfit = grossProfit - expenseTotal - salaryTotal;

  elements.financialReport.innerHTML = [
    ["Sales report", formatMoney(salesTotal)],
    ["Purchases report", formatMoney(purchaseTotal)],
    ["Expense report", formatMoney(expenseTotal)],
    ["Salary report", formatMoney(salaryTotal)],
    ["Withdrawal report", formatMoney(withdrawalTotal)],
    ["Inventory value", formatMoney(inventoryValue)],
    ["Gross profit", formatMoney(grossProfit)],
    ["Profit and loss", formatMoney(netProfit)],
  ].map(reportCard).join("");

  const totalsByMedicine = {};
  for (const sale of sales) {
    for (const item of sale.items || []) totalsByMedicine[item.medicineId] = (totalsByMedicine[item.medicineId] || 0) + item.lineTotal;
  }
  const maxSale = Math.max(...Object.values(totalsByMedicine), 1);
  const bars = Object.entries(totalsByMedicine)
    .sort((a, b) => b[1] - a[1])
    .map(([medicineId, total]) => {
      const width = Math.max((total / maxSale) * 100, 4);
      return `
        <div class="bar-row">
          <strong>${escapeHtml(medicineName(medicineId))}</strong>
          <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
          <span>${formatMoney(total)}</span>
        </div>
      `;
    });
  elements.salesBars.innerHTML = bars.length ? bars.join("") : `<div class="empty-state">No sales data yet.</div>`;

  const expiring = [...state.medicines].filter((medicine) => daysUntil(medicine.expiry) <= 180).sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry));
  elements.expiryReport.innerHTML = expiring.length
    ? expiring.map((medicine) => `
        <tr>
          <td>${escapeHtml(medicine.name)}</td>
          <td>${escapeHtml(medicine.batch)}</td>
          <td>${daysUntil(medicine.expiry)}</td>
          <td>${formatMoney(medicine.stock * medicine.cost)}</td>
        </tr>
      `).join("")
    : emptyTableRow("No batches expiring in the next 180 days.", 4);

  const reorder = state.medicines.filter((medicine) => medicine.stock <= medicine.reorderLevel).sort((a, b) => a.stock - b.stock);
  elements.reorderReport.innerHTML = reorder.length
    ? reorder.map((medicine) => {
        const suggested = Math.max(medicine.reorderLevel * 2 - medicine.stock, medicine.reorderLevel);
        return `
          <tr>
            <td>${escapeHtml(medicine.name)}</td>
            <td>${medicine.stock}</td>
            <td>${medicine.reorderLevel}</td>
            <td>${suggested}</td>
          </tr>
        `;
      }).join("")
    : emptyTableRow("No reorder needed right now.", 4);
}

function reportCard([label, value]) {
  return `
    <article class="report-card">
      <span class="report-card-icon">${iconSvg("reports")}</span>
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    </article>
  `;
}

function renderAccounting() {
  const receivables = customerBalances().reduce((sum, item) => sum + item.balance, 0);
  const payables = supplierBalances().reduce((sum, item) => sum + item.balance, 0);
  const salesTotal = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  const paidSales = state.sales.filter((sale) => sale.paymentStatus === "Paid").reduce((sum, sale) => sum + sale.total, 0);
  const partialSales = state.sales.filter((sale) => sale.paymentStatus === "Partially Paid").reduce((sum, sale) => sum + sale.total, 0);
  const unpaidSales = state.sales.filter((sale) => sale.paymentStatus === "Unpaid").reduce((sum, sale) => sum + sale.total, 0);
  const purchasesTotal = state.purchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const cashBankTotal = state.bankAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  elements.accountingSummary.innerHTML = [
    ["Total sales", formatMoney(salesTotal)],
    ["Paid sales", formatMoney(paidSales)],
    ["Unpaid sales", formatMoney(unpaidSales)],
    ["Partially paid sales", formatMoney(partialSales)],
    ["Accounts receivable", formatMoney(receivables)],
    ["Total purchases", formatMoney(purchasesTotal)],
    ["Accounts payable", formatMoney(payables)],
    ["Cash + bank", formatMoney(cashBankTotal)],
  ].map(reportCard).join("");

  const customerRows = customerBalances();
  elements.customerBalanceTable.innerHTML = customerRows.length
    ? customerRows.map((row) => `
        <tr>
          <td>${escapeHtml(row.customerName)}</td>
          <td>${formatMoney(row.totalInvoices)}</td>
          <td>${formatMoney(row.totalPaid)}</td>
          <td>${formatMoney(row.balance)}</td>
          <td>${row.unpaidCount}</td>
          <td>${row.partialCount}</td>
        </tr>
      `).join("")
    : emptyTableRow("No customer balances yet.", 6);

  const supplierRows = supplierBalances();
  elements.supplierBalanceTable.innerHTML = supplierRows.length
    ? supplierRows.map((row) => `
        <tr>
          <td>${escapeHtml(row.supplierName)}</td>
          <td>${formatMoney(row.totalPurchases)}</td>
          <td>${formatMoney(row.totalPaid)}</td>
          <td>${formatMoney(row.balance)}</td>
        </tr>
      `).join("")
    : emptyTableRow("No supplier balances yet.", 4);

  const transactions = [...state.accountTransactions].filter((item) => !item.reversed).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  elements.transactionTable.innerHTML = transactions.length
    ? transactions.map((txn) => `
        <tr>
          <td>${formatDate(txn.date)}</td>
          <td>${escapeHtml(txn.accountName)}</td>
          <td>${escapeHtml(txn.description)}</td>
          <td>${formatMoney(txn.amount)}</td>
        </tr>
      `).join("")
    : emptyTableRow("No account transactions yet.", 4);
}

function renderExpenses() {
  const expenses = [...state.expenses].sort((a, b) => b.date.localeCompare(a.date));
  elements.expenseTable.innerHTML = expenses.length
    ? expenses.map((expense) => `
        <tr>
          <td>${formatDate(expense.date)}</td>
          <td>${escapeHtml(expense.category)}</td>
          <td>${formatMoney(expense.amount)}</td>
          <td>${escapeHtml(expense.paidFromAccountName)}</td>
          <td>${escapeHtml(expense.notes || "")}</td>
          <td><button class="mini-button danger" type="button" data-delete-expense="${expense.id}">Delete</button></td>
        </tr>
      `).join("")
    : emptyTableRow("No expenses yet.", 6);

  elements.expenseTable.querySelectorAll("[data-delete-expense]").forEach((button) => {
    button.addEventListener("click", () => deleteExpense(button.dataset.deleteExpense));
  });
}

function renderPayroll() {
  const salaries = [...state.salaryPayments].sort((a, b) => b.date.localeCompare(a.date));
  elements.salaryTable.innerHTML = salaries.length
    ? salaries.map((salary) => `
        <tr>
          <td>${formatDate(salary.date)}</td>
          <td>${escapeHtml(salary.employeeName)}</td>
          <td>${escapeHtml(salary.month)}</td>
          <td>${formatMoney(salary.netPaidAmount)}</td>
          <td>${escapeHtml(salary.paidFromAccountName)}</td>
          <td><button class="mini-button danger" type="button" data-delete-salary="${salary.id}">Delete</button></td>
        </tr>
      `).join("")
    : emptyTableRow("No salary payments yet.", 6);

  elements.salaryTable.querySelectorAll("[data-delete-salary]").forEach((button) => {
    button.addEventListener("click", () => deleteSalary(button.dataset.deleteSalary));
  });
}

function renderBanking() {
  elements.bankAccountCards.innerHTML = state.bankAccounts.length
    ? state.bankAccounts.map((account) => `
        <article class="entity-card">
          <strong>${escapeHtml(account.name)}</strong>
          <span>${escapeHtml(account.type)}</span>
          <div class="entity-meta">
            <span>Opening: ${formatMoney(account.openingBalance)}</span>
            <span>Deposits: ${formatMoney(account.totalDeposits)}</span>
            <span>Withdrawals: ${formatMoney(account.totalWithdrawals)}</span>
            <span>Current: ${formatMoney(account.currentBalance)}</span>
          </div>
          <div class="entity-actions">
            ${
              isProtectedAccount(account.id)
                ? `<span class="subtle">Protected system account</span>`
                : `<button class="mini-button danger" type="button" data-delete-bank-account="${account.id}">Delete</button>`
            }
          </div>
        </article>
      `).join("")
    : `<div class="empty-state">No bank accounts configured.</div>`;

  elements.bankAccountCards.querySelectorAll("[data-delete-bank-account]").forEach((button) => {
    button.addEventListener("click", () => deleteBankAccount(button.dataset.deleteBankAccount));
  });

  const withdrawals = [...state.withdrawals].sort((a, b) => b.date.localeCompare(a.date));
  elements.withdrawalTable.innerHTML = withdrawals.length
    ? withdrawals.map((withdrawal) => `
        <tr>
          <td>${formatDate(withdrawal.date)}</td>
          <td>${escapeHtml(withdrawal.type)}</td>
          <td>${formatMoney(withdrawal.amount)}</td>
          <td>${escapeHtml(withdrawal.accountName)}</td>
          <td>${escapeHtml(withdrawal.reason || withdrawal.notes || "")}</td>
          <td><button class="mini-button danger" type="button" data-delete-withdrawal="${withdrawal.id}">Delete</button></td>
        </tr>
      `).join("")
    : emptyTableRow("No withdrawals yet.", 6);

  elements.withdrawalTable.querySelectorAll("[data-delete-withdrawal]").forEach((button) => {
    button.addEventListener("click", () => deleteWithdrawal(button.dataset.deleteWithdrawal));
  });

  const transfers = [...state.internalTransfers].sort((a, b) => b.date.localeCompare(a.date));
  elements.transferTable.innerHTML = transfers.length
    ? transfers.map((transfer) => `
        <tr>
          <td>${formatDate(transfer.date)}</td>
          <td>${escapeHtml(transfer.transferNumber)}</td>
          <td>${escapeHtml(transfer.fromAccountName)}</td>
          <td>${escapeHtml(transfer.toAccountName)}</td>
          <td>${formatMoney(transfer.amount)}</td>
          <td><button class="mini-button danger" type="button" data-delete-transfer="${transfer.id}">Delete</button></td>
        </tr>
      `).join("")
    : emptyTableRow("No transfers yet.", 6);

  elements.transferTable.querySelectorAll("[data-delete-transfer]").forEach((button) => {
    button.addEventListener("click", () => deleteInternalTransfer(button.dataset.deleteTransfer));
  });
}

function renderSettings() {
  const modules = [
    ["barcode", "Barcode", "Track SKU/barcode values on medicine and invoice records."],
    ["payments", "Payments", "Track payment receipts and customer balances."],
    ["delivery", "Delivery", "Generate customer receiving receipts."],
    ["accounting", "Accounting", "Track cashbox, banks, expenses, salaries, and profit."],
  ];

  elements.moduleGrid.innerHTML = modules.map(([key, title, description]) => `
    <article class="module-card">
      <header>
        <div>
          <strong>${escapeHtml(t(title))}</strong>
          <span>${escapeHtml(description)}</span>
        </div>
        <label class="switch">
          <input type="checkbox" data-module="${key}" ${state.modules[key] ? "checked" : ""}>
          <span></span>
        </label>
      </header>
      ${pill(state.modules[key] ? t("Enabled") : t("Off"), state.modules[key] ? "success" : "warning")}
    </article>
  `).join("");

  elements.moduleGrid.querySelectorAll("[data-module]").forEach((input) => {
    input.addEventListener("change", () => updateModule(input.dataset.module, input.checked));
  });

  renderFeatureVisibility();

  elements.auditLog.innerHTML = state.auditLogs.length
    ? [...state.auditLogs].reverse().slice(0, 12).map((log) => `
        <article class="audit-item">
          <div>
            <strong>${escapeHtml(log.action)}</strong>
            <span>${escapeHtml(log.detail)} by ${escapeHtml(log.userName)}</span>
          </div>
          <span>${formatDateTime(log.at)}</span>
        </article>
      `).join("")
    : `<div class="empty-state">No audit activity yet.</div>`;
}

function renderFeatureVisibility() {
  if (!elements.featureVisibilityGrid) return;
  const roles = Object.keys(state.roleFeatureDefaults || {}).filter((role) => role !== "Admin");
  const configurableFeatures = (state.features || []).filter((feature) => !["dashboard", "settings"].includes(feature.key));
  elements.featureVisibilityGrid.innerHTML = roles.length
    ? roles.map((role) => {
        const allowed = new Set(state.roleFeatureDefaults[role] || []);
        const hidden = new Set(state.featureVisibility?.[role] || []);
        const featureToggles = configurableFeatures
          .filter((feature) => allowed.has(feature.key))
          .map((feature) => `
            <label class="feature-toggle">
              <span>
                <strong>${escapeHtml(t(feature.label))}</strong>
                <small>${hidden.has(feature.key) ? t("Hidden") : t("Visible")}</small>
              </span>
              <span class="switch">
                <input type="checkbox" data-feature-role="${role}" data-feature-key="${feature.key}" ${hidden.has(feature.key) ? "" : "checked"}>
                <span></span>
              </span>
            </label>
          `).join("");
        return `
          <article class="module-card feature-role-card">
            <header>
              <div>
                <strong>${escapeHtml(role)}</strong>
                <span>${escapeHtml(t("Hide ERP sections by role"))}</span>
              </div>
            </header>
            <div class="feature-toggle-list">
              ${featureToggles || `<div class="empty-state">${t("No configurable features for this role.")}</div>`}
            </div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state">${t("No configurable features for this role.")}</div>`;

  elements.featureVisibilityGrid.querySelectorAll("[data-feature-role]").forEach((input) => {
    input.addEventListener("change", () => updateFeatureVisibility(input.dataset.featureRole, input.dataset.featureKey, input.checked));
  });
}

async function saveMedicine(event) {
  event.preventDefault();
  const id = getValue("medicineId");
  const payload = {
    name: getValue("medicineName"),
    sku: getValue("medicineSku"),
    category: getValue("medicineCategory"),
    batch: getValue("medicineBatch"),
    productionDate: getValue("medicineProduction"),
    supplierId: getValue("medicineSupplier"),
    location: getValue("medicineLocation"),
    stock: getNumber("medicineStock"),
    reorderLevel: getNumber("medicineReorder"),
    cost: getNumber("medicineCost"),
    price: getNumber("medicinePrice"),
    expiry: getValue("medicineExpiry"),
  };
  const path = id ? `/api/medicines/${encodeURIComponent(id)}` : "/api/medicines";
  const method = id ? "PUT" : "POST";
  await submitAction(() => api(path, { method, body: payload }), id ? "Medicine updated." : "Medicine added.");
  resetMedicineForm();
  await reloadData();
}

async function saveSale(event) {
  event.preventDefault();
  const items = collectSaleItems();
  const bonusItems = collectBonusItems();
  if (!items.length) {
    toast("Add at least one invoice item.");
    return;
  }

  const payload = {
    customerId: getValue("saleCustomer"),
    date: getValue("saleDate"),
    items,
    bonusItems,
    deliveryStatus: getValue("saleDeliveryStatus"),
    allowExpiredOverride: document.getElementById("saleExpiredOverride").checked,
    notes: getValue("saleNotes"),
  };
  if (!editingSaleId) {
    payload.initialPaymentAmount = getNumber("saleInitialPayment");
    payload.paymentMethod = getValue("salePaymentMethod");
    payload.accountId = getValue("salePaymentAccount");
  }

  try {
    const wasEditing = Boolean(editingSaleId);
    const path = editingSaleId ? `/api/sales/${encodeURIComponent(editingSaleId)}` : "/api/sales";
    const method = editingSaleId ? "PUT" : "POST";
    const response = await api(path, { method, body: payload });
    await reloadData();
    resetSaleForm();
    toast(wasEditing ? `${response.sale.invoiceNumber} updated.` : `${response.sale.invoiceNumber} created.`);
    openInvoice(response.sale.id);
  } catch (error) {
    toast(error.message);
  }
}

async function savePurchase(event) {
  event.preventDefault();
  const payload = {
    supplierId: getValue("purchaseSupplier"),
    medicineId: getValue("purchaseMedicine"),
    quantity: getNumber("purchaseQuantity"),
    unitCost: getNumber("purchaseCost"),
    date: getValue("purchaseDate"),
    paidAmount: getNumber("purchasePaidAmount"),
    paymentMethod: getValue("purchasePaymentMethod"),
    accountId: getValue("purchasePaymentAccount"),
  };
  await submitAction(() => api("/api/purchases", { method: "POST", body: payload }), "Purchase recorded and stock updated.");
  event.target.reset();
  await reloadData();
  setDefaultFormValues();
}

async function saveSupplier(event) {
  event.preventDefault();
  const payload = {
    name: getValue("supplierName"),
    phone: getValue("supplierPhone"),
    email: getValue("supplierEmail"),
    address: getValue("supplierAddress"),
  };
  await submitAction(() => api("/api/suppliers", { method: "POST", body: payload }), "Supplier added.");
  event.target.reset();
  await reloadData();
}

async function saveCustomer(event) {
  event.preventDefault();
  const payload = {
    name: getValue("customerName"),
    phone: getValue("customerPhone"),
    email: getValue("customerEmail"),
    address: getValue("customerAddress"),
  };
  await submitAction(() => api("/api/customers", { method: "POST", body: payload }), "Customer added.");
  event.target.reset();
  await reloadData();
}

async function saveUser(event) {
  event.preventDefault();
  const payload = {
    name: getValue("userName"),
    role: getValue("userRole"),
    email: getValue("userEmail"),
    password: getValue("userPassword"),
    status: getValue("userStatus"),
  };
  await submitAction(() => api("/api/users", { method: "POST", body: payload }), "User added.");
  event.target.reset();
  await reloadData();
}

async function saveAccount(event) {
  event.preventDefault();
  const newPassword = getValue("accountNewPassword");
  const confirmPassword = getValue("accountConfirmPassword");
  if (newPassword !== confirmPassword) {
    toast("New password and confirmation do not match.");
    return;
  }
  const payload = {
    email: getValue("accountEmail"),
    currentPassword: getValue("accountCurrentPassword"),
    newPassword,
  };
  try {
    const response = await api("/api/me/account", { method: "PATCH", body: payload });
    currentUser = response.user;
    document.getElementById("currentUserName").textContent = currentUser.name;
    document.getElementById("currentUserRole").textContent = currentUser.role;
    await reloadData();
    fillAccountForm();
    toast("Account updated.");
  } catch (error) {
    toast(error.message);
  }
}

async function deleteUser(id) {
  const user = state.users.find((item) => item.id === id);
  if (!user) return;
  if (!confirm(`Delete user ${user.name}? This removes their login access.`)) return;
  await submitAction(() => api(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" }), "User deleted.");
  await reloadData();
}

async function deleteRecord(path, confirmMessage, successMessage, afterReload) {
  if (!confirm(confirmMessage)) return;
  try {
    await api(path, { method: "DELETE" });
    await reloadData();
    if (afterReload) afterReload();
    toast(successMessage);
  } catch (error) {
    toast(error.message);
  }
}

function deleteMedicine(id) {
  const medicine = findMedicine(id);
  if (!medicine) return;
  deleteRecord(
    `/api/medicines/${encodeURIComponent(id)}`,
    `Delete ${medicine.name} batch ${medicine.batch}?`,
    "Medicine batch deleted."
  );
}

function deleteSupplier(id) {
  const supplier = state.suppliers.find((item) => item.id === id);
  if (!supplier) return;
  deleteRecord(
    `/api/suppliers/${encodeURIComponent(id)}`,
    `Delete supplier ${supplier.name}?`,
    "Supplier deleted."
  );
}

function deleteCustomer(id) {
  const customer = state.customers.find((item) => item.id === id);
  if (!customer) return;
  deleteRecord(
    `/api/customers/${encodeURIComponent(id)}`,
    `Delete customer ${customer.name}?`,
    "Customer deleted."
  );
}

function deletePurchase(id) {
  const purchase = state.purchases.find((item) => item.id === id);
  if (!purchase) return;
  deleteRecord(
    `/api/purchases/${encodeURIComponent(id)}`,
    `Delete this purchase for ${medicineName(purchase.medicineId)}? This reverses attached supplier payments and removes the received stock.`,
    "Purchase deleted and stock/payment effects reversed."
  );
}

function deleteSupplierPayment(id) {
  const payment = state.supplierPayments.find((item) => item.id === id);
  if (!payment) return;
  deleteRecord(
    `/api/supplier-payments/${encodeURIComponent(id)}`,
    `Delete supplier payment voucher ${payment.voucherNumber}?`,
    "Supplier payment deleted and account balance reversed."
  );
}

function deleteCustomerPayment(id) {
  const payment = state.customerPayments.find((item) => item.id === id);
  if (!payment) return;
  deleteRecord(
    `/api/customer-payments/${encodeURIComponent(id)}`,
    `Delete payment receipt ${payment.receiptNumber}?`,
    "Payment receipt deleted and invoice balance updated.",
    refreshOpenInvoice
  );
}

function deleteLatestDeliveryReceipt() {
  const sale = state.sales.find((item) => item.id === selectedInvoiceId);
  if (!sale) return toast("Open an invoice first.");
  const receipt = latestDeliveryReceipt(sale.id);
  if (!receipt) return toast("No delivery receipt exists for this invoice yet.");
  deleteRecord(
    `/api/delivery-receipts/${encodeURIComponent(receipt.id)}`,
    `Delete delivery receipt ${receipt.receiptNumber}?`,
    "Delivery receipt deleted.",
    refreshOpenInvoice
  );
}

function deleteExpense(id) {
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) return;
  const salaryNote = expense.source === "salary" ? " The linked salary payment will also be removed." : "";
  deleteRecord(
    `/api/expenses/${encodeURIComponent(id)}`,
    `Delete expense ${expense.expenseNumber}? This reverses the bank/cashbox transaction.${salaryNote}`,
    "Expense deleted and account balance reversed."
  );
}

function deleteSalary(id) {
  const salary = state.salaryPayments.find((item) => item.id === id);
  if (!salary) return;
  deleteRecord(
    `/api/salaries/${encodeURIComponent(id)}`,
    `Delete salary payment for ${salary.employeeName}? This removes the linked salary expense too.`,
    "Salary payment deleted and linked expense reversed."
  );
}

function deleteWithdrawal(id) {
  const withdrawal = state.withdrawals.find((item) => item.id === id);
  if (!withdrawal) return;
  deleteRecord(
    `/api/withdrawals/${encodeURIComponent(id)}`,
    `Delete withdrawal ${withdrawal.type}? This reverses the account movement.`,
    "Withdrawal deleted and account balance reversed."
  );
}

function deleteBankAccount(id) {
  const account = state.bankAccounts.find((item) => item.id === id);
  if (!account) return;
  deleteRecord(
    `/api/bank-accounts/${encodeURIComponent(id)}`,
    `Delete account ${account.name}? Accounts with active transactions cannot be removed.`,
    "Bank account deleted."
  );
}

function deleteInternalTransfer(id) {
  const transfer = state.internalTransfers.find((item) => item.id === id);
  if (!transfer) return;
  deleteRecord(
    `/api/internal-transfers/${encodeURIComponent(id)}`,
    `Delete transfer ${transfer.transferNumber}? This reverses both account movements.`,
    "Internal transfer deleted and both balances reversed."
  );
}

async function saveCustomerPayment(event) {
  event.preventDefault();
  if (!selectedInvoiceId) return;
  const payload = {
    amount: getNumber("paymentAmount"),
    date: getValue("paymentDate"),
    method: getValue("paymentMethod"),
    accountId: getValue("paymentAccount"),
    notes: getValue("paymentNotes"),
  };
  try {
    const response = await api(`/api/sales/${encodeURIComponent(selectedInvoiceId)}/payments`, { method: "POST", body: payload });
    elements.paymentDialog.close();
    await reloadData();
    openInvoice(selectedInvoiceId);
    openManualReceiptDialog();
    toast(`${response.payment.receiptNumber} created.`);
  } catch (error) {
    toast(error.message);
  }
}

async function saveSupplierPayment(event) {
  event.preventDefault();
  if (!selectedPurchaseId) return;
  const payload = {
    amount: getNumber("supplierPaymentAmount"),
    date: getValue("supplierPaymentDate"),
    method: getValue("supplierPaymentMethod"),
    accountId: getValue("supplierPaymentAccount"),
    notes: getValue("supplierPaymentNotes"),
  };
  try {
    const response = await api(`/api/purchases/${encodeURIComponent(selectedPurchaseId)}/payments`, { method: "POST", body: payload });
    elements.supplierPaymentDialog.close();
    await reloadData();
    openDocument("Supplier Payment Voucher", supplierPaymentVoucherMarkup(response.payment));
    toast(`${response.payment.voucherNumber} created.`);
  } catch (error) {
    toast(error.message);
  }
}

async function saveDeliveryReceipt(event) {
  event.preventDefault();
  if (!selectedInvoiceId) return;
  const payload = {
    date: getValue("deliveryDate"),
    customerType: getValue("deliveryCustomerType"),
    receiverName: getValue("deliveryReceiverName"),
    receiverPhone: getValue("deliveryReceiverPhone"),
    deliveryPerson: getValue("deliveryPerson"),
    notes: getValue("deliveryNotes"),
  };
  try {
    const response = await api(`/api/sales/${encodeURIComponent(selectedInvoiceId)}/delivery-receipts`, { method: "POST", body: payload });
    elements.deliveryDialog.close();
    await reloadData();
    openInvoice(selectedInvoiceId);
    openDocument("Goods Delivery Receipt", deliveryReceiptMarkup(response.receipt));
    toast(`${response.receipt.receiptNumber} generated.`);
  } catch (error) {
    toast(error.message);
  }
}

async function saveExpense(event) {
  event.preventDefault();
  const payload = {
    date: getValue("expenseDate"),
    category: getValue("expenseCategory"),
    amount: getNumber("expenseAmount"),
    method: getValue("expenseMethod"),
    accountId: getValue("expenseAccount"),
    notes: getValue("expenseNotes"),
  };
  await submitAction(() => api("/api/expenses", { method: "POST", body: payload }), "Expense saved.");
  event.target.reset();
  await reloadData();
  setDefaultFormValues();
}

async function saveSalary(event) {
  event.preventDefault();
  const payload = {
    employeeName: getValue("salaryEmployee"),
    month: getValue("salaryMonth"),
    baseSalary: getNumber("salaryBase"),
    deductions: getNumber("salaryDeductions"),
    bonuses: getNumber("salaryBonuses"),
    advances: getNumber("salaryAdvances"),
    netPaidAmount: getNumber("salaryNet"),
    accountId: getValue("salaryAccount"),
    notes: getValue("salaryNotes"),
  };
  await submitAction(() => api("/api/salaries", { method: "POST", body: payload }), "Salary payment saved.");
  event.target.reset();
  await reloadData();
  setDefaultFormValues();
}

async function saveWithdrawal(event) {
  event.preventDefault();
  const payload = {
    date: getValue("withdrawalDate"),
    type: getValue("withdrawalType"),
    amount: getNumber("withdrawalAmount"),
    withdrawnBy: getValue("withdrawalBy"),
    accountId: getValue("withdrawalAccount"),
    reason: getValue("withdrawalReason"),
    notes: getValue("withdrawalNotes"),
  };
  await submitAction(() => api("/api/withdrawals", { method: "POST", body: payload }), "Withdrawal saved.");
  event.target.reset();
  await reloadData();
  setDefaultFormValues();
}

async function saveTransfer(event) {
  event.preventDefault();
  const payload = {
    fromAccountId: getValue("transferFrom"),
    toAccountId: getValue("transferTo"),
    amount: getNumber("transferAmount"),
    date: getValue("transferDate"),
    notes: getValue("transferNotes"),
  };
  await submitAction(() => api("/api/internal-transfers", { method: "POST", body: payload }), "Transfer saved.");
  event.target.reset();
  await reloadData();
  setDefaultFormValues();
}

async function saveBankAccount(event) {
  event.preventDefault();
  const payload = {
    name: getValue("bankAccountName"),
    type: getValue("bankAccountType"),
    openingBalance: getNumber("bankOpeningBalance"),
  };
  await submitAction(() => api("/api/bank-accounts", { method: "POST", body: payload }), "Account added.");
  event.target.reset();
  await reloadData();
}

async function submitAction(action, successMessage) {
  try {
    await action();
    toast(successMessage);
  } catch (error) {
    toast(error.message);
  }
}

function editMedicine(id) {
  const medicine = findMedicine(id);
  if (!medicine) return;
  document.getElementById("medicineId").value = medicine.id;
  document.getElementById("medicineName").value = medicine.name;
  document.getElementById("medicineSku").value = medicine.sku;
  document.getElementById("medicineCategory").value = medicine.category;
  document.getElementById("medicineBatch").value = medicine.batch;
  document.getElementById("medicineProduction").value = medicine.productionDate || "";
  document.getElementById("medicineSupplier").value = medicine.supplierId;
  document.getElementById("medicineLocation").value = medicine.location || "";
  document.getElementById("medicineStock").value = medicine.stock;
  document.getElementById("medicineReorder").value = medicine.reorderLevel;
  document.getElementById("medicineCost").value = medicine.cost;
  document.getElementById("medicinePrice").value = medicine.price;
  document.getElementById("medicineExpiry").value = medicine.expiry;
  document.getElementById("medicineFormTitle").textContent = "Edit Medicine Batch";
  document.getElementById("cancelMedicineEdit").classList.remove("hidden");
  document.getElementById("medicineName").focus();
}

function resetMedicineForm() {
  document.getElementById("medicineForm").reset();
  document.getElementById("medicineId").value = "";
  document.getElementById("medicineFormTitle").textContent = "Add Medicine";
  document.getElementById("cancelMedicineEdit").classList.add("hidden");
}

function editSale(id) {
  const sale = state.sales.find((item) => item.id === id);
  if (!sale) return;
  editingSaleId = sale.id;
  if (elements.invoiceDialog.open) elements.invoiceDialog.close();
  setView("sales");
  document.getElementById("saleFormTitle").textContent = `Edit ${sale.invoiceNumber}`;
  document.getElementById("saleSubmitButton").textContent = "Update invoice";
  document.getElementById("cancelSaleEdit").classList.remove("hidden");
  document.querySelectorAll(".sale-payment-field").forEach((field) => field.classList.add("hidden"));
  document.getElementById("saleCustomer").value = sale.customerId;
  document.getElementById("saleDate").value = sale.date || new Date().toISOString().slice(0, 10);
  document.getElementById("saleDeliveryStatus").value = sale.deliveryStatus || "Ready";
  document.getElementById("saleInitialPayment").value = "0";
  document.getElementById("saleExpiredOverride").checked = false;
  document.getElementById("saleNotes").value = sale.notes || "";
  saleItemRows = (sale.items || []).map((item) => createSaleItemRow(item));
  bonusItemRows = (sale.bonusItems || []).map((item) => createBonusItemRow(item));
  ensureSaleItemRows();
  renderSaleItems();
  renderBonusItems();
  document.getElementById("saleForm").scrollIntoView({ block: "start" });
}

function resetSaleForm() {
  editingSaleId = null;
  document.getElementById("saleForm").reset();
  document.getElementById("saleFormTitle").textContent = "New Sale";
  document.getElementById("saleSubmitButton").textContent = "Create invoice";
  document.getElementById("cancelSaleEdit").classList.add("hidden");
  document.querySelectorAll(".sale-payment-field").forEach((field) => field.classList.remove("hidden"));
  document.getElementById("saleDate").value = new Date().toISOString().slice(0, 10);
  saleItemRows = [createSaleItemRow()];
  bonusItemRows = [];
  renderSaleItems();
  renderBonusItems();
}

function setDefaultFormValues() {
  const today = new Date().toISOString().slice(0, 10);
  ["saleDate", "purchaseDate", "paymentDate", "supplierPaymentDate", "deliveryDate", "expenseDate", "transferDate", "withdrawalDate"].forEach((id) => {
    const input = document.getElementById(id);
    if (input && !input.value) input.value = today;
  });
  const salaryMonth = document.getElementById("salaryMonth");
  if (salaryMonth && !salaryMonth.value) salaryMonth.value = today.slice(0, 7);
  if (!saleItemRows.length) saleItemRows = [createSaleItemRow()];
  renderSaleItems();
  renderBonusItems();
  syncPurchaseCost();
  syncSalaryNet();
}

function syncPurchaseCost() {
  const medicine = findMedicine(getValue("purchaseMedicine"));
  if (medicine) document.getElementById("purchaseCost").value = medicine.cost;
}

function syncSalaryNet() {
  const base = getNumber("salaryBase");
  const deductions = getNumber("salaryDeductions");
  const bonuses = getNumber("salaryBonuses");
  const advances = getNumber("salaryAdvances");
  const net = Math.max(base + bonuses - deductions - advances, 0);
  const input = document.getElementById("salaryNet");
  if (input && !document.activeElement?.isSameNode(input)) input.value = net ? String(roundMoney(net)) : "";
}

function openInvoice(id) {
  selectedInvoiceId = id;
  const html = invoiceMarkup(id, "customer", { interactive: true });
  elements.invoicePreview.innerHTML = html;
  elements.printArea.innerHTML = invoiceMarkup(id, "customer");
  ["printInternalInvoice", "downloadInternalInvoicePdf"].forEach((buttonId) => {
    document.getElementById(buttonId).classList.toggle("hidden", !canUseInternalInvoice());
  });
  elements.invoiceDialog.showModal();
  bindInvoicePreviewActions();
}

function refreshOpenInvoice() {
  if (!selectedInvoiceId || !elements.invoiceDialog.open) return;
  const html = invoiceMarkup(selectedInvoiceId, "customer", { interactive: true });
  elements.invoicePreview.innerHTML = html;
  elements.printArea.innerHTML = invoiceMarkup(selectedInvoiceId, "customer");
  bindInvoicePreviewActions();
}

function bindInvoicePreviewActions() {
  elements.invoicePreview.querySelectorAll("[data-print-payment]").forEach((button) => {
    button.addEventListener("click", () => {
      const payment = state.customerPayments.find((item) => item.id === button.dataset.printPayment);
      if (payment) openManualReceiptDialog();
    });
  });
  elements.invoicePreview.querySelectorAll("[data-delete-payment]").forEach((button) => {
    button.addEventListener("click", () => deleteCustomerPayment(button.dataset.deletePayment));
  });
}

function documentBrandMarkup() {
  return `
    <div class="document-brand">
      <img src="assets/alnawaa-logo-horizontal.png" alt="alnawaa medical group">
      <p>${escapeHtml(state.settings.companySubtitle || "مجموعة النوى الطبية")}</p>
      <p>${escapeHtml(state.settings.companyDetails || "Tripoli - Ben Ashour Street")}</p>
    </div>
  `;
}

function documentFooterMarkup() {
  const phone = state.settings.companyPhone || "+218 091 069 3900";
  const phoneAlt = state.settings.companyPhoneAlt || "+218 092 069 3900";
  const email = state.settings.companyEmail || "INFO@ALNAWAA.COM";
  const address = state.settings.companyAddress || "Tripoli - Ben Ashour Street";
  const addressArabic = state.settings.companyAddressArabic || "طرابلس - شارع بن عاشور";
  return `
    <footer class="document-footer">
      <span>Tel: ${escapeHtml(phone)}</span>
      <span>Tel: ${escapeHtml(phoneAlt)}</span>
      <span>${escapeHtml(email)}</span>
      <span>${escapeHtml(address)}</span>
      <span dir="rtl">${escapeHtml(addressArabic)}</span>
    </footer>
  `;
}

function invoiceMarkup(id, type = "customer", options = {}) {
  const sale = state.sales.find((item) => item.id === id);
  if (!sale) return `<div class="empty-state">Invoice not found.</div>`;
  const customer = state.customers.find((item) => item.id === sale.customerId);
  const payments = state.customerPayments.filter((payment) => payment.saleId === sale.id);
  const isInternal = type === "internal";
  const interactive = Boolean(options.interactive);
  const documentTitle = isInternal ? "Internal Invoice" : "Customer Invoice";
  const bonusItems = sale.bonusItems || [];
  const invoiceCost = saleItemCostTotal(sale);
  const invoiceProfit = roundMoney(Number(sale.total || 0) - invoiceCost);
  const createdBy = state.users.find((user) => user.id === sale.createdBy);
  const rows = (sale.items || []).map((item) => {
    const itemCost = roundMoney(Number(item.quantity || 0) * Number(item.unitCost || 0));
    const itemProfit = roundMoney(Number(item.lineTotal || 0) - itemCost);
    if (isInternal) {
      return `
        <tr>
          <td>${escapeHtml(item.name)}<br><span class="subtle">${escapeHtml(item.sku || "")} | MFG ${formatDate(item.productionDate)} | EXP ${formatDate(item.expiry)}</span></td>
          <td>${escapeHtml(item.batch || "")}</td>
          <td>${item.quantity}</td>
          <td>${formatMoney(item.unitPrice)}</td>
          <td>${formatMoney(item.unitCost)}</td>
          <td>${formatMoney(item.lineTotal)}</td>
          <td>${formatMoney(itemProfit)}</td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>${escapeHtml(item.name)}<br><span class="subtle">${escapeHtml(item.sku || "")}</span></td>
        <td>${escapeHtml(item.batch || "")}</td>
        <td>${formatDate(item.productionDate)}</td>
        <td>${formatDate(item.expiry)}</td>
        <td>${item.quantity}</td>
        <td>${formatMoney(item.unitPrice)}</td>
        <td>${formatMoney(item.lineTotal)}</td>
      </tr>
    `;
  }).join("");
  const bonusRows = bonusItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}<br><span class="subtle">${escapeHtml(item.sku || "")}</span></td>
      <td>${escapeHtml(item.batch || "")}</td>
      <td>${formatDate(item.productionDate)}</td>
      <td>${formatDate(item.expiry)}</td>
      <td>${item.quantity}</td>
      <td><strong class="free-label">FREE</strong></td>
      <td><strong class="free-label">FREE</strong></td>
    </tr>
  `).join("");
  const bonusSection = bonusItems.length ? `
    <h3>Bonus</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Batch</th>
            <th>Production</th>
            <th>Expiry</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${bonusRows}</tbody>
      </table>
    </div>
  ` : "";
  const paymentHead = interactive
    ? "<tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Method</th><th>Actions</th></tr>"
    : "<tr><th>Receipt</th><th>Date</th><th>Amount</th><th>Method</th></tr>";
  const paymentRows = payments.length
    ? payments.map((payment) => `
        <tr>
          <td>${escapeHtml(payment.receiptNumber)}</td>
          <td>${formatDate(payment.date)}</td>
          <td>${formatMoney(payment.amount)}</td>
          <td>${escapeHtml(payment.method)}</td>
          ${interactive ? `
            <td>
              <div class="table-actions">
                <button class="mini-button" type="button" data-print-payment="${payment.id}">Print receipt</button>
                <button class="mini-button danger" type="button" data-delete-payment="${payment.id}">Delete</button>
              </div>
            </td>
          ` : ""}
        </tr>
      `).join("")
    : `<tr><td colspan="${interactive ? 5 : 4}"><div class="compact-empty">No payment receipts yet.</div></td></tr>`;
  const internalNotes = [
    sale.notes ? `Invoice notes: ${sale.notes}` : "",
    ...payments.filter((payment) => payment.notes).map((payment) => `${payment.receiptNumber}: ${payment.notes}`),
  ].filter(Boolean);
  const internalDetails = isInternal ? `
    <div class="internal-invoice-details">
      <div><span>Internal reference</span><strong>${escapeHtml(sale.id)}</strong></div>
      <div><span>Created by</span><strong>${escapeHtml(createdBy?.name || sale.createdBy || "N/A")}</strong></div>
      <div><span>Delivery status</span><strong>${escapeHtml(sale.deliveryStatus || "N/A")}</strong></div>
      <div><span>Total item cost</span><strong>${formatMoney(invoiceCost)}</strong></div>
      <div><span>Gross profit</span><strong>${formatMoney(invoiceProfit)}</strong></div>
      <div><span>Remaining balance</span><strong>${formatMoney(sale.remainingBalance || 0)}</strong></div>
    </div>
    ${internalNotes.length ? `<p class="internal-note"><strong>Internal notes:</strong> ${escapeHtml(internalNotes.join(" | "))}</p>` : ""}
  ` : "";
  const paymentSection = isInternal ? `
    <h3>Payment History</h3>
    <div class="table-wrap">
      <table>
        <thead>${paymentHead}</thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>
  ` : "";
  const summaryMarkup = isInternal ? `
    <div class="invoice-total">Total: ${formatMoney(sale.total)}</div>
    <div class="invoice-total">Paid: ${formatMoney(sale.totalPaid || 0)} | Remaining: ${formatMoney(sale.remainingBalance || 0)}</div>
  ` : `
    <div class="invoice-total">Total: ${formatMoney(sale.total)}</div>
    <div class="invoice-total">Paid: ${formatMoney(sale.totalPaid || 0)}</div>
    <div class="invoice-total">Remaining: ${formatMoney(sale.remainingBalance || 0)}</div>
  `;

  return `
    <section class="invoice-paper sales-invoice-paper ${isInternal ? "internal-invoice" : "customer-invoice"}">
      <div class="invoice-head">
        ${documentBrandMarkup()}
        <div class="document-title-block">
          <strong>${documentTitle}</strong>
          <p>${escapeHtml(sale.invoiceNumber)}</p>
          <p>Date: ${formatDate(sale.date)}</p>
          <p>Status: ${escapeHtml(sale.paymentStatus)}</p>
        </div>
      </div>
      <div>
        <strong>Bill to</strong>
        <p>${escapeHtml(customer?.name || "Unknown customer")}</p>
        <p>${escapeHtml(customer?.type || "Customer")} | ${escapeHtml(customer?.phone || "")}</p>
        <p>${escapeHtml(customer?.address || "")}</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            ${isInternal ? `
              <tr>
                <th>Product</th>
                <th>Batch</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Unit cost</th>
                <th>Total</th>
                <th>Profit</th>
              </tr>
            ` : `
              <tr>
                <th>Product</th>
                <th>Batch</th>
                <th>Production</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Total</th>
              </tr>
            `}
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${bonusSection}
      ${sale.notes ? `<p><strong>Notes:</strong> ${escapeHtml(sale.notes)}</p>` : ""}
      ${internalDetails}
      <div class="invoice-summary">
        ${summaryMarkup}
      </div>
      ${paymentSection}
      <div class="signature-grid">
        <div class="signature-box">Customer signature</div>
        <div class="signature-box">Company representative</div>
        <div class="signature-box">Stamp</div>
      </div>
      ${documentFooterMarkup()}
    </section>
  `;
}

function printSelectedInvoice(type = "customer") {
  if (!selectedInvoiceId) return;
  if (type === "internal" && !canUseInternalInvoice()) {
    toast("Internal invoices are available to authorized financial users only.");
    return;
  }
  elements.printArea.innerHTML = invoiceMarkup(selectedInvoiceId, type);
  window.print();
}

async function markInvoicePaid() {
  const sale = state.sales.find((item) => item.id === selectedInvoiceId);
  if (!sale) return;
  if ((sale.remainingBalance || 0) <= 0) return toast("Invoice is already paid.");
  try {
    const response = await api(`/api/sales/${encodeURIComponent(sale.id)}/payments`, {
      method: "POST",
      body: {
        amount: sale.remainingBalance,
        date: new Date().toISOString().slice(0, 10),
        method: "Cash",
        accountId: state.bankAccounts[0]?.id,
        notes: "Full payment from invoice",
      },
    });
    await reloadData();
    openInvoice(sale.id);
    openManualReceiptDialog();
    toast("Invoice marked as paid.");
  } catch (error) {
    toast(error.message);
  }
}

async function deleteSale(id) {
  const sale = state.sales.find((item) => item.id === id);
  if (!sale) return;
  const message = `Delete ${sale.invoiceNumber}? This removes the sale/invoice, receipts, and returns sold quantities to stock.`;
  if (!confirm(message)) return;
  try {
    await api(`/api/sales/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (selectedInvoiceId === id && elements.invoiceDialog.open) {
      elements.invoiceDialog.close();
      selectedInvoiceId = null;
    }
    await reloadData();
    toast(`${sale.invoiceNumber} deleted and stock restored.`);
  } catch (error) {
    toast(error.message);
  }
}

function openPaymentDialog() {
  const sale = state.sales.find((item) => item.id === selectedInvoiceId);
  if (!sale) return toast("Open an invoice first.");
  document.getElementById("paymentAmount").value = sale.remainingBalance || 0;
  document.getElementById("paymentDate").value = new Date().toISOString().slice(0, 10);
  elements.paymentDialog.showModal();
}

function openSupplierPaymentDialog(purchaseId) {
  selectedPurchaseId = purchaseId;
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) return toast("Purchase invoice not found.");
  document.getElementById("supplierPaymentAmount").value = purchase.remainingBalance || 0;
  document.getElementById("supplierPaymentDate").value = new Date().toISOString().slice(0, 10);
  elements.supplierPaymentDialog.showModal();
}

function openDeliveryDialog() {
  const sale = state.sales.find((item) => item.id === selectedInvoiceId);
  if (!sale) return toast("Open an invoice first.");
  const customer = state.customers.find((item) => item.id === sale.customerId);
  document.getElementById("deliveryDate").value = new Date().toISOString().slice(0, 10);
  document.getElementById("deliveryCustomerType").value = customer?.type || "Customer";
  document.getElementById("deliveryPerson").value = currentUser.name;
  elements.deliveryDialog.showModal();
}

function printDeliveryReceipt() {
  const sale = state.sales.find((item) => item.id === selectedInvoiceId);
  if (!sale) return toast("Open an invoice first.");
  const receipt = latestDeliveryReceipt(sale.id);
  if (!receipt) return openDeliveryDialog();
  openDocument("Goods Delivery Receipt", deliveryReceiptMarkup(receipt));
}

function latestDeliveryReceipt(saleId) {
  return [...state.deliveryReceipts].reverse().find((receipt) => receipt.saleId === saleId);
}

function printCustomerReceipt() {
  openManualReceiptDialog();
}

function paymentReceiptMarkup() {
  return manualReceiptMarkup();
}

function openManualReceiptDialog() {
  elements.receiptEditor.innerHTML = manualReceiptMarkup();
  elements.printArea.innerHTML = "";
  elements.receiptDialog.showModal();
}

function manualReceiptMarkup() {
  return `
    <section class="invoice-paper payment-receipt-paper" lang="ar" dir="rtl">
      <header class="receipt-header">
        <div class="receipt-brand" dir="ltr">
          <img src="assets/alnawaa-logo-horizontal.png" alt="alnawaa medical group">
        </div>
        <div class="receipt-meta">
          ${receiptMetaLine("رقم الإيصال:", "receipt-number", "clipboard")}
          ${receiptMetaLine("تاريخ الإيصال:", "receipt-date", "calendar")}
        </div>
      </header>

      <div class="receipt-title">
        <h2>إيصال قبض</h2>
        <span></span>
      </div>

      <section class="receipt-box receipt-recipient">
        ${receiptSectionTag("بيانات المستلم", "teal")}
        <div class="receipt-field-list">
          ${receiptField("استلمنا من:", "receiver-name")}
          ${receiptField("رقم الهاتف:", "receiver-phone")}
          ${receiptField("العنوان:", "receiver-address")}
        </div>
      </section>

      <section class="receipt-box receipt-reason receipt-accent">
        ${receiptSectionTag("سبب الدفع", "orange")}
        ${receiptEditable("payment-reason", "receipt-reason-text")}
      </section>

      <section class="receipt-table-box">
        <div class="receipt-table-head">
          <div><span>البيان</span></div>
          <div><span>المبلغ</span></div>
        </div>
        <div class="receipt-table-body">
          ${receiptTableRow(1)}
          ${receiptTableRow(2)}
          ${receiptTableRow(3)}
        </div>
      </section>

      <section class="receipt-box receipt-payment-details">
        ${receiptSectionTag("تفاصيل الدفع", "teal")}
        <div class="receipt-field-list">
          ${receiptField("المبلغ المستلم:", "amount-received")}
          ${receiptField("الرصيد السابق:", "previous-balance")}
          ${receiptField("المبلغ المتبقي:", "remaining-balance")}
          ${receiptField("طريقة الدفع:", "payment-method")}
          ${receiptField("رقم المرجع:", "reference-number")}
          ${receiptField("العملة:", "currency")}
        </div>
      </section>

      <section class="receipt-total-box">
        <strong>إجمالي المبلغ المستلم</strong>
        <div>
          ${receiptEditable("total-amount", "receipt-total-value")}
          <b>دينار ليبي</b>
        </div>
      </section>

      <section class="receipt-signatures">
        <div class="receipt-signature receipt-signature-customer">
          <span>توقيع العميل</span>
          ${receiptEditable("customer-signature", "receipt-signature-line")}
        </div>
        <div class="receipt-signature receipt-signature-employee">
          <span>استلمه الموظف</span>
          ${receiptEditable("employee-receiver", "receipt-signature-line")}
        </div>
      </section>

      <footer class="receipt-footer">
        <span>${receiptIcon("phone")} Tel: ${escapeHtml(state.settings.companyPhone || "+218 091 069 3900")}<br>Tel: ${escapeHtml(state.settings.companyPhoneAlt || "+218 092 069 3900")}</span>
        <span>${receiptIcon("mail")} ${escapeHtml(state.settings.companyEmail || "INFO@ALNAWAA.COM")}</span>
        <span>${receiptIcon("location")} ${escapeHtml(state.settings.companyAddress || "Tripoli - Ben Ashour Street")}</span>
        <span>${escapeHtml(state.settings.companyAddressArabic || "طرابلس - شارع بن عاشور")}</span>
      </footer>
    </section>
  `;
}

function receiptMetaLine(label, fieldName, iconName) {
  return `
    <div class="receipt-meta-line">
      ${receiptIcon(iconName)}
      <span>${escapeHtml(label)}</span>
      ${receiptEditable(fieldName)}
    </div>
  `;
}

function receiptSectionTag(label, tone) {
  return `
    <div class="receipt-section-tag ${tone}">
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function receiptTableRow(index) {
  return `
    <div class="receipt-table-row">
      <div>${receiptEditable(`statement-${index}`)}</div>
      <div>${receiptEditable(`amount-${index}`)}</div>
    </div>
  `;
}

function receiptField(label, fieldName) {
  return `
    <div class="receipt-field">
      <span>${escapeHtml(label)}</span>
      ${receiptEditable(fieldName)}
    </div>
  `;
}

function receiptEditable(fieldName, className = "") {
  return `<span class="receipt-editable ${className}" contenteditable="true" spellcheck="false" data-receipt-field="${escapeHtml(fieldName)}"></span>`;
}

function receiptIcon(name) {
  return `<span class="receipt-icon">${iconSvg(name)}</span>`;
}

function saveManualReceipt() {
  syncManualReceiptPrintArea();
  toast("Receipt saved.");
}

function clearManualReceipt() {
  elements.receiptEditor.querySelectorAll("[data-receipt-field]").forEach((field) => {
    field.textContent = "";
  });
  elements.printArea.innerHTML = "";
  toast("Receipt form cleared.");
}

function printManualReceipt() {
  syncManualReceiptPrintArea();
  window.print();
}

function syncManualReceiptPrintArea() {
  const receipt = elements.receiptEditor.querySelector(".payment-receipt-paper");
  if (receipt) elements.printArea.innerHTML = receipt.outerHTML;
}

function supplierPaymentVoucherMarkup(payment) {
  const purchase = state.purchases.find((item) => item.id === payment.purchaseId);
  const supplier = state.suppliers.find((item) => item.id === payment.supplierId);
  const paidSoFar = purchase ? supplierPaymentsForPurchase(purchase.id).reduce((sum, item) => sum + item.amount, 0) : payment.totalPaidSoFar || payment.amount;
  const remaining = purchase ? purchase.remainingBalance : payment.remainingBalance || 0;
  return `
    <section class="invoice-paper">
      <div class="invoice-head">
        ${documentBrandMarkup()}
        <div class="document-title-block">
          <strong>Supplier Payment Voucher</strong>
          <strong>${escapeHtml(payment.voucherNumber)}</strong>
          <p>Date: ${formatDate(payment.date)}</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <tbody>
            <tr><th>Supplier</th><td>${escapeHtml(supplier?.name || payment.supplierName || "")}</td></tr>
            <tr><th>Purchase invoice</th><td>${escapeHtml(purchase?.invoiceNumber || purchase?.id || payment.purchaseId || "")}</td></tr>
            <tr><th>Purchase total</th><td>${formatMoney(purchase?.total || 0)}</td></tr>
            <tr><th>Amount paid</th><td>${formatMoney(payment.amount)}</td></tr>
            <tr><th>Total paid so far</th><td>${formatMoney(paidSoFar)}</td></tr>
            <tr><th>Remaining balance</th><td>${formatMoney(remaining)}</td></tr>
            <tr><th>Payment method</th><td>${escapeHtml(payment.method)}</td></tr>
            <tr><th>Bank / cashbox</th><td>${escapeHtml(payment.bankAccountName || "")}</td></tr>
            <tr><th>Paid by</th><td>${escapeHtml(payment.paidBy || "")}</td></tr>
            <tr><th>Notes</th><td>${escapeHtml(payment.notes || "")}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="signature-grid">
        <div class="signature-box">Paid by signature</div>
        <div class="signature-box">Supplier signature</div>
        <div class="signature-box">Stamp</div>
      </div>
      ${documentFooterMarkup()}
    </section>
  `;
}

function deliveryReceiptMarkup(receipt) {
  const sale = state.sales.find((item) => item.id === receipt.saleId);
  const rows = (receipt.items || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.batch)}</td>
      <td>${formatDate(item.expiry)}</td>
      <td>${item.quantity}</td>
    </tr>
  `).join("");
  const bonusItems = receipt.bonusItems || sale?.bonusItems || [];
  const bonusRows = bonusItems.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.batch)}</td>
      <td>${formatDate(item.expiry)}</td>
      <td>${item.quantity}</td>
      <td><strong class="free-label">FREE</strong></td>
    </tr>
  `).join("");
  const bonusSection = bonusItems.length ? `
    <h3>Bonus</h3>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th>Quantity delivered</th><th>Price</th></tr></thead>
        <tbody>${bonusRows}</tbody>
      </table>
    </div>
  ` : "";
  return `
    <section class="invoice-paper">
      <div class="invoice-head">
        ${documentBrandMarkup()}
        <div class="document-title-block">
          <strong>Goods Delivery Receipt</strong>
          <strong>${escapeHtml(receipt.receiptNumber)}</strong>
          <p>Date: ${formatDate(receipt.date)}</p>
          <p>Invoice: ${escapeHtml(receipt.invoiceNumber)}</p>
        </div>
      </div>
      <div>
        <strong>Customer</strong>
        <p>${escapeHtml(receipt.customerName)}</p>
        <p>${escapeHtml(receipt.customerType)} | Receiver: ${escapeHtml(receipt.receiverName || "")} ${escapeHtml(receipt.receiverPhone || "")}</p>
        <p>Delivered by: ${escapeHtml(receipt.deliveryPerson || "")}</p>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Batch</th><th>Expiry</th><th>Quantity delivered</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${bonusSection}
      <div class="invoice-total">Invoice total: ${formatMoney(receipt.total || sale?.total || 0)}</div>
      <p><strong>Notes:</strong> ${escapeHtml(receipt.notes || "")}</p>
      <div class="signature-grid">
        <div class="signature-box">Customer signature</div>
        <div class="signature-box">Company representative signature</div>
        <div class="signature-box">Stamp</div>
      </div>
      ${documentFooterMarkup()}
    </section>
  `;
}

function openDocument(title, html) {
  selectedDocumentHtml = html;
  elements.documentTitle.textContent = title;
  elements.documentPreview.innerHTML = html;
  elements.printArea.innerHTML = html;
  elements.documentDialog.showModal();
}

function printCurrentDocument() {
  if (!selectedDocumentHtml) return;
  elements.printArea.innerHTML = selectedDocumentHtml;
  window.print();
}

async function updateModule(key, enabled) {
  try {
    await api(`/api/modules/${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: { enabled },
    });
    await reloadData();
    toast(`${titleCase(key)} module ${enabled ? "enabled" : "disabled"}.`);
  } catch (error) {
    toast(error.message);
    await reloadData();
  }
}

async function updateFeatureVisibility(role, featureKey, visible) {
  try {
    const hidden = new Set(state.featureVisibility?.[role] || []);
    if (visible) hidden.delete(featureKey);
    else hidden.add(featureKey);
    await api("/api/feature-visibility", {
      method: "PATCH",
      body: { role, hiddenFeatures: [...hidden] },
    });
    await reloadData();
    toast(`${role} ${t(featureLabel(featureKey))} ${visible ? t("Visible") : t("Hidden")}.`);
  } catch (error) {
    toast(error.message);
    await reloadData();
  }
}

async function downloadBackup() {
  try {
    const response = await fetch("/api/export", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Could not export backup");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AlnawaaERP-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded.");
  } catch (error) {
    toast(error.message);
  }
}

function openImportFilePicker() {
  selectedImportFile = null;
  elements.importBackupFile.value = "";
  elements.importBackupFile.click();
}

function handleImportFileSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".json")) {
    elements.importBackupFile.value = "";
    toast("Choose a .json backup file.");
    return;
  }
  selectedImportFile = file;
  elements.importFileName.textContent = file.name;
  elements.importFileMeta.textContent = `${formatFileSize(file.size)} JSON backup selected.`;
  elements.importDialog.showModal();
}

function closeImportDialog() {
  selectedImportFile = null;
  elements.importBackupFile.value = "";
  elements.importDialog.close();
}

async function importSelectedBackup() {
  if (!selectedImportFile) {
    toast("Choose a .json backup file.");
    return;
  }
  const button = document.getElementById("confirmImport");
  button.disabled = true;
  try {
    const text = await selectedImportFile.text();
    let backup;
    try {
      backup = JSON.parse(text);
    } catch {
      throw new Error("The selected file is not valid JSON.");
    }
    state = await api("/api/import", { method: "POST", body: { backup } });
    const session = await api("/api/me");
    currentUser = session.user;
    document.getElementById("currentUserName").textContent = currentUser.name;
    document.getElementById("currentUserRole").textContent = currentUser.role;
    selectedImportFile = null;
    elements.importBackupFile.value = "";
    elements.importDialog.close();
    render();
    toast("Backup imported successfully.");
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function resetSystemData() {
  if (!confirm("Reset AlnawaaERP to a blank starting system on this server?")) return;
  try {
    state = await api("/api/reset", { method: "POST" });
    render();
    toast("Blank system restored.");
  } catch (error) {
    toast(error.message);
  }
}

function printReportView() {
  selectedDocumentHtml = reportPrintMarkup();
  elements.printArea.innerHTML = selectedDocumentHtml;
  window.print();
}

function exportReportCsv() {
  const { from, to, customerId, supplierId } = reportFilters();
  const rows = [["Report", "Date", "Name", "Reference", "Amount"]];
  state.sales.filter((sale) => inDateRange(sale.date, from, to) && (!customerId || sale.customerId === customerId))
    .forEach((sale) => rows.push(["Sales", sale.date, customerName(sale.customerId), sale.invoiceNumber, sale.total]));
  state.purchases.filter((purchase) => inDateRange(purchase.date, from, to) && (!supplierId || purchase.supplierId === supplierId))
    .forEach((purchase) => rows.push(["Purchases", purchase.date, supplierName(purchase.supplierId), medicineName(purchase.medicineId), purchase.total]));
  state.expenses.filter((expense) => inDateRange(expense.date, from, to))
    .forEach((expense) => rows.push(["Expenses", expense.date, expense.category, expense.expenseNumber, expense.amount]));
  downloadText(`AlnawaaERP-report-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function reportPrintMarkup() {
  const { from, to } = reportFilters();
  return `
    <section class="invoice-paper">
      <div class="invoice-head">
        ${documentBrandMarkup()}
        <div class="document-title-block">
          <strong>Reports</strong>
          <strong>${escapeHtml(from || "All dates")} - ${escapeHtml(to || "All dates")}</strong>
        </div>
      </div>
      <div class="report-cards">${elements.financialReport.innerHTML}</div>
      <h3>Customer Balances</h3>
      <div class="table-wrap"><table><tbody>${elements.customerBalanceTable.innerHTML || emptyTableRow("No balances.", 6)}</tbody></table></div>
      <h3>Supplier Balances</h3>
      <div class="table-wrap"><table><tbody>${elements.supplierBalanceTable.innerHTML || emptyTableRow("No balances.", 4)}</tbody></table></div>
      ${documentFooterMarkup()}
    </section>
  `;
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function findMedicine(id) {
  return state?.medicines.find((medicine) => medicine.id === id);
}

function medicineName(id) {
  return findMedicine(id)?.name
    || state.sales.flatMap((sale) => [...(sale.items || []), ...(sale.bonusItems || [])]).find((item) => item.medicineId === id)?.name
    || "Unknown medicine";
}

function supplierName(id) {
  return state.suppliers.find((supplier) => supplier.id === id)?.name || "Unknown supplier";
}

function customerName(id) {
  return state.customers.find((customer) => customer.id === id)?.name || "Unknown customer";
}

function supplierMedicines(id) {
  return state.medicines.filter((medicine) => medicine.supplierId === id).length;
}

function customerSales(id) {
  return state.sales.filter((sale) => sale.customerId === id).length;
}

function saleItemsLabel(sale) {
  const items = sale.items || [];
  const bonusCount = (sale.bonusItems || []).length;
  const bonusLabel = bonusCount ? ` + ${bonusCount} bonus` : "";
  if (items.length === 1) return `${items[0].name} (${items[0].batch})${bonusLabel}`;
  return `${items.length} items${bonusLabel}`;
}

function bonusItemsLabel(sale) {
  return (sale.bonusItems || []).map((item) => `${item.name} (${item.batch}) FREE`).join(" ");
}

function saleItemCostTotal(sale) {
  return [...(sale.items || []), ...(sale.bonusItems || [])].reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
    0
  );
}

function accountByName(name) {
  return state.bankAccounts.find((account) => account.name === name);
}

function isProtectedAccount(id) {
  return ["acct-cashbox", "acct-al-nouran", "acct-jumhouria"].includes(id);
}

function supplierPaymentsForPurchase(purchaseId) {
  return state.supplierPayments.filter((payment) => payment.purchaseId === purchaseId);
}

function stockStatus(medicine) {
  const days = daysUntil(medicine.expiry);
  if (days < 0) return { label: "Expired", type: "danger" };
  if (days <= 90) return { label: "Near expiry", type: "danger" };
  if (medicine.stock <= medicine.reorderLevel) return { label: "Low stock", type: "warning" };
  return { label: "Available", type: "success" };
}

function daysUntil(dateText) {
  if (!dateText) return Infinity;
  const target = new Date(`${dateText}T00:00:00`);
  const now = new Date();
  const ms = target.getTime() - now.setHours(0, 0, 0, 0);
  return Math.ceil(ms / 86400000);
}

function paymentPill(status) {
  const type = status === "Paid" ? "success" : status === "Partially Paid" || status === "Partial" ? "warning" : "danger";
  return pill(status, type);
}

function deliveryPill(status) {
  const type = status === "Delivered" ? "success" : status === "Scheduled" ? "warning" : "";
  return pill(status, type);
}

function pill(label, type = "") {
  return `<span class="pill ${type}">${escapeHtml(label)}</span>`;
}

function entityCard(entity, detail, actions = "") {
  return `
    <article class="entity-card">
      <strong>${escapeHtml(entity.name)}</strong>
      <span>${escapeHtml(detail)}</span>
      <div class="entity-meta">
        <span>${escapeHtml(entity.type || "")}</span>
        <span>${escapeHtml(entity.phone)}</span>
        <span>${escapeHtml(entity.email || "No email")}</span>
        <span>${escapeHtml(entity.address || "No address")}</span>
      </div>
      ${actions ? `<div class="entity-actions">${actions}</div>` : ""}
    </article>
  `;
}

function customerBalances() {
  return state.customers.map((customer) => {
    const invoices = state.sales.filter((sale) => sale.customerId === customer.id);
    const payments = state.customerPayments.filter((payment) => payment.customerId === customer.id);
    const totalInvoices = roundMoney(invoices.reduce((sum, sale) => sum + sale.total, 0));
    const totalPaid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
    return {
      customerId: customer.id,
      customerName: customer.name,
      totalInvoices,
      totalPaid,
      balance: roundMoney(Math.max(totalInvoices - totalPaid, 0)),
      unpaidCount: invoices.filter((sale) => sale.paymentStatus === "Unpaid").length,
      partialCount: invoices.filter((sale) => sale.paymentStatus === "Partially Paid" || sale.paymentStatus === "Partial").length,
      payments,
      unpaidInvoices: invoices.filter((sale) => sale.paymentStatus !== "Paid"),
    };
  });
}

function supplierBalances() {
  return state.suppliers.map((supplier) => {
    const purchases = state.purchases.filter((purchase) => purchase.supplierId === supplier.id);
    const payments = state.supplierPayments.filter((payment) => payment.supplierId === supplier.id);
    const totalPurchases = roundMoney(purchases.reduce((sum, purchase) => sum + purchase.total, 0));
    const totalPaid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      totalPurchases,
      totalPaid,
      balance: roundMoney(Math.max(totalPurchases - totalPaid, 0)),
      payments,
    };
  });
}

function emptyTableRow(message, columns) {
  return `<tr><td colspan="${columns}"><div class="empty-state">${escapeHtml(message)}</div></td></tr>`;
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function getNumber(id) {
  return Number(document.getElementById(id)?.value || 0);
}

function getSearchTerm() {
  return elements.search.value.trim().toLowerCase();
}

function matchesSearch(values, term) {
  if (!term) return true;
  return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
}

function reportFilters() {
  return {
    from: getValue("reportDateFrom"),
    to: getValue("reportDateTo"),
    customerId: getValue("reportCustomer"),
    supplierId: getValue("reportSupplier"),
  };
}

function inDateRange(dateText, from, to) {
  if (!dateText) return false;
  if (from && dateText < from) return false;
  if (to && dateText > to) return false;
  return true;
}

function sumByDate(items, field, from, to) {
  return items.filter((item) => inDateRange(item.date, from, to)).reduce((sum, item) => sum + Number(item[field] || 0), 0);
}

function currentMonthStart() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

function currentMonthEnd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function formatMoney(value) {
  return currency.format(Number(value || 0));
}

function formatDate(dateText) {
  if (!dateText) return "N/A";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateText}T00:00:00`));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function titleCase(text) {
  return text.replace(/(^|[-_\s])\w/g, (match) => match.toUpperCase()).replace(/[-_]/g, " ");
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => elements.toast.classList.remove("show"), 3200);
}
