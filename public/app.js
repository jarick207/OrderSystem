const state = {
  days: [],
  activeDayId: "",
  activeCategoryByDay: new Map(),
  carts: new Map(),
  optionGroups: new Map(),
  activeOptionGroup: null
};

const dayTabs = document.querySelector("#dayTabs");
const categoryTabs = document.querySelector("#categoryTabs");
const menuList = document.querySelector("#menuList");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const orderForm = document.querySelector("#orderForm");
const formMessage = document.querySelector("#formMessage");
const API_BASE_URL = (window.ORDER_API_BASE_URL || "").replace(/\/$/, "");
const SIZE_LABELS = ["大", "中", "小"];
const OPTION_CATEGORIES = ["飲品", "飲料", "夏日限定", "冬季限定"];
const ADD_EGG_CATEGORIES = ["抓餅", "鐵板麵"];
const ADD_EGG_PRICE = 15;

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
  return OPTION_CATEGORIES.includes(item.category);
}

function isAddEggOnlyItem(item) {
  return item.id.endsWith("-add-egg") || item.name.endsWith("加蛋");
}

// public/app.js
function canAddEgg(item) {
  return item.id.startsWith("day2-")
    && ADD_EGG_CATEGORIES.includes(item.category)
    && !isAddEggOnlyItem(item);
}

function hasOptions(item) {
  return isDrink(item) || canAddEgg(item);
}

function stripSizeSuffix(name) {
  return String(name || "").replace(/\s+(大|中|小)$/, "");
}

function sizeFromName(name) {
  const match = String(name || "").match(/\s+(大|中|小)$/);
  return match ? match[1] : "";
}

function optionGroupKey(day, item) {
  return `${day.id}::${item.category}::${stripSizeSuffix(item.name)}`;
}

function cartKey(item, temperature = "", addEgg = false) {
  if (isDrink(item)) return `${item.id}::${temperature || "冰"}`;
  return addEgg ? `${item.id}::egg` : item.id;
}

function parseCartKey(key) {
  const [id, option] = key.split("::");
  return {
    id,
    temperature: option && option !== "egg" ? option : "",
    addEgg: option === "egg"
  };
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
  const menu = category ? day.menu.filter((item) => item.category === category) : day.menu;
  return menu.filter((item) => !isAddEggOnlyItem(item));
}

function visibleMenuEntries(day) {
  const groups = new Map();

  return visibleMenuItems(day).reduce((entries, item) => {
    if (!hasOptions(item)) {
      entries.push({ type: "item", item });
      return entries;
    }

    const key = isDrink(item) ? optionGroupKey(day, item) : `${day.id}::${item.category}::${item.id}`;
    if (!groups.has(key)) {
      const group = {
        type: "optionGroup",
        key,
        dayId: day.id,
        category: item.category,
        name: isDrink(item) ? stripSizeSuffix(item.name) : item.name,
        hasSizeChoices: isDrink(item),
        hasTemperatureChoices: isDrink(item),
        hasAddEggChoices: canAddEgg(item),
        items: []
      };
      groups.set(key, group);
      entries.push(group);
    }

    groups.get(key).items.push(item);
    return entries;
  }, []);
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
        addEgg: parsed.addEgg,
        price: item.price + (parsed.addEgg ? ADD_EGG_PRICE : 0),
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
    addEgg: item.addEgg,
    quantity: item.quantity
  }));
}

function optionGroupsByKey() {
  state.optionGroups.clear();
  state.days.forEach((day) => {
    day.menu.forEach((item) => {
      if (!hasOptions(item)) return;
      const key = isDrink(item) ? optionGroupKey(day, item) : `${day.id}::${item.category}::${item.id}`;
      if (!state.optionGroups.has(key)) {
        state.optionGroups.set(key, {
          key,
          dayId: day.id,
          category: item.category,
          name: isDrink(item) ? stripSizeSuffix(item.name) : item.name,
          hasSizeChoices: isDrink(item),
          hasTemperatureChoices: isDrink(item),
          hasAddEggChoices: canAddEgg(item),
          items: []
        });
      }
      state.optionGroups.get(key).items.push(item);
    });
  });

  state.optionGroups.forEach((group) => {
    group.items.sort((a, b) => {
      const sizeA = SIZE_LABELS.indexOf(sizeFromName(a.name));
      const sizeB = SIZE_LABELS.indexOf(sizeFromName(b.name));
      return (sizeA === -1 ? 99 : sizeA) - (sizeB === -1 ? 99 : sizeB);
    });
  });
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

  menuList.innerHTML = visibleMenuEntries(day)
    .map((entry) => {
      if (entry.type === "optionGroup") {
        const prices = entry.items.map((item) => item.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const selectedCount = entry.items.reduce((sum, item) => {
          if (entry.hasTemperatureChoices) {
            return sum + ["冰", "熱"].reduce((total, temperature) => total + (cart.get(cartKey(item, temperature)) || 0), 0);
          }
          return sum + (cart.get(cartKey(item, "", false)) || 0) + (cart.get(cartKey(item, "", true)) || 0);
        }, 0);
        return `
          <article class="menu-card">
            <div>
              <p class="category">${entry.category}</p>
              <h3>${entry.name}</h3>
              <p>${entry.hasAddEggChoices ? "可選是否加蛋與數量" : entry.items.length > 1 ? "可選尺寸、冰熱與數量" : "可選冰熱與數量"}</p>
            </div>
            <div class="menu-actions">
              <strong>${entry.hasAddEggChoices ? `${money(minPrice)} / 加蛋 ${money(minPrice + ADD_EGG_PRICE)}` : minPrice === maxPrice ? money(minPrice) : `${money(minPrice)} 起`}</strong>
              <button class="option-button" type="button" data-action="open-options" data-option-key="${entry.key}">
                選擇${selectedCount ? `（${selectedCount}）` : ""}
              </button>
            </div>
          </article>
        `;
      }

      const item = entry.item;
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

function renderOptionModal(group) {
  const existing = document.querySelector("#optionModal");
  if (existing) existing.remove();

  state.activeOptionGroup = group;
  const defaultItem = group.items[0];
  const hasSizeChoices = group.hasSizeChoices && group.items.some((item) => sizeFromName(item.name));

  const modal = document.createElement("div");
  modal.id = "optionModal";
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <section class="option-modal" role="dialog" aria-modal="true" aria-labelledby="optionModalTitle">
      <div class="option-modal-header">
        <div>
          <p class="eyebrow">${group.category}</p>
          <h2 id="optionModalTitle">${group.name}</h2>
        </div>
        <button class="icon-button" type="button" data-modal-close aria-label="關閉">×</button>
      </div>
      <form id="optionForm" class="option-form">
        ${hasSizeChoices ? `
          <label>
            尺寸
            <select name="itemId">
              ${group.items.map((item) => {
                const size = sizeFromName(item.name) || item.name;
                return `<option value="${item.id}">${size} - ${money(item.price)}</option>`;
              }).join("")}
            </select>
          </label>
        ` : `<input type="hidden" name="itemId" value="${defaultItem.id}">`}
        ${group.hasTemperatureChoices ? `
          <fieldset class="choice-field">
            <legend>冰熱</legend>
            <div class="choice-row">
              <label>
                <input type="radio" name="temperature" value="冰" checked>
                <span>冰</span>
              </label>
              <label>
                <input type="radio" name="temperature" value="熱">
                <span>熱</span>
              </label>
            </div>
          </fieldset>
        ` : ""}
        ${group.hasAddEggChoices ? `
          <fieldset class="choice-field">
            <legend>加蛋</legend>
            <div class="choice-row">
              <label>
                <input type="radio" name="addEgg" value="no" checked>
                <span>不加蛋</span>
              </label>
              <label>
                <input type="radio" name="addEgg" value="yes">
                <span>加蛋 +${money(ADD_EGG_PRICE)}</span>
              </label>
            </div>
          </fieldset>
        ` : ""}
        <label>
          數量
          <input name="quantity" type="number" min="1" max="99" value="1" inputmode="numeric">
        </label>
        <div class="modal-actions">
          <button class="secondary-button" type="button" data-modal-close>取消</button>
          <button class="submit-button" type="submit">加入餐點</button>
        </div>
      </form>
    </section>
  `;

  document.body.appendChild(modal);
  modal.querySelector("select, input, button")?.focus();
}

function closeOptionModal() {
  document.querySelector("#optionModal")?.remove();
  state.activeOptionGroup = null;
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
                <span>${item.name}${item.addEgg ? "（加蛋）" : ""}${item.temperature ? `（${item.temperature}）` : ""} x ${item.quantity}</span>
                <strong>${money(item.price * item.quantity)}</strong>
                <button
                  class="cart-remove"
                  type="button"
                  data-cart-remove
                  data-day-id="${item.dayId}"
                  data-cart-key="${cartKey(item, item.temperature, item.addEgg)}"
                  aria-label="刪除 ${item.name}"
                >
                  刪除
                </button>
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

function removeCartItem(dayId, key) {
  const cart = state.carts.get(dayId);
  if (!cart) return;
  cart.delete(key);
  renderMenu();
  renderCart();
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

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-cart-remove]");
  if (!button) return;
  removeCartItem(button.dataset.dayId, button.dataset.cartKey);
});

menuList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "open-options") {
    const group = state.optionGroups.get(button.dataset.optionKey);
    if (group) renderOptionModal(group);
    return;
  }
  const delta = button.dataset.action === "increase" ? 1 : -1;
  updateQuantity(button.dataset.id, delta);
});

document.addEventListener("click", (event) => {
  if (event.target.matches("[data-modal-close]") || event.target.id === "optionModal") {
    closeOptionModal();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "optionForm") return;
  event.preventDefault();
  const group = state.activeOptionGroup;
  if (!group) return;

  const formData = new FormData(event.target);
  const item = group.items.find((menuItem) => menuItem.id === formData.get("itemId"));
  const quantity = Math.max(1, Math.min(99, Number(formData.get("quantity")) || 1));
  const temperature = formData.get("temperature") || "冰";
  const addEgg = formData.get("addEgg") === "yes";
  const day = state.days.find((menuDay) => menuDay.id === group.dayId);
  if (!item || !day) return;

  if (!state.carts.has(day.id)) {
    state.carts.set(day.id, new Map());
  }
  const cart = state.carts.get(day.id);
  const key = cartKey(item, temperature, addEgg);
  cart.set(key, Math.min(99, (cart.get(key) || 0) + quantity));
  closeOptionModal();
  renderMenu();
  renderCart();
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
    optionGroupsByKey();
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
