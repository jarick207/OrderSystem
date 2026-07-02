const state = {
  menu: [],
  cart: new Map()
};

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

function cartPayload() {
  return Array.from(state.cart.entries()).map(([id, quantity]) => ({ id, quantity }));
}

function renderMenu() {
  menuList.innerHTML = state.menu
    .map((item) => {
      const quantity = state.cart.get(item.id) || 0;
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
  const selectedItems = state.menu
    .filter((item) => state.cart.has(item.id))
    .map((item) => ({ ...item, quantity: state.cart.get(item.id) }));

  if (selectedItems.length === 0) {
    cartItems.className = "cart-items empty";
    cartItems.textContent = "尚未選擇餐點";
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
  const current = state.cart.get(id) || 0;
  const next = Math.max(0, Math.min(99, current + delta));
  if (next === 0) {
    state.cart.delete(id);
  } else {
    state.cart.set(id, next);
  }
  renderMenu();
  renderCart();
}

menuList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const delta = button.dataset.action === "increase" ? 1 : -1;
  updateQuantity(button.dataset.id, delta);
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  if (state.cart.size === 0) {
    formMessage.textContent = "請先選擇餐點。";
    return;
  }

  const formData = new FormData(orderForm);
  const payload = {
    customerName: formData.get("customerName"),
    phone: formData.get("phone"),
    pickupTime: formData.get("pickupTime"),
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

    state.cart.clear();
    orderForm.reset();
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
      throw new Error(data.error || "菜單讀取失敗");
    }

    state.menu = data.menu;
    renderMenu();
    renderCart();
  } catch (error) {
    menuList.innerHTML = `<p class="empty-state">菜單載入失敗：${error.message}</p>`;
  }
}

loadMenu();
