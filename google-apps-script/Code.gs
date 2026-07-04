const SHEET_NAME = "Orders";
const ADMIN_TOKEN = "";

const MENU_BY_DAY = [
  {
    id: "day1",
    name: "第一天",
    menu: [
      { id: "day1-chicken-rice", name: "香煎雞腿飯", category: "主餐", price: 140, description: "雞腿排、溫蔬菜、白飯" },
      { id: "day1-pork-noodle", name: "蔥燒豬肉拌麵", category: "主餐", price: 120, description: "豬五花、青蔥、手工麵" },
      { id: "day1-fried-tofu", name: "酥炸豆腐", category: "小點", price: 65, description: "外酥內嫩，附椒鹽" },
      { id: "day1-black-tea", name: "古早味紅茶", category: "飲品", price: 35, description: "固定微糖去冰" }
    ]
  },
  {
    id: "day2",
    name: "第二天",
    categoryTabs: ["漢堡", "吐司", "飲料"],
    menu: [
      { id: "day2-pork-burger", name: "豬肉漢堡", category: "漢堡", price: 65, description: "漢堡、豬肉排、蛋、蔬菜" },
      { id: "day2-chicken-burger", name: "雞腿漢堡", category: "漢堡", price: 75, description: "漢堡、雞腿排、蛋、蔬菜" },
      { id: "day2-ham-toast", name: "火腿吐司", category: "吐司", price: 45, description: "吐司、火腿、蛋、起司" },
      { id: "day2-tuna-toast", name: "鮪魚吐司", category: "吐司", price: 50, description: "吐司、鮪魚、蛋、蔬菜" },
      { id: "day2-black-tea", name: "紅茶", category: "飲料", price: 25, description: "可選冰或熱" },
      { id: "day2-milk-tea", name: "奶茶", category: "飲料", price: 30, description: "可選冰或熱" }
    ]
  }
];

const CUSTOMER_NAMES = ["大舅舅", "小舅舅", "小阿姨", "258", "翁蝦", "竹南", "新豐", "台灣大道", "呱", "英傑叔叔"];

const HEADERS = [
  "訂單編號",
  "建立時間",
  "狀態",
  "菜單日期",
  "姓名",
  "第一天明細",
  "第二天明細",
  "總金額",
  "備註",
  "原始資料"
];

function doGet(e) {
  const path = normalizePath(e);
  if (path === "/api/menu") {
    return jsonResponse({ days: MENU_BY_DAY, menu: MENU_BY_DAY[0].menu });
  }

  if (path === "/api/orders") {
    if (ADMIN_TOKEN && getParam(e, "token") !== ADMIN_TOKEN) {
      return jsonResponse({ error: "未授權讀取訂單。" }, 403);
    }
    return jsonResponse({ orders: readOrders() });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

function doPost(e) {
  const path = normalizePath(e);
  if (path !== "/api/orders") {
    return jsonResponse({ error: "Not found" }, 404);
  }

  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const result = validateAndBuildOrder(payload);
    if (result.error) {
      return jsonResponse({ error: result.error }, 400);
    }

    result.order.id = nextOrderId();
    appendOrder(result.order);
    return jsonResponse({ order: result.order }, 201);
  } catch (error) {
    return jsonResponse({ error: "訂單儲存失敗，請稍後再試。" }, 500);
  }
}

function normalizePath(e) {
  const pathInfo = e && e.pathInfo ? `/${e.pathInfo}` : "";
  return pathInfo || getParam(e, "path") || "/api/orders";
}

function getParam(e, key) {
  return e && e.parameter && e.parameter[key] ? String(e.parameter[key]) : "";
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  } else {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sheet;
}

function appendOrder(order) {
  const sheet = getSheet();
  const dayOneText = orderItemsText(order.items, "day1");
  const dayTwoText = orderItemsText(order.items, "day2");

  sheet.appendRow([
    order.id,
    order.createdAt,
    order.status,
    order.dayName,
    order.customerName,
    dayOneText,
    dayTwoText,
    order.total,
    order.note,
    JSON.stringify(order)
  ]);
}

function orderItemsText(items, dayId) {
  return items
    .filter((item) => item.dayId === dayId)
    .map((item) => `${item.name}${item.temperature ? `（${item.temperature}）` : ""} x ${item.quantity} = ${item.subtotal}`)
    .join("\n");
}

function orderNumberFromId(id) {
  const match = String(id || "").match(/^ORD-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function nextOrderId() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const maxOrderNumber = values
    .slice(1)
    .reduce((max, row) => Math.max(max, orderNumberFromId(row[0])), 0);
  return `ORD-${String(maxOrderNumber + 1).padStart(4, "0")}`;
}

function readOrders() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  return values.slice(1).filter((row) => row.some((cell) => cell !== "")).reverse().map((row) => {
    try {
      const rawJson = row[9] || row[8];
      if (rawJson) {
        return JSON.parse(rawJson);
      }
      throw new Error("Missing raw order data.");
    } catch (error) {
      return {
        id: row[0],
        createdAt: row[1],
        status: row[2],
        dayName: row[3],
        customerName: row[4],
        items: [],
        total: row[7],
        note: row[8]
      };
    }
  });
}

function validateAndBuildOrder(payload) {
  const customerName = normalizeText(payload.customerName);
  const note = normalizeText(payload.note);
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!CUSTOMER_NAMES.includes(customerName)) {
    return { error: "請選擇訂購人。" };
  }

  const orderItems = items
    .map((item) => {
      const day = MENU_BY_DAY.find((entry) => entry.menu.some((menuItem) => menuItem.id === item.id));
      const menuItem = day ? day.menu.find((entry) => entry.id === item.id) : null;
      const quantity = Number.parseInt(item.quantity, 10);
      const temperature = normalizeText(item.temperature);
      if (!menuItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return null;
      }

      if (["飲品", "飲料"].includes(menuItem.category) && !["冰", "熱"].includes(temperature)) {
        return null;
      }

      return {
        id: menuItem.id,
        name: menuItem.name,
        dayId: day.id,
        dayName: day.name,
        temperature: ["飲品", "飲料"].includes(menuItem.category) ? temperature : "",
        price: menuItem.price,
        quantity,
        subtotal: menuItem.price * quantity
      };
    })
    .filter(Boolean);

  if (orderItems.length === 0) {
    return { error: "請至少選擇一項餐點。" };
  }

  const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const selectedDays = [...new Map(orderItems.map((item) => [item.dayId, item.dayName])).entries()]
    .map(([id, name]) => ({ id, name }));

  return {
    order: {
      id: "",
      createdAt: new Date().toISOString(),
      status: "new",
      dayId: selectedDays.map((day) => day.id).join(","),
      dayName: selectedDays.map((day) => day.name).join("、"),
      customerName,
      note,
      items: orderItems,
      total
    }
  };
}

function normalizeText(value) {
  return String(value || "").trim();
}
