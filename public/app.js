const state = {
  days: [],
  activeDayId: "",
  carts: new Map()
};

const dayTabs = document.querySelector("#dayTabs");
const menuList = document.querySelector("#menuList");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const orderForm = document.querySelector("#orderForm");
const formMessage = document.querySelector("#formMessage");
const API_BASE_URL = (window.ORDER_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  if (API_BASE_URL) {
    return `${API_BASE_URL}?path=${encodeURIComponent(path)}`;
  }

  return `${API_BASE_URL}${path}`;
}

function orderRequestOptions(payload) {
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

function activeDay() {
  return state.days.find((day) => day.id === state.activeDayId) || state.days[0];
}

function activeCart() {
  if (!state.carts.has(state.activeDayId)) {
    state.carts.set(state.activeDayId, new Map());
  }

  return state.carts.get(state.activeDayId);
}

function cartPayload() {
  return Array.from(activeCart().entries()).map(([id, quantity]) => ({ id, quantity }));
}

function renderDayTabs() {
  dayTabs.innerHTML = state.days
    .map((day) => `
      <button
        type="button"
        class="${day.id === state.activeDayId ? "active" : ""}"
        data-day-id="${day.id}"
        role="tab"
        aria-selected="${day.id === state.activeDayId}"
      >
        ${day.name}
      </button>
    `)
    .join("");
}

function renderMenu() {
  const day = activeDay();
  const cart = activeCart();

  if (!day) {
    menuList.innerHTML = '<p class="empty-state">目前沒有菜單。</p>';
    return;
  }

  menuList.innerHTML = day.menu
    .map((item) => {
      const quantity = cart.get(item.id) || 0;
      return `
        <article class="menu-card">
          <div>
            <p class="category">${item.category}</p>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
          </div>
          <div class="menu-actions">
            <strong>${money(item.price)}</strong>
            <div class="stepper" aria-label="${item.name} 數量">
              <button type="button" data-action="decrease" data-id="${item.id}">-</button>
              <span>${quantity}</span>
              <button type="button" data-action="increase" data-id="${item.id}">+</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const day = activeDay();
  const cart = activeCart();
  const selectedItems = day
    ? day.menu
      .filter((item) => cart.has(item.id))
      .map((item) => ({ ...item, quantity: cart.get(item.id) }))
    : [];

  if (selectedItems.length === 0) {
    cartItems.className = "cart-items empty";
    cartItems.textContent = day ? `${day.name}尚未選擇餐點` : "尚未選擇餐點";
    cartTotal.textContent = money(0);
    return;
  }

  cartItems.className = "cart-items";
  cartItems.innerHTML = selectedItems
    .map((item) => `
      <div class="cart-row">
        <span>${item.name} x ${item.quantity}</span>
        <strong>${money(item.price * item.quantity)}</strong>
      </div>
    `)
    .join("");

  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = money(total);
}

function updateQuantity(id, delta) {
  const cart = activeCart();
  const current = cart.get(id) || 0;
  const next = Math.max(0, Math.min(99, current + delta));
  if (next === 0) {
    cart.delete(id);
  } else {
    cart.set(id, next);
  }
  renderMenu();
  renderCart();
}

dayTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-day-id]");
  if (!button) return;
  state.activeDayId = button.dataset.dayId;
  renderDayTabs();
  renderMenu();
  renderCart();
});

menuList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const delta = button.dataset.action === "increase" ? 1 : -1;
  updateQuantity(button.dataset.id, delta);
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  const day = activeDay();
  const cart = activeCart();

  if (!day) {
    formMessage.textContent = "目前沒有可訂購的菜單。";
    return;
  }

  if (cart.size === 0) {
    formMessage.textContent = "請先選擇餐點。";
    return;
  }

  const formData = new FormData(orderForm);
  const payload = {
    dayId: day.id,
    dayName: day.name,
    customerName: formData.get("customerName"),
    note: formData.get("note"),
    items: cartPayload()
  };

  const submitButton = orderForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "送出中...";

  try {
    const response = await fetch(apiUrl("/api/orders"), orderRequestOptions(payload));
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "送出失敗");

    cart.clear();
    orderForm.reset();
    renderDayTabs();
    renderMenu();
    renderCart();
    formMessage.textContent = `訂單已送出，編號 ${result.order.id.slice(0, 8)}，合計 ${money(result.order.total)}。`;
  } catch (error) {
    formMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "送出訂單";
  }
});

async function loadMenu() {
  try {
    const response = await fetch(apiUrl("/api/menu"));
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.menu)) {
      if (!Array.isArray(data.days)) {
        throw new Error(data.error || "菜單讀取失敗");
      }
    }

    state.days = Array.isArray(data.days) ? data.days : [{ id: "day1", name: "第一天", menu: data.menu }];
    state.activeDayId = state.days[0]?.id || "";
    renderDayTabs();
    renderMenu();
    renderCart();
  } catch (error) {
    menuList.innerHTML = `<p class="empty-state">菜單載入失敗：${error.message}</p>`;
  }
}

loadMenu();
