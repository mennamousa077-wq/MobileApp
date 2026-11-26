import {
  COLLECTIONS,
  getTodayKey,
  getMonthKey,
  subscribeCollection,
  createProduct,
  updateProduct,
  removeProduct,
  sellProductTransaction,
  updateSaleRecord,
  removeSaleRecord,
  saveVodafoneLineSettings,
  addVodafoneTxTransaction,
  updateVodafoneTxTransaction,
  deleteVodafoneTxTransaction,
  createCategory,
  updateCategory,
  removeCategory,
  createUserPermission,
  updateUserPermission,
  removeUserPermission
} from "./firebase.js";

// ==========================================
// Constants & Category Definitions
// ==========================================
const SUBCATEGORIES = {
  chargers: [
    "شاحن كامل",
    "رأس شاحن",
    "وصلة شحن عريضة",
    "وصلة شحن عادية",
    "وصلة شحن رفيعة"
  ],
  headphones: ["سماعة جلدة", "سماعة عضم", "سماعة بلوتوث"],
  speakers: ["صب صغير", "صب وسط", "صب كبير"]
};

const CATEGORY_LABELS = {
  chargers: "الشواحن والوصلات",
  phones: "التليفونات",
  headphones: "السماعات",
  speakers: "الصبات"
};

const PERMISSION_OPTIONS = [
  "الإدارة والتقارير",
  "فودافون كاش (18 خط)",
  "إدارة المخزون",
  "نقطة البيع (POS)",
  "حذف وتعديل السجلات"
];

// ==========================================
// Application State (Empty by Default)
// ==========================================
const state = {
  route: "dashboard", // dashboard | vf-hub | vf-line-1..18 | chargers | phones | headphones | speakers
  products: [],
  sales: [],
  vfLines: {}, // keyed by lineNumber (1..18)
  vfTxs: [],
  categories: [],
  permissions: [],
  filters: {
    chargers: "الكل",
    headphones: "الكل",
    speakers: "الكل",
    search: ""
  },
  fbConnected: false,
  fbErrorShown: false
};

// ==========================================
// DOM References
// ==========================================
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggleBtn = document.getElementById("menuToggleBtn");
const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
const vfToggleBtn = document.getElementById("vfToggleBtn");
const vfSubmenu = document.getElementById("vfSubmenu");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const pageContent = document.getElementById("pageContent");
const fbStatusDot = document.getElementById("fbStatusDot");
const fbStatusText = document.getElementById("fbStatusText");

const globalBarcodeForm = document.getElementById("globalBarcodeForm");
const globalBarcodeMode = document.getElementById("globalBarcodeMode");
const globalBarcodeInput = document.getElementById("globalBarcodeInput");

const appModal = document.getElementById("appModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalCloseBtn = document.getElementById("modalCloseBtn");

const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCloseBtn = document.getElementById("confirmCloseBtn");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");
const toastContainer = document.getElementById("toastContainer");

// ==========================================
// Helpers
// ==========================================
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(val) {
  const num = Number(val) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatTime(ts) {
  if (!ts) return "الآن";
  try {
    const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return date.toLocaleString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit"
    });
  } catch {
    return "—";
  }
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3800);
}

function openModal(title, htmlContent) {
  modalTitle.textContent = title;
  modalBody.innerHTML = htmlContent;
  appModal.classList.add("open");
}

function closeModal() {
  appModal.classList.remove("open");
  modalBody.innerHTML = "";
}

let confirmResolve = null;
function askConfirm(message) {
  confirmMessage.textContent = message;
  confirmModal.classList.add("open");
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function closeConfirm(result) {
  confirmModal.classList.remove("open");
  if (confirmResolve) {
    confirmResolve(result);
    confirmResolve = null;
  }
}

modalCloseBtn.addEventListener("click", closeModal);
appModal.addEventListener("click", (e) => {
  if (e.target === appModal) closeModal();
});
confirmCloseBtn.addEventListener("click", () => closeConfirm(false));
confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
confirmOkBtn.addEventListener("click", () => closeConfirm(true));
confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) closeConfirm(false);
});

// Sidebar mobile toggle
function toggleSidebar(open) {
  sidebar.classList.toggle("open", open);
  sidebarOverlay.classList.toggle("open", open);
}
menuToggleBtn.addEventListener("click", () => toggleSidebar(true));
sidebarCloseBtn.addEventListener("click", () => toggleSidebar(false));
sidebarOverlay.addEventListener("click", () => toggleSidebar(false));

// Build 18 Vodafone Cash Sidebar Submenu Items
function renderVfSubmenu() {
  let html = "";
  for (let i = 1; i <= 18; i++) {
    const line = state.vfLines[i];
    const balance = line ? formatMoney(line.balance) : "0.00";
    const activeClass = state.route === `vf-line-${i}` ? "active" : "";
    html += `
      <button class="vf-sub-btn ${activeClass}" type="button" data-route="vf-line-${i}">
        <span>خط رقم ${i}</span>
        <span class="num">${balance}</span>
      </button>
    `;
  }
  vfSubmenu.innerHTML = html;
}

vfToggleBtn.addEventListener("click", () => {
  vfSubmenu.classList.toggle("open");
  navigateTo("vf-hub");
});

document.querySelector(".sidebar-nav").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-route]");
  if (!btn || btn === vfToggleBtn) return;
  const route = btn.getAttribute("data-route");
  navigateTo(route);
  if (window.innerWidth <= 900) toggleSidebar(false);
});

function navigateTo(route) {
  state.route = route;
  state.filters.search = "";
  if (route.startsWith("vf-")) {
    vfSubmenu.classList.add("open");
  }
  updateNavActive();
  renderCurrentPage();
}

function updateNavActive() {
  document.querySelectorAll(".nav-btn[data-route]").forEach((btn) => {
    const r = btn.getAttribute("data-route");
    const isActive = r === state.route || (r === "vf-hub" && state.route.startsWith("vf-line-"));
    btn.classList.toggle("active", isActive);
  });
  renderVfSubmenu();
}

// Update sidebar inventory badges
function updateBadges() {
  const counts = { chargers: 0, phones: 0, headphones: 0, speakers: 0 };
  for (const p of state.products) {
    if (counts[p.category] !== undefined) {
      counts[p.category] += Number(p.quantity) || 0;
    }
  }
  Object.keys(counts).forEach((cat) => {
    const el = document.getElementById(`badge-${cat}`);
    if (el) el.textContent = counts[cat];
  });
}

// ==========================================
// Global Barcode Scanner Handler
// ==========================================
async function handleBarcodeAction(rawCode, mode = "sell") {
  const code = (rawCode || "").trim();
  if (!code) {
    showToast("يرجى إدخال أو مسح رقم الباركود أولاً", "warn");
    return;
  }

  const found = state.products.find(
    (p) => (p.barcode || "").trim().toLowerCase() === code.toLowerCase()
  );

  if (mode === "register") {
    const defaultCat = ["chargers", "phones", "headphones", "speakers"].includes(state.route)
      ? state.route
      : "chargers";
    openProductModal(defaultCat, null, code);
    return;
  }

  // Sell mode
  if (!found) {
    showToast(`الباركود (${code}) غير مسجل في المخزون`, "warn");
    const shouldAdd = await askConfirm(
      `الباركود "${code}" غير موجود في المخزون. هل تريد تسجيله كصنف جديد الآن؟`
    );
    if (shouldAdd) {
      const defaultCat = ["chargers", "phones", "headphones", "speakers"].includes(state.route)
        ? state.route
        : "chargers";
      openProductModal(defaultCat, null, code);
    }
    return;
  }

  try {
    const res = await sellProductTransaction(found.id, 1);
    showToast(
      `تم بيع "${res.productName}" بمبلغ ${formatMoney(res.totalAmount)} ج.م (المتبقي: ${res.remainingQty})`,
      "success"
    );
  } catch (err) {
    showToast(err.message || "تعذر إتمام عملية البيع", "error");
  }
}

globalBarcodeForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const code = globalBarcodeInput.value;
  const mode = globalBarcodeMode.value;
  globalBarcodeInput.value = "";
  await handleBarcodeAction(code, mode);
  globalBarcodeInput.focus();
});

// ==========================================
// Firebase Real-Time Subscriptions
// ==========================================
function setFirebaseStatus(connected, error = null) {
  state.fbConnected = connected;
  if (connected) {
    fbStatusDot.className = "status-dot connected";
    fbStatusText.textContent = "متصل بـ Firebase";
  } else if (error) {
    fbStatusDot.className = "status-dot error";
    fbStatusText.textContent = "تعذر الاتصال بـ Firebase";
    if (!state.fbErrorShown) {
      state.fbErrorShown = true;
      showToast(
        "تنبيه Firebase: تأكد من تفعيل Firestore وقواعد القراءة/الكتابة في لوحة Firebase",
        "error"
      );
    }
  }
}

function initFirebaseListeners() {
  const onErr = (err) => setFirebaseStatus(false, err);

  subscribeCollection(
    COLLECTIONS.PRODUCTS,
    (items) => {
      state.products = items;
      setFirebaseStatus(true);
      updateBadges();
      renderCurrentPage();
    },
    onErr
  );

  subscribeCollection(
    COLLECTIONS.SALES,
    (items) => {
      state.sales = items;
      setFirebaseStatus(true);
      if (state.route === "dashboard") renderCurrentPage();
    },
    onErr
  );

  subscribeCollection(
    COLLECTIONS.VODAFONE_LINES,
    (items) => {
      const map = {};
      for (const item of items) {
        const num = Number(item.lineNumber);
        if (num >= 1 && num <= 18) map[num] = item;
      }
      state.vfLines = map;
      setFirebaseStatus(true);
      renderVfSubmenu();
      if (state.route === "dashboard" || state.route.startsWith("vf-")) {
        renderCurrentPage();
      }
    },
    onErr,
    null
  );

  subscribeCollection(
    COLLECTIONS.VODAFONE_TXS,
    (items) => {
      state.vfTxs = items;
      setFirebaseStatus(true);
      if (state.route.startsWith("vf-")) renderCurrentPage();
    },
    onErr
  );

  subscribeCollection(
    COLLECTIONS.CATEGORIES,
    (items) => {
      state.categories = items;
      if (state.route === "dashboard") renderCurrentPage();
    },
    onErr
  );

  subscribeCollection(
    COLLECTIONS.PERMISSIONS,
    (items) => {
      state.permissions = items;
      if (state.route === "dashboard") renderCurrentPage();
    },
    onErr
  );
}

// ==========================================
// Page Rendering Router
// ==========================================
function renderCurrentPage() {
  if (state.route === "dashboard") {
    pageTitle.textContent = "الإدارة واللوحة الرئيسية";
    pageSubtitle.textContent = "الملخص المالي العام، البيع السريع بالباركود، الفئات والصلاحيات";
    renderDashboardPage();
  } else if (state.route === "vf-hub") {
    pageTitle.textContent = "فودافون كاش - إدارة الـ 18 خط";
    pageSubtitle.textContent = "متابعة أرصدة وحدود جميع خطوط فودافون كاش من رقم 1 إلى رقم 18";
    renderVodafoneHubPage();
  } else if (state.route.startsWith("vf-line-")) {
    const lineNum = Number(state.route.replace("vf-line-", ""));
    pageTitle.textContent = `فودافون كاش — خط رقم ${lineNum}`;
    pageSubtitle.textContent = "إعدادات المحفظة وتسجيل عمليات التحويل والاستلام";
    renderVodafoneLinePage(lineNum);
  } else if (state.route === "chargers") {
    pageTitle.textContent = "مخزون الشواحن والوصلات";
    pageSubtitle.textContent = "إدارة ومبيعات الشواحن، الرؤوس، والوصلات بمختلف أنواعها";
    renderInventoryPage("chargers", SUBCATEGORIES.chargers);
  } else if (state.route === "phones") {
    pageTitle.textContent = "مبيعات التليفونات";
    pageSubtitle.textContent = "تسجيل وبيع الهواتف المحمولة برقم IMEI أو الباركود";
    renderInventoryPage("phones", null);
  } else if (state.route === "headphones") {
    pageTitle.textContent = "قسم السماعات";
    pageSubtitle.textContent = "إدارة السماعات الجلدة والعضم والبلوتوث";
    renderInventoryPage("headphones", SUBCATEGORIES.headphones);
  } else if (state.route === "speakers") {
    pageTitle.textContent = "قسم الصبات";
    pageSubtitle.textContent = "إدارة ومبيعات الصبات (صغير، وسط، كبير)";
    renderInventoryPage("speakers", SUBCATEGORIES.speakers);
  }
}

// ==========================================
// 1. Dashboard Page (الإدارة)
// ==========================================
function renderDashboardPage() {
  const today = getTodayKey();
  const totalCashSales = state.sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const dailyNetProfit = state.sales
    .filter((s) => s.dateKey === today)
    .reduce((sum, s) => sum + (Number(s.profit) || 0), 0);

  let totalVfBalance = 0;
  for (let i = 1; i <= 18; i++) {
    totalVfBalance += Number(state.vfLines[i]?.balance) || 0;
  }

  const totalInventoryCount = state.products.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0),
    0
  );

  pageContent.innerHTML = `
    <div class="page-toolbar">
      <div class="toolbar-actions">
        <button class="btn btn-primary" type="button" id="dashAddProductBtn">+ إضافة جديد للمخزون</button>
        <button class="btn btn-secondary" type="button" id="dashAddCategoryBtn">+ إضافة فئة</button>
        <button class="btn btn-secondary" type="button" id="dashAddUserBtn">+ إضافة مستخدم</button>
      </div>
    </div>

    <section class="stats-grid">
      <article class="stat-card">
        <div class="stat-header">
          <span>إجمالي المبيعات النقدية</span>
          <span class="stat-icon blue">💵</span>
        </div>
        <div class="stat-value num">${formatMoney(totalCashSales)}</div>
        <div class="stat-sub">جنيه مصري (${state.sales.length} عملية بيع)</div>
      </article>

      <article class="stat-card">
        <div class="stat-header">
          <span>رصيد فودافون كاش (18 خط)</span>
          <span class="stat-icon green">📱</span>
        </div>
        <div class="stat-value num">${formatMoney(totalVfBalance)}</div>
        <div class="stat-sub">إجمالي الأرصدة الحالية للـ 18 محفظة</div>
      </article>

      <article class="stat-card">
        <div class="stat-header">
          <span>إجمالي عدد قطع المخزون</span>
          <span class="stat-icon navy">📦</span>
        </div>
        <div class="stat-value num">${totalInventoryCount}</div>
        <div class="stat-sub">${state.products.length} صنف مسجل في الأقسام</div>
      </article>

      <article class="stat-card">
        <div class="stat-header">
          <span>صافي الربح اليومي</span>
          <span class="stat-icon amber">📈</span>
        </div>
        <div class="stat-value num">${formatMoney(dailyNetProfit)}</div>
        <div class="stat-sub">ربح مبيعات اليوم (${today})</div>
      </article>
    </section>

    <!-- Quick POS Barcode Checkout -->
    <section class="panel-card">
      <div class="panel-header">
        <h3 class="panel-title">نقطة البيع السريعة بالباركود (Quick POS Checkout)</h3>
        <span class="badge badge-blue">خصم فوري من المخزون</span>
      </div>
      <div class="panel-body">
        <form id="quickPosForm" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
          <input
            id="quickPosBarcode"
            class="input-control num"
            style="flex:1; min-width:220px;"
            type="text"
            placeholder="امسح أو اكتب الباركود / IMEI للبيع المباشر من أي قسم..."
            autocomplete="off"
          />
          <button class="btn btn-success" type="submit">بيع فوري بالباركود</button>
        </form>

        ${
          state.sales.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-state-icon">🧾</div>
            <h4>لا توجد مبيعات مسجلة حتى الآن</h4>
            <p>امسح باركود أي صنف مسجل أو استخدم زر البيع السريع من أي قسم لتسجيل أول عملية.</p>
          </div>
        `
            : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>القسم</th>
                  <th>الباركود</th>
                  <th>الكمية</th>
                  <th>سعر البيع</th>
                  <th>الإجمالي</th>
                  <th>الربح</th>
                  <th>الوقت</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${state.sales
                  .map(
                    (s) => `
                  <tr>
                    <td><strong>${escapeHtml(s.productName)}</strong></td>
                    <td><span class="badge badge-blue">${escapeHtml(CATEGORY_LABELS[s.category] || s.category)}</span></td>
                    <td class="num">${escapeHtml(s.barcode || "—")}</td>
                    <td class="num">${Number(s.quantity) || 1}</td>
                    <td class="num">${formatMoney(s.sellingPrice)}</td>
                    <td class="num"><strong>${formatMoney(s.totalAmount)}</strong></td>
                    <td class="num" style="color:var(--emerald-600);font-weight:700;">${formatMoney(s.profit)}</td>
                    <td class="num">${formatTime(s.createdAt)}</td>
                    <td>
                      <div class="row-actions">
                        <button class="btn btn-secondary btn-sm" type="button" data-edit-sale="${s.id}">تعديل</button>
                        <button class="btn btn-danger btn-sm" type="button" data-delete-sale="${s.id}">حذف</button>
                      </div>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        }
      </div>
    </section>

    <!-- Categories & User Permissions -->
    <div class="dashboard-grid">
      <section class="panel-card">
        <div class="panel-header">
          <h3 class="panel-title">إدارة الفئات</h3>
          <button class="btn btn-primary btn-sm" type="button" id="catAddBtn">+ إضافة جديد</button>
        </div>
        <div class="panel-body">
          ${
            state.categories.length === 0
              ? `
            <div class="empty-state" style="padding:26px 12px;">
              <h4>لا توجد فئات إضافية مسجلة</h4>
              <p>أضف فئات مخصصة لمتابعة تنظيم المتجر.</p>
            </div>
          `
              : `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>اسم الفئة</th>
                    <th>الوصف</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.categories
                    .map(
                      (c) => `
                    <tr>
                      <td><strong>${escapeHtml(c.name)}</strong></td>
                      <td>${escapeHtml(c.description || "—")}</td>
                      <td>
                        <div class="row-actions">
                          <button class="btn btn-secondary btn-sm" type="button" data-edit-cat="${c.id}">تعديل</button>
                          <button class="btn btn-danger btn-sm" type="button" data-delete-cat="${c.id}">حذف</button>
                        </div>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </section>

      <section class="panel-card">
        <div class="panel-header">
          <h3 class="panel-title">صلاحيات المستخدمين</h3>
          <button class="btn btn-primary btn-sm" type="button" id="userAddBtn">+ إضافة جديد</button>
        </div>
        <div class="panel-body">
          ${
            state.permissions.length === 0
              ? `
            <div class="empty-state" style="padding:26px 12px;">
              <h4>لا يوجد مستخدمون مسجلون</h4>
              <p>أضف الموظفين وحدد صلاحيات كل مستخدم في النظام.</p>
            </div>
          `
              : `
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>الدور</th>
                    <th>الصلاحيات</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.permissions
                    .map(
                      (u) => `
                    <tr>
                      <td><strong>${escapeHtml(u.userName)}</strong></td>
                      <td><span class="badge badge-blue">${escapeHtml(u.role)}</span></td>
                      <td>${(u.permissions || []).map((p) => `<span class="badge badge-green" style="margin:2px;">${escapeHtml(p)}</span>`).join("") || "—"}</td>
                      <td>
                        <div class="row-actions">
                          <button class="btn btn-secondary btn-sm" type="button" data-edit-user="${u.id}">تعديل</button>
                          <button class="btn btn-danger btn-sm" type="button" data-delete-user="${u.id}">حذف</button>
                        </div>
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
          }
        </div>
      </section>
    </div>
  `;

  document.getElementById("dashAddProductBtn").addEventListener("click", () => {
    openProductModal("chargers");
  });
  document.getElementById("dashAddCategoryBtn").addEventListener("click", () => openCategoryModal());
  document.getElementById("catAddBtn").addEventListener("click", () => openCategoryModal());
  document.getElementById("dashAddUserBtn").addEventListener("click", () => openUserModal());
  document.getElementById("userAddBtn").addEventListener("click", () => openUserModal());

  document.getElementById("quickPosForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("quickPosBarcode");
    const code = input.value;
    input.value = "";
    await handleBarcodeAction(code, "sell");
    input.focus();
  });

  // Sale row edit/delete
  pageContent.querySelectorAll("[data-edit-sale]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sale = state.sales.find((s) => s.id === btn.dataset.editSale);
      if (sale) openSaleEditModal(sale);
    });
  });

  pageContent.querySelectorAll("[data-delete-sale]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await askConfirm("هل أنت متأكد من حذف سجل هذه العملية من المبيعات؟");
      if (!ok) return;
      try {
        await removeSaleRecord(btn.dataset.deleteSale);
        showToast("تم حذف سجل البيع بنجاح", "success");
      } catch (err) {
        showToast("تعذر حذف السجل: " + err.message, "error");
      }
    });
  });

  // Category edit/delete
  pageContent.querySelectorAll("[data-edit-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = state.categories.find((c) => c.id === btn.dataset.editCat);
      if (cat) openCategoryModal(cat);
    });
  });

  pageContent.querySelectorAll("[data-delete-cat]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await askConfirm("هل تريد حذف هذه الفئة؟");
      if (!ok) return;
      await removeCategory(btn.dataset.deleteCat);
      showToast("تم حذف الفئة", "success");
    });
  });

  // User permissions edit/delete
  pageContent.querySelectorAll("[data-edit-user]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const u = state.permissions.find((item) => item.id === btn.dataset.editUser);
      if (u) openUserModal(u);
    });
  });

  pageContent.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await askConfirm("هل تريد حذف هذا المستخدم وصلاحياته؟");
      if (!ok) return;
      await removeUserPermission(btn.dataset.deleteUser);
      showToast("تم حذف المستخدم", "success");
    });
  });
}

// ==========================================
// 2. Vodafone Cash Hub & 18 Dedicated Pages
// ==========================================
function renderVodafoneHubPage() {
  let totalBalance = 0;
  let cardsHtml = "";

  for (let i = 1; i <= 18; i++) {
    const line = state.vfLines[i] || {};
    const bal = Number(line.balance) || 0;
    const dailyLimit = Number(line.dailyLimit) || 60000;
    totalBalance += bal;

    const today = getTodayKey();
    const todayUsed = state.vfTxs
      .filter((t) => Number(t.lineNumber) === i && t.dateKey === today)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const pct = Math.min(100, Math.round((todayUsed / dailyLimit) * 100));
    const fillClass = pct >= 90 ? "danger" : pct >= 70 ? "warn" : "";

    cardsHtml += `
      <article class="vf-card">
        <div class="vf-card-top">
          <span class="vf-line-tag">خط رقم ${i}</span>
          <span class="vf-phone num">${escapeHtml(line.phoneNumber || "غير مسجل")}</span>
        </div>
        <div class="vf-balance num">${formatMoney(bal)} <span style="font-size:0.78rem;color:var(--text-muted);">ج.م</span></div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">
            <span>الاستخدام اليومي</span>
            <span class="num">${formatMoney(todayUsed)} / ${formatMoney(dailyLimit)}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${fillClass}" style="width:${pct}%"></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;">
          <button class="btn btn-primary btn-sm" style="flex:1;" type="button" data-open-vf="${i}">فتح الخط</button>
          <button class="btn btn-secondary btn-sm" type="button" data-tx-vf="${i}">+ عملية</button>
        </div>
      </article>
    `;
  }

  pageContent.innerHTML = `
    <div class="page-toolbar">
      <div class="stat-card" style="padding:12px 18px;flex-direction:row;align-items:center;gap:14px;">
        <span style="font-weight:700;color:var(--text-secondary);">إجمالي رصيد الـ 18 خط:</span>
        <span class="num" style="font-size:1.3rem;font-weight:800;color:var(--royal-600);">${formatMoney(totalBalance)} ج.م</span>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" type="button" id="vfHubAddTxBtn">+ إضافة جديد (عملية فودافون كاش)</button>
      </div>
    </div>

    <div class="vf-grid">${cardsHtml}</div>
  `;

  document.getElementById("vfHubAddTxBtn").addEventListener("click", () => {
    openVfTxModal(1);
  });
  pageContent.querySelectorAll("[data-open-vf]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(`vf-line-${btn.dataset.openVf}`));
  });
  pageContent.querySelectorAll("[data-tx-vf]").forEach((btn) => {
    btn.addEventListener("click", () => openVfTxModal(Number(btn.dataset.txVf)));
  });
}

function renderVodafoneLinePage(lineNumber) {
  const line = state.vfLines[lineNumber] || {
    lineNumber,
    phoneNumber: "",
    balance: 0,
    dailyLimit: 60000,
    monthlyLimit: 200000,
    notes: ""
  };

  const txs = state.vfTxs.filter((t) => Number(t.lineNumber) === lineNumber);
  const today = getTodayKey();
  const month = getMonthKey();

  const dailyUsed = txs
    .filter((t) => t.dateKey === today)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const monthlyUsed = txs
    .filter((t) => t.monthKey === month)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const dailyLimit = Number(line.dailyLimit) || 60000;
  const monthlyLimit = Number(line.monthlyLimit) || 200000;
  const dailyPct = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));
  const monthlyPct = Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100));

  pageContent.innerHTML = `
    <div class="page-toolbar">
      <div class="toolbar-actions">
        <button class="btn btn-secondary" type="button" id="backToVfHub">← جميع الخطوط (18)</button>
        <button class="btn btn-primary" type="button" id="vfAddNewTxBtn">+ إضافة جديد</button>
        <button class="btn btn-danger" type="button" id="vfQuickOutBtn">تحويل / إرسال</button>
        <button class="btn btn-success" type="button" id="vfQuickInBtn">استلام / سحب</button>
      </div>
    </div>

    <section class="stats-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
      <article class="stat-card">
        <div class="stat-header">
          <span>الرصيد الحالي للمحفظة</span>
          <span class="stat-icon blue">💳</span>
        </div>
        <div class="stat-value num">${formatMoney(line.balance)}</div>
        <div class="stat-sub">رقم المحفظة: <strong class="num">${escapeHtml(line.phoneNumber || "غير مسجل")}</strong></div>
      </article>

      <article class="stat-card">
        <div class="stat-header">
          <span>الحد اليومي</span>
          <span class="stat-icon amber">⏱️</span>
        </div>
        <div class="stat-value num">${formatMoney(dailyUsed)}</div>
        <div class="progress-track"><div class="progress-fill ${dailyPct >= 90 ? "danger" : ""}" style="width:${dailyPct}%"></div></div>
        <div class="stat-sub num">من أصل ${formatMoney(dailyLimit)} ج.م (${dailyPct}%)</div>
      </article>

      <article class="stat-card">
        <div class="stat-header">
          <span>الحد الشهري</span>
          <span class="stat-icon green">📅</span>
        </div>
        <div class="stat-value num">${formatMoney(monthlyUsed)}</div>
        <div class="progress-track"><div class="progress-fill ${monthlyPct >= 90 ? "danger" : ""}" style="width:${monthlyPct}%"></div></div>
        <div class="stat-sub num">من أصل ${formatMoney(monthlyLimit)} ج.م (${monthlyPct}%)</div>
      </article>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <h3 class="panel-title">بيانات وإعدادات خط رقم ${lineNumber}</h3>
      </div>
      <div class="panel-body">
        <form id="vfLineSettingsForm" class="form-grid">
          <div class="form-group">
            <label class="form-label" for="vfPhoneInput">رقم المحفظة</label>
            <input id="vfPhoneInput" class="input-control num" type="text" placeholder="010xxxxxxxx" value="${escapeHtml(line.phoneNumber || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="vfBalanceInput">الرصيد الحالي (ج.م)</label>
            <input id="vfBalanceInput" class="input-control num" type="number" step="0.01" min="0" value="${Number(line.balance) || 0}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="vfDailyLimitInput">الحد اليومي (ج.م)</label>
            <input id="vfDailyLimitInput" class="input-control num" type="number" step="1" min="0" value="${dailyLimit}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="vfMonthlyLimitInput">الحد الشهري (ج.م)</label>
            <input id="vfMonthlyLimitInput" class="input-control num" type="number" step="1" min="0" value="${monthlyLimit}" />
          </div>
          <div class="form-group full" style="flex-direction:row;justify-content:flex-end;">
            <button class="btn btn-primary" type="submit">حفظ إعدادات الخط</button>
          </div>
        </form>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <h3 class="panel-title">سجل معاملات خط رقم ${lineNumber}</h3>
        <span class="badge badge-blue num">${txs.length} عملية</span>
      </div>
      <div class="panel-body">
        ${
          txs.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-state-icon">💸</div>
            <h4>لا توجد معاملات مسجلة على خط رقم ${lineNumber}</h4>
            <p>ابدأ بتسجيل عملية "تحويل / إرسال" أو "استلام / سحب" عبر الأزرار بالأعلى.</p>
          </div>
        `
            : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>نوع العملية</th>
                  <th>المبلغ</th>
                  <th>العمولة</th>
                  <th>الرقم المقابل</th>
                  <th>ملاحظات</th>
                  <th>الوقت</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${txs
                  .map(
                    (tx) => `
                  <tr>
                    <td>
                      ${
                        tx.type === "in"
                          ? `<span class="badge badge-green">استلام / سحب</span>`
                          : `<span class="badge badge-rose">تحويل / إرسال</span>`
                      }
                    </td>
                    <td class="num"><strong>${formatMoney(tx.amount)}</strong></td>
                    <td class="num">${formatMoney(tx.commission)}</td>
                    <td class="num">${escapeHtml(tx.peerNumber || "—")}</td>
                    <td>${escapeHtml(tx.notes || "—")}</td>
                    <td class="num">${formatTime(tx.createdAt)}</td>
                    <td>
                      <div class="row-actions">
                        <button class="btn btn-secondary btn-sm" type="button" data-edit-vftx="${tx.id}">تعديل</button>
                        <button class="btn btn-danger btn-sm" type="button" data-delete-vftx="${tx.id}">حذف</button>
                      </div>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        }
      </div>
    </section>
  `;

  document.getElementById("backToVfHub").addEventListener("click", () => navigateTo("vf-hub"));
  document.getElementById("vfAddNewTxBtn").addEventListener("click", () => openVfTxModal(lineNumber, "out"));
  document.getElementById("vfQuickOutBtn").addEventListener("click", () => openVfTxModal(lineNumber, "out"));
  document.getElementById("vfQuickInBtn").addEventListener("click", () => openVfTxModal(lineNumber, "in"));

  document.getElementById("vfLineSettingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await saveVodafoneLineSettings(lineNumber, {
        phoneNumber: document.getElementById("vfPhoneInput").value.trim(),
        balance: document.getElementById("vfBalanceInput").value,
        dailyLimit: document.getElementById("vfDailyLimitInput").value,
        monthlyLimit: document.getElementById("vfMonthlyLimitInput").value
      });
      showToast(`تم حفظ بيانات خط رقم ${lineNumber} بنجاح`, "success");
    } catch (err) {
      showToast("تعذر حفظ بيانات الخط: " + err.message, "error");
    }
  });

  pageContent.querySelectorAll("[data-edit-vftx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tx = txs.find((t) => t.id === btn.dataset.editVftx);
      if (tx) openVfTxModal(lineNumber, tx.type, tx);
    });
  });

  pageContent.querySelectorAll("[data-delete-vftx]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const tx = txs.find((t) => t.id === btn.dataset.deleteVftx);
      if (!tx) return;
      const ok = await askConfirm("هل أنت متأكد من حذف هذه المعاملة؟ سيتم تعديل رصيد المحفظة تلقائياً.");
      if (!ok) return;
      try {
        await deleteVodafoneTxTransaction(tx.id, lineNumber, tx);
        showToast("تم حذف المعاملة وتحديث الرصيد", "success");
      } catch (err) {
        showToast("تعذر حذف المعاملة: " + err.message, "error");
      }
    });
  });
}

// ==========================================
// 3-6. Inventory Pages (Chargers, Phones, Headphones, Speakers)
// ==========================================
function renderInventoryPage(category, subCategories) {
  const activeSub = subCategories ? state.filters[category] || "الكل" : "الكل";
  const search = (state.filters.search || "").trim().toLowerCase();

  const items = state.products.filter((p) => {
    if (p.category !== category) return false;
    if (subCategories && activeSub !== "الكل" && p.subCategory !== activeSub) return false;
    if (search) {
      const hay = `${p.name || ""} ${p.brand || ""} ${p.barcode || ""} ${p.subCategory || ""}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const isPhone = category === "phones";

  pageContent.innerHTML = `
    <div class="page-toolbar">
      <div class="toolbar-actions">
        <button class="btn btn-primary" type="button" id="invAddNewBtn">+ إضافة جديد</button>
        <input
          id="invSearchInput"
          class="input-control search-box"
          type="search"
          placeholder="${isPhone ? "بحث بالموديل أو IMEI / الباركود..." : "بحث بالاسم أو الباركود..."}"
          value="${escapeHtml(state.filters.search)}"
        />
      </div>
      ${
        subCategories
          ? `
        <div class="filter-tabs" role="tablist">
          ${["الكل", ...subCategories]
            .map(
              (sub) => `
            <button
              class="filter-tab ${activeSub === sub ? "active" : ""}"
              type="button"
              data-subfilter="${escapeHtml(sub)}"
            >${escapeHtml(sub)}</button>
          `
            )
            .join("")}
        </div>
      `
          : ""
      }
    </div>

    <section class="panel-card">
      <div class="panel-header">
        <h3 class="panel-title">قائمة ${CATEGORY_LABELS[category]}</h3>
        <span class="badge badge-blue num">${items.length} صنف</span>
      </div>
      <div class="panel-body">
        ${
          items.length === 0
            ? `
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <h4>لا توجد أصناف مسجلة في هذا القسم</h4>
            <p>اضغط على "+ إضافة جديد" أو امسح باركود الصنف لإضافته إلى المخزون.</p>
            <button class="btn btn-primary" type="button" id="emptyAddBtn">+ إضافة جديد</button>
          </div>
        `
            : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>${isPhone ? "الماركة والموديل" : "اسم الصنف"}</th>
                  ${subCategories ? "<th>التصنيف الفرعي</th>" : ""}
                  <th>${isPhone ? "IMEI / الباركود" : "الباركود"}</th>
                  <th>سعر الشراء</th>
                  <th>سعر البيع</th>
                  <th>الكمية</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map((p) => {
                    const qty = Number(p.quantity) || 0;
                    const qtyBadge =
                      qty === 0
                        ? `<span class="badge badge-rose num">0 (نفد)</span>`
                        : qty <= 3
                        ? `<span class="badge badge-amber num">${qty}</span>`
                        : `<span class="badge badge-green num">${qty}</span>`;
                    return `
                    <tr>
                      <td><strong>${escapeHtml(p.name)}</strong>${p.brand && !isPhone ? ` <span style="color:var(--text-muted);font-size:0.8rem;">(${escapeHtml(p.brand)})</span>` : ""}</td>
                      ${subCategories ? `<td><span class="badge badge-blue">${escapeHtml(p.subCategory || "—")}</span></td>` : ""}
                      <td class="num">${escapeHtml(p.barcode || "—")}</td>
                      <td class="num">${formatMoney(p.purchasePrice)}</td>
                      <td class="num"><strong>${formatMoney(p.sellingPrice)}</strong></td>
                      <td>${qtyBadge}</td>
                      <td>
                        <div class="row-actions">
                          <button class="btn btn-success btn-sm" type="button" data-sell-prod="${p.id}" ${qty <= 0 ? "disabled" : ""}>بيع سريع</button>
                          <button class="btn btn-secondary btn-sm" type="button" data-edit-prod="${p.id}">تعديل</button>
                          <button class="btn btn-danger btn-sm" type="button" data-delete-prod="${p.id}">حذف</button>
                        </div>
                      </td>
                    </tr>
                  `;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        `
        }
      </div>
    </section>
  `;

  document.getElementById("invAddNewBtn").addEventListener("click", () => {
    openProductModal(category);
  });
  const emptyAddBtn = document.getElementById("emptyAddBtn");
  if (emptyAddBtn) {
    emptyAddBtn.addEventListener("click", () => openProductModal(category));
  }

  document.getElementById("invSearchInput").addEventListener("input", (e) => {
    state.filters.search = e.target.value;
    renderInventoryPage(category, subCategories);
    const input = document.getElementById("invSearchInput");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });

  pageContent.querySelectorAll("[data-subfilter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.filters[category] = btn.dataset.subfilter;
      renderInventoryPage(category, subCategories);
    });
  });

  pageContent.querySelectorAll("[data-sell-prod]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        const res = await sellProductTransaction(btn.dataset.sellProd, 1);
        showToast(
          `تم بيع "${res.productName}" بمبلغ ${formatMoney(res.totalAmount)} ج.م`,
          "success"
        );
      } catch (err) {
        showToast(err.message || "تعذر البيع", "error");
      }
    });
  });

  pageContent.querySelectorAll("[data-edit-prod]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prod = state.products.find((p) => p.id === btn.dataset.editProd);
      if (prod) openProductModal(prod.category, prod);
    });
  });

  pageContent.querySelectorAll("[data-delete-prod]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await askConfirm("هل أنت متأكد من حذف هذا الصنف نهائياً من المخزون؟");
      if (!ok) return;
      try {
        await removeProduct(btn.dataset.deleteProd);
        showToast("تم حذف الصنف بنجاح", "success");
      } catch (err) {
        showToast("تعذر الحذف: " + err.message, "error");
      }
    });
  });
}

// ==========================================
// Modals (Add / Edit Forms)
// ==========================================
function openProductModal(defaultCategory = "chargers", existing = null, prefillBarcode = "") {
  const cat = existing ? existing.category : defaultCategory;
  const isEdit = Boolean(existing);

  const buildSubOptions = (selectedCat, selectedSub) => {
    const subs = SUBCATEGORIES[selectedCat];
    if (!subs) return "";
    return subs
      .map(
        (s) =>
          `<option value="${escapeHtml(s)}" ${selectedSub === s ? "selected" : ""}>${escapeHtml(s)}</option>`
      )
      .join("");
  };

  openModal(
    isEdit ? "تعديل بيانات الصنف" : "إضافة صنف جديد للمخزون",
    `
    <form id="productForm" class="form-grid">
      <div class="form-group">
        <label class="form-label" for="prodCategory">القسم</label>
        <select id="prodCategory" class="select-control" required>
          <option value="chargers" ${cat === "chargers" ? "selected" : ""}>مخزون الشواحن والوصلات</option>
          <option value="phones" ${cat === "phones" ? "selected" : ""}>مبيعات التليفونات</option>
          <option value="headphones" ${cat === "headphones" ? "selected" : ""}>قسم السماعات</option>
          <option value="speakers" ${cat === "speakers" ? "selected" : ""}>قسم الصبات</option>
        </select>
      </div>

      <div class="form-group" id="prodSubGroup" style="${SUBCATEGORIES[cat] ? "" : "display:none;"}">
        <label class="form-label" for="prodSubCategory">التصنيف الفرعي</label>
        <select id="prodSubCategory" class="select-control">
          ${buildSubOptions(cat, existing?.subCategory)}
        </select>
      </div>

      <div class="form-group full">
        <label class="form-label" for="prodName">اسم الصنف / الماركة والموديل</label>
        <input id="prodName" class="input-control" type="text" required placeholder="مثال: شاحن سامسونج 25W أو iPhone 15" value="${escapeHtml(existing?.name || "")}" />
      </div>

      <div class="form-group full">
        <label class="form-label" for="prodBarcode">الباركود / IMEI (يدعم المسح بالاسكانر)</label>
        <input id="prodBarcode" class="input-control num" type="text" placeholder="امسح أو اكتب الباركود" value="${escapeHtml(existing?.barcode || prefillBarcode)}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="prodPurchase">سعر الشراء (ج.م)</label>
        <input id="prodPurchase" class="input-control num" type="number" step="0.01" min="0" required value="${existing ? Number(existing.purchasePrice) : ""}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="prodSelling">سعر البيع (ج.م)</label>
        <input id="prodSelling" class="input-control num" type="number" step="0.01" min="0" required value="${existing ? Number(existing.sellingPrice) : ""}" />
      </div>

      <div class="form-group full">
        <label class="form-label" for="prodQty">الكمية المتوفرة</label>
        <input id="prodQty" class="input-control num" type="number" step="1" min="0" required value="${existing ? Number(existing.quantity) : 1}" />
      </div>

      <div class="form-group full" style="flex-direction:row;justify-content:flex-end;gap:10px;margin-top:6px;">
        <button class="btn btn-secondary" type="button" id="cancelProdModal">إلغاء</button>
        <button class="btn btn-primary" type="submit">${isEdit ? "حفظ التعديلات" : "إضافة للمخزون"}</button>
      </div>
    </form>
    `
  );

  const catSelect = document.getElementById("prodCategory");
  const subGroup = document.getElementById("prodSubGroup");
  const subSelect = document.getElementById("prodSubCategory");

  catSelect.addEventListener("change", () => {
    const c = catSelect.value;
    if (SUBCATEGORIES[c]) {
      subGroup.style.display = "";
      subSelect.innerHTML = buildSubOptions(c, SUBCATEGORIES[c][0]);
    } else {
      subGroup.style.display = "none";
      subSelect.innerHTML = "";
    }
  });

  document.getElementById("cancelProdModal").addEventListener("click", closeModal);
  document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const selectedCat = catSelect.value;
    const payload = {
      category: selectedCat,
      subCategory: SUBCATEGORIES[selectedCat] ? subSelect.value : "",
      name: document.getElementById("prodName").value.trim(),
      barcode: document.getElementById("prodBarcode").value.trim(),
      purchasePrice: document.getElementById("prodPurchase").value,
      sellingPrice: document.getElementById("prodSelling").value,
      quantity: document.getElementById("prodQty").value
    };

    try {
      if (isEdit) {
        await updateProduct(existing.id, payload);
        showToast("تم تحديث بيانات الصنف بنجاح", "success");
      } else {
        await createProduct(payload);
        showToast("تمت إضافة الصنف إلى المخزون", "success");
      }
      closeModal();
    } catch (err) {
      showToast("تعذر الحفظ: " + err.message, "error");
    }
  });
}

function openSaleEditModal(sale) {
  openModal(
    "تعديل سجل عملية البيع",
    `
    <form id="saleEditForm" class="form-grid">
      <div class="form-group full">
        <label class="form-label" for="saleName">اسم الصنف</label>
        <input id="saleName" class="input-control" type="text" required value="${escapeHtml(sale.productName)}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="saleQty">الكمية</label>
        <input id="saleQty" class="input-control num" type="number" min="1" required value="${Number(sale.quantity) || 1}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="salePrice">سعر البيع (ج.م)</label>
        <input id="salePrice" class="input-control num" type="number" step="0.01" min="0" required value="${Number(sale.sellingPrice) || 0}" />
      </div>
      <div class="form-group full" style="flex-direction:row;justify-content:flex-end;gap:10px;">
        <button class="btn btn-secondary" type="button" id="cancelSaleEdit">إلغاء</button>
        <button class="btn btn-primary" type="submit">حفظ التعديلات</button>
      </div>
    </form>
    `
  );

  document.getElementById("cancelSaleEdit").addEventListener("click", closeModal);
  document.getElementById("saleEditForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await updateSaleRecord(sale.id, {
        productName: document.getElementById("saleName").value.trim(),
        quantity: document.getElementById("saleQty").value,
        sellingPrice: document.getElementById("salePrice").value,
        purchasePrice: sale.purchasePrice || 0
      });
      showToast("تم تعديل سجل البيع", "success");
      closeModal();
    } catch (err) {
      showToast("تعذر التعديل: " + err.message, "error");
    }
  });
}

function openVfTxModal(defaultLine = 1, defaultType = "out", existingTx = null) {
  const isEdit = Boolean(existingTx);
  const lineOptions = Array.from({ length: 18 }, (_, idx) => {
    const n = idx + 1;
    return `<option value="${n}" ${n === defaultLine ? "selected" : ""}>خط رقم ${n}</option>`;
  }).join("");

  openModal(
    isEdit ? `تعديل معاملة — خط رقم ${defaultLine}` : "تسجيل معاملة فودافون كاش",
    `
    <form id="vfTxForm" class="form-grid">
      <div class="form-group">
        <label class="form-label" for="vfTxLine">الخط</label>
        <select id="vfTxLine" class="select-control" ${isEdit ? "disabled" : ""}>
          ${lineOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="vfTxType">نوع العملية</label>
        <select id="vfTxType" class="select-control">
          <option value="out" ${(existingTx?.type || defaultType) === "out" ? "selected" : ""}>تحويل / إرسال</option>
          <option value="in" ${(existingTx?.type || defaultType) === "in" ? "selected" : ""}>استلام / سحب</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="vfTxAmount">المبلغ (ج.م)</label>
        <input id="vfTxAmount" class="input-control num" type="number" step="0.01" min="1" required value="${existingTx ? Number(existingTx.amount) : ""}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="vfTxCommission">العمولة (ج.م)</label>
        <input id="vfTxCommission" class="input-control num" type="number" step="0.01" min="0" value="${existingTx ? Number(existingTx.commission) : 0}" />
      </div>
      <div class="form-group full">
        <label class="form-label" for="vfTxPeer">رقم العميل / المحفظة المقابلة</label>
        <input id="vfTxPeer" class="input-control num" type="text" placeholder="010xxxxxxxx" value="${escapeHtml(existingTx?.peerNumber || "")}" />
      </div>
      <div class="form-group full">
        <label class="form-label" for="vfTxNotes">ملاحظات</label>
        <input id="vfTxNotes" class="input-control" type="text" placeholder="ملاحظة اختيارية..." value="${escapeHtml(existingTx?.notes || "")}" />
      </div>
      <div class="form-group full" style="flex-direction:row;justify-content:flex-end;gap:10px;">
        <button class="btn btn-secondary" type="button" id="cancelVfTx">إلغاء</button>
        <button class="btn btn-primary" type="submit">${isEdit ? "حفظ التعديل" : "تسجيل العملية"}</button>
      </div>
    </form>
    `
  );

  document.getElementById("cancelVfTx").addEventListener("click", closeModal);
  document.getElementById("vfTxForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const targetLine = Number(document.getElementById("vfTxLine").value);
    const payload = {
      type: document.getElementById("vfTxType").value,
      amount: document.getElementById("vfTxAmount").value,
      commission: document.getElementById("vfTxCommission").value,
      peerNumber: document.getElementById("vfTxPeer").value.trim(),
      notes: document.getElementById("vfTxNotes").value.trim()
    };

    try {
      if (isEdit) {
        await updateVodafoneTxTransaction(existingTx.id, defaultLine, existingTx, payload);
        showToast("تم تعديل المعاملة وتحديث الرصيد", "success");
      } else {
        await addVodafoneTxTransaction(targetLine, payload);
        showToast(`تم تسجيل المعاملة على خط رقم ${targetLine}`, "success");
      }
      closeModal();
    } catch (err) {
      showToast(err.message || "تعذر تنفيذ العملية", "error");
    }
  });
}

function openCategoryModal(existing = null) {
  const isEdit = Boolean(existing);
  openModal(
    isEdit ? "تعديل الفئة" : "إضافة فئة جديدة",
    `
    <form id="catForm" class="form-grid">
      <div class="form-group full">
        <label class="form-label" for="catName">اسم الفئة</label>
        <input id="catName" class="input-control" type="text" required value="${escapeHtml(existing?.name || "")}" />
      </div>
      <div class="form-group full">
        <label class="form-label" for="catDesc">الوصف</label>
        <input id="catDesc" class="input-control" type="text" value="${escapeHtml(existing?.description || "")}" />
      </div>
      <div class="form-group full" style="flex-direction:row;justify-content:flex-end;gap:10px;">
        <button class="btn btn-secondary" type="button" id="cancelCatModal">إلغاء</button>
        <button class="btn btn-primary" type="submit">${isEdit ? "حفظ" : "إضافة"}</button>
      </div>
    </form>
    `
  );
  document.getElementById("cancelCatModal").addEventListener("click", closeModal);
  document.getElementById("catForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById("catName").value.trim(),
      description: document.getElementById("catDesc").value.trim()
    };
    try {
      if (isEdit) await updateCategory(existing.id, payload);
      else await createCategory(payload);
      showToast(isEdit ? "تم تحديث الفئة" : "تمت إضافة الفئة", "success");
      closeModal();
    } catch (err) {
      showToast("تعذر الحفظ: " + err.message, "error");
    }
  });
}

function openUserModal(existing = null) {
  const isEdit = Boolean(existing);
  const currentPerms = existing?.permissions || [];
  openModal(
    isEdit ? "تعديل صلاحيات المستخدم" : "إضافة مستخدم جديد",
    `
    <form id="userForm" class="form-grid">
      <div class="form-group">
        <label class="form-label" for="userName">اسم المستخدم</label>
        <input id="userName" class="input-control" type="text" required value="${escapeHtml(existing?.userName || "")}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="userRole">الدور الوظيفي</label>
        <select id="userRole" class="select-control">
          <option value="مدير" ${existing?.role === "مدير" ? "selected" : ""}>مدير</option>
          <option value="كاشير" ${existing?.role === "كاشير" ? "selected" : ""}>كاشير</option>
          <option value="مسؤول مخزون" ${existing?.role === "مسؤول مخزون" ? "selected" : ""}>مسؤول مخزون</option>
        </select>
      </div>
      <div class="form-group full">
        <span class="form-label">الصلاحيات الممنوحة</span>
        <div class="checkbox-grid">
          ${PERMISSION_OPTIONS.map(
            (p) => `
            <label class="checkbox-item">
              <input type="checkbox" name="userPerms" value="${escapeHtml(p)}" ${currentPerms.includes(p) ? "checked" : ""} />
              <span>${escapeHtml(p)}</span>
            </label>
          `
          ).join("")}
        </div>
      </div>
      <div class="form-group full" style="flex-direction:row;justify-content:flex-end;gap:10px;">
        <button class="btn btn-secondary" type="button" id="cancelUserModal">إلغاء</button>
        <button class="btn btn-primary" type="submit">${isEdit ? "حفظ" : "إضافة"}</button>
      </div>
    </form>
    `
  );
  document.getElementById("cancelUserModal").addEventListener("click", closeModal);
  document.getElementById("userForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const perms = Array.from(document.querySelectorAll('input[name="userPerms"]:checked')).map(
      (el) => el.value
    );
    const payload = {
      userName: document.getElementById("userName").value.trim(),
      role: document.getElementById("userRole").value,
      permissions: perms
    };
    try {
      if (isEdit) await updateUserPermission(existing.id, payload);
      else await createUserPermission(payload);
      showToast(isEdit ? "تم تحديث صلاحيات المستخدم" : "تمت إضافة المستخدم", "success");
      closeModal();
    } catch (err) {
      showToast("تعذر الحفظ: " + err.message, "error");
    }
  });
}

// ==========================================
// Bootstrap
// ==========================================
renderVfSubmenu();
renderCurrentPage();
initFirebaseListeners();
