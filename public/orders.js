const ordersList = document.querySelector("#ordersList");
const refreshOrders = document.querySelector("#refreshOrders");
const logoutButton = document.querySelector("#logoutButton");
const loginPanel = document.querySelector("#loginPanel");
const recordsPanel = document.querySelector("#recordsPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const statsList = document.querySelector("#statsList");
const API_BASE_URL = (window.ORDER_API_BASE_URL || "").replace(/\/$/, "");
const AUTH_KEY = "orderSystemOrdersAuth";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin0236";

function apiUrl(path) {
  if (API_BASE_URL) {
    return `${API_BASE_URL}?path=${encodeURIComponent(path)}`;
  }

  return `${API_BASE_URL}${path}`;
}

function money(value) {
  return `$${Number(value).toLocaleString("zh-TW")}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "時間未記錄";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function normalizeItems(items) {
  return Array.isArray(items) ? items : [];
}

function itemLabel(item) {
  return `${item.name}${item.addEgg ? "（加蛋）" : ""}${item.temperature ? `（${item.temperature}）` : ""}`;
}

function buildStats(orders) {
  const statsByDay = new Map();

  orders.forEach((order) => {
    normalizeItems(order.items).forEach((item) => {
      const dayName = item.dayName || order.dayName || "未指定";
      const key = `${item.id || item.name}::${item.temperature || ""}::${item.addEgg ? "egg" : ""}`;
      if (!statsByDay.has(dayName)) {
        statsByDay.set(dayName, new Map());
      }

      const dayStats = statsByDay.get(dayName);
      const current = dayStats.get(key) || {
        label: itemLabel(item),
        quantity: 0,
        total: 0
      };
      current.quantity += Number(item.quantity) || 0;
      current.total += Number(item.subtotal) || (Number(item.price) || 0) * (Number(item.quantity) || 0);
      dayStats.set(key, current);
    });
  });

  return statsByDay;
}

function renderStats(orders) {
  const statsByDay = buildStats(orders);

  if (statsByDay.size === 0) {
    statsList.innerHTML = '<p class="empty-state">目前沒有可統計的餐點。</p>';
    return;
  }

  statsList.innerHTML = Array.from(statsByDay.entries())
    .map(([dayName, dayStats]) => `
      <section class="stats-day-group">
        <h3>${dayName}</h3>
        <div class="stats-rows">
          ${Array.from(dayStats.values()).map((item) => `
            <div class="stats-row">
              <span>${item.label}</span>
              <strong>${item.quantity} 份</strong>
              <span>${money(item.total)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    `)
    .join("");
}

function renderOrders(orders) {
  if (orders.length === 0) {
    ordersList.innerHTML = '<p class="empty-state">目前還沒有訂單。</p>';
    return;
  }

  ordersList.innerHTML = orders
    .map((order) => `
      <article class="order-card">
        <div class="order-card-header">
          <div>
            <p class="category">${formatDate(order.createdAt)}</p>
            <h3>${order.customerName}</h3>
          </div>
          <strong>${money(order.total)}</strong>
        </div>
        <p>菜單日期：${order.dayName || order.dayId || "未指定"}</p>
        <div class="order-items">
          ${normalizeItems(order.items).map((item) => `<span>${item.dayName ? `${item.dayName}｜` : ""}${item.name}${item.addEgg ? "（加蛋）" : ""}${item.temperature ? `（${item.temperature}）` : ""} x ${item.quantity}</span>`).join("") || "<span>餐點資料未記錄</span>"}
        </div>
        ${order.note ? `<p class="note">備註：${order.note}</p>` : ""}
        <small>訂單編號：${order.id}</small>
      </article>
    `)
    .join("");
}

async function loadOrders() {
  refreshOrders.disabled = true;
  refreshOrders.textContent = "讀取中...";
  try {
    const response = await fetch(apiUrl("/api/orders"));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "讀取訂單失敗");
    renderStats(data.orders);
    renderOrders(data.orders);
  } catch (error) {
    statsList.innerHTML = "";
    ordersList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  } finally {
    refreshOrders.disabled = false;
    refreshOrders.textContent = "重新整理";
  }
}

function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

function showRecords() {
  loginPanel.hidden = true;
  recordsPanel.hidden = false;
  loadOrders();
}

function showLogin() {
  loginPanel.hidden = false;
  recordsPanel.hidden = true;
  statsList.innerHTML = "";
  ordersList.innerHTML = "";
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, "true");
    loginForm.reset();
    loginMessage.textContent = "";
    showRecords();
    return;
  }

  loginMessage.textContent = "帳號或密碼錯誤。";
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(AUTH_KEY);
  showLogin();
});

refreshOrders.addEventListener("click", loadOrders);

if (isAuthenticated()) {
  showRecords();
} else {
  showLogin();
}
