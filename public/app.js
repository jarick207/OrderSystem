const state = {
  days: [],
  activeDayId: "",
  activeCategoryByDay: new Map(),
  carts: new Map(),
  drinkTemperatures: new Map()
};

const dayTabs = document.querySelector("#dayTabs");
const categoryTabs = document.querySelector("#categoryTabs");
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

function isDrink(item) {
  return ["飲品", "飲料"].includes(item.category);
}

function selectedTemperature(itemId) {
  return state.drinkTemperatures.get(itemId) || "冰";
}

function cartKey(item) {
  return isDrink(item) ? `${item.id}::${selectedTemperature(item.id)}` : item.id;
}

function parseCartKey(key) {
  const [id, temperature] = key.split("::");
  return { id, temperature: temperature || "" };
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

function activeCategory(day) {
  return state.activeCategoryByDay.get(day.id) || day.categoryTabs?.[0] || "";
}

function visibleMenuItems(day) {
  const category = activeCategory(day);
  if (!category) return day.menu;
  return day.menu.filter((item) => item.category === category);
}

function allSelectedItems() {
  return state.days.flatMap((day) => {
    const cart = state.carts.get(day.id);
    if (!cart) return [];

    return Array.from(cart.entries()).map(([key, quantity]) => {
      const parsed = parseCartKey(key);
      const item = day.menu.find((menuItem) => menuItem.id === parsed.id);
      if (!item) return null;

      return {
        ...item,
        dayId: day.id,
        dayName: day.name,
        temperature: parsed.temperature,
        quantity
      };
    }).filter(Boolean);
  });
}

function cartPayload() {
  return allSelectedItems().map((item) => ({
    id: item.id,
    dayId: item.dayId,
    temperature: item.temperature,
    quantity: item.quantity
  }));
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

function renderCategoryTabs() {
  const day = activeDay();
  const tabs = day?.categoryTabs || [];

  if (tabs.length === 0) {
    categoryTabs.innerHTML = "";
    categoryTabs.hidden = true;
    return;
  }

  const current = activeCategory(day);
  categoryTabs.hidden = false;
  categoryTabs.innerHTML = tabs
    .map((category) => `
      <button
        type="button"
        class="${category === current ? "active" : ""}"
        data-category="${category}"
        role="tab"
        aria-selected="${category === current}"
      >
        ${category}
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

  menuList.innerHTML = visibleMenuItems(day)
    .map((item) => {
      const quantity = cart.get(cartKey(item)) || 0;
      return `
        <article class="menu-card">
          <div>
            <p class="category">${item.category}</p>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
          </div>
          <div class="menu-actions">
            <strong>${money(item.price)}</strong>
            ${isDrink(item) ? `
              <label class="temperature-field">
                冰熱
                <select data-temperature-for="${item.id}">
                  <option value="冰" ${selectedTemperature(item.id) === "冰" ? "selected" : ""}>冰</option>
                  <option value="熱" ${selectedTemperature(item.id) === "熱" ? "selected" : ""}>熱</option>
                </select>
              </label>
            ` : ""}
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
  const selectedItems = allSelectedItems();

  if (selectedItems.length === 0) {
    cartItems.className = "cart-items empty";
    cartItems.textContent = "尚未選擇餐點";
    cartTotal.textContent = money(0);
    return;
  }

  cartItems.className = "cart-items";
  cartItems.innerHTML = state.days
    .map((day) => {
      const dayItems = selectedItems.filter((item) => item.dayId === day.id);
      if (dayItems.length === 0) return "";

      return `
        <section class="cart-day-group">
          <h3>${day.name}</h3>
          <ol>
            ${dayItems.map((item) => `
              <li>
                <span>${item.name}${item.temperature ? `（${item.temperature}）` : ""} x ${item.quantity}</span>
                <strong>${money(item.price * item.quantity)}</strong>
              </li>
            `).join("")}
          </ol>
        </section>
      `;
    })
    .join("");

  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = money(total);
}

function updateQuantity(id, delta) {
  const day = activeDay();
  const item = day?.menu.find((menuItem) => menuItem.id === id);
  if (!item) return;

  const cart = activeCart();
  const key = cartKey(item);
  const current = cart.get(key) || 0;
  const next = Math.max(0, Math.min(99, current + delta));
  if (next === 0) {
    cart.delete(key);
  } else {
    cart.set(key, next);
  }
  renderMenu();
  renderCart();
}

dayTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-day-id]");
  if (!button) return;
  state.activeDayId = button.dataset.dayId;
  renderDayTabs();
  renderCategoryTabs();
  renderMenu();
  renderCart();
});

categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  const day = activeDay();
  if (!day) return;
  state.activeCategoryByDay.set(day.id, button.dataset.category);
  renderCategoryTabs();
  renderMenu();
});

menuList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const delta = button.dataset.action === "increase" ? 1 : -1;
  updateQuantity(button.dataset.id, delta);
});

menuList.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-temperature-for]");
  if (!select) return;
  state.drinkTemperatures.set(select.dataset.temperatureFor, select.value);
  renderMenu();
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  const selectedItems = allSelectedItems();

  if (state.days.length === 0) {
    formMessage.textContent = "目前沒有可訂購的菜單。";
    return;
  }

  if (selectedItems.length === 0) {
    formMessage.textContent = "請先選擇餐點。";
    return;
  }

  const formData = new FormData(orderForm);
  const payload = {
    dayIds: [...new Set(selectedItems.map((item) => item.dayId))],
    dayNames: [...new Set(selectedItems.map((item) => item.dayName))],
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

    state.carts.clear();
    orderForm.reset();
    renderDayTabs();
    renderCategoryTabs();
    renderMenu();
    renderCart();
    formMessage.textContent = `訂單已送出，編號 ${result.order.id}，合計 ${money(result.order.total)}。`;
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
    state.days.forEach((day) => {
      if (day.categoryTabs?.length) {
        state.activeCategoryByDay.set(day.id, day.categoryTabs[0]);
      }
    });
    renderDayTabs();
    renderCategoryTabs();
    renderMenu();
    renderCart();
  } catch (error) {
    menuList.innerHTML = `<p class="empty-state">菜單載入失敗：${error.message}</p>`;
  }
}

loadMenu();
