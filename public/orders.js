const ordersList = document.querySelector("#ordersList");
const refreshOrders = document.querySelector("#refreshOrders");
const API_BASE_URL = (window.ORDER_API_BASE_URL || "").replace(/\/$/, "");

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
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
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
            <h3>${order.customerName} / ${order.phone}</h3>
          </div>
          <strong>${money(order.total)}</strong>
        </div>
        <p>取餐時間：${order.pickupTime}</p>
        <div class="order-items">
          ${order.items.map((item) => `<span>${item.name} x ${item.quantity}</span>`).join("")}
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
    renderOrders(data.orders);
  } catch (error) {
    ordersList.innerHTML = `<p class="empty-state">${error.message}</p>`;
  } finally {
    refreshOrders.disabled = false;
    refreshOrders.textContent = "重新整理";
  }
}

refreshOrders.addEventListener("click", loadOrders);
loadOrders();
