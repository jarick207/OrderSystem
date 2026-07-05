const ordersList = document.querySelector("#ordersList");
const refreshOrders = document.querySelector("#refreshOrders");
const logoutButton = document.querySelector("#logoutButton");
const loginPanel = document.querySelector("#loginPanel");
const recordsPanel = document.querySelector("#recordsPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const statsList = document.querySelector("#statsList");
const exportStats = document.querySelector("#exportStats");
const API_BASE_URL = (window.ORDER_API_BASE_URL || "").replace(/\/$/, "");
const AUTH_TOKEN_KEY = "orderSystemAdminToken";
let latestOrders = [];

function apiUrl(path, params = {}) {
  if (API_BASE_URL) {
    const searchParams = new URLSearchParams({ path, ...params });
    return `${API_BASE_URL}?${searchParams.toString()}`;
  }

  const searchParams = new URLSearchParams(params);
  return `${API_BASE_URL}${path}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
}

function adminToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function adminPostOptions(payload) {
  const body = JSON.stringify(payload);

  if (API_BASE_URL) {
    return {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body
    };
  }

  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  };
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

function xmlCell(value, type = "String") {
  const text = String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<Cell><Data ss:Type="${type}">${text}</Data></Cell>`;
}

function statsRowsByDay(orders) {
  const statsByDay = buildStats(orders);
  const preferredOrder = ["第一天", "第二天"];
  return Array.from(statsByDay.entries())
    .sort(([left], [right]) => {
      const leftIndex = preferredOrder.indexOf(left);
      const rightIndex = preferredOrder.indexOf(right);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    })
    .map(([dayName, dayStats]) => ({
      dayName,
      rows: Array.from(dayStats.values()).map((item) => ({
        item: item.label,
        quantity: item.quantity,
        total: item.total
      }))
    }));
}

function worksheetXml(dayName, rows) {
  const safeSheetName = String(dayName || "未指定").replace(/[\[\]:*?/\\]/g, "").slice(0, 31) || "未指定";
  const bodyRows = rows.map((row) => `
    <Row>
      ${xmlCell(row.item)}
      ${xmlCell(row.quantity, "Number")}
      ${xmlCell(row.total, "Number")}
    </Row>
  `).join("");

  return `
    <Worksheet ss:Name="${safeSheetName}">
      <Table>
        <Row>
          ${xmlCell("品項")}
          ${xmlCell("數量")}
          ${xmlCell("金額")}
        </Row>
        ${bodyRows}
      </Table>
    </Worksheet>
  `;
}

function exportStatsExcel() {
  const sheets = statsRowsByDay(latestOrders).filter((sheet) => sheet.rows.length > 0);
  if (sheets.length === 0) {
    loginMessage.textContent = "";
    ordersList.innerHTML = '<p class="empty-state">目前沒有可匯出的統計資料。</p>';
    return;
  }

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${sheets.map((sheet) => worksheetXml(sheet.dayName, sheet.rows)).join("")}
</Workbook>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  link.href = url;
  link.download = `order-stats-${stamp}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
    const response = await fetch(apiUrl("/api/orders", { token: adminToken() }));
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.orders)) throw new Error(data.error || "讀取訂單失敗");
    latestOrders = data.orders;
    renderStats(data.orders);
    renderOrders(data.orders);
  } catch (error) {
    latestOrders = [];
    statsList.innerHTML = "";
    ordersList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  } finally {
    refreshOrders.disabled = false;
    refreshOrders.textContent = "重新整理";
  }
}

function isAuthenticated() {
  return Boolean(adminToken());
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
  latestOrders = [];
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  const formData = new FormData(loginForm);
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const submitButton = loginForm.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  submitButton.textContent = "登入中...";

  try {
    const response = await fetch(apiUrl("/api/admin/login"), adminPostOptions({ username, password }));
    const data = await response.json();
    if (!response.ok || !data.token) throw new Error(data.error || "帳號或密碼錯誤。");

    sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
    loginForm.reset();
    showRecords();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "登入";
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  showLogin();
});

refreshOrders.addEventListener("click", loadOrders);
exportStats.addEventListener("click", exportStatsExcel);

if (isAuthenticated()) {
  showRecords();
} else {
  showLogin();
}
