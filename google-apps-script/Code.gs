const SHEET_NAME = "Orders";
const ADMIN_TOKEN = "";

const MENU = [
  { id: "chicken-rice", name: "香煎雞腿飯", category: "主餐", price: 140, description: "雞腿排、溫蔬菜、白飯" },
  { id: "pork-noodle", name: "蔥燒豬肉拌麵", category: "主餐", price: 120, description: "豬五花、青蔥、手工麵" },
  { id: "veggie-bowl", name: "季節蔬食碗", category: "主餐", price: 115, description: "豆腐、時蔬、穀物飯" },
  { id: "fried-tofu", name: "酥炸豆腐", category: "小點", price: 65, description: "外酥內嫩，附椒鹽" },
  { id: "sweet-potato", name: "梅粉地瓜條", category: "小點", price: 55, description: "宜蘭風味甜鹹小點" },
  { id: "black-tea", name: "古早味紅茶", category: "飲品", price: 35, description: "固定微糖去冰" },
  { id: "lemon-tea", name: "檸檬青茶", category: "飲品", price: 45, description: "清爽茶香與檸檬酸甜" }
];

const HEADERS = [
  "訂單編號",
  "建立時間",
  "狀態",
  "姓名",
  "電話",
  "取餐時間",
  "餐點明細",
  "總金額",
  "備註",
  "原始資料"
];

function doGet(e) {
  const path = normalizePath(e);
  if (path === "/api/menu") {
    return jsonResponse({ menu: MENU });
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
  }

  return sheet;
}

function appendOrder(order) {
  const sheet = getSheet();
  const itemText = order.items
    .map((item) => `${item.name} x ${item.quantity} = ${item.subtotal}`)
    .join("\n");

  sheet.appendRow([
    order.id,
    order.createdAt,
    order.status,
    order.customerName,
    order.phone,
    order.pickupTime,
    itemText,
    order.total,
    order.note,
    JSON.stringify(order)
  ]);
}

function readOrders() {
  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  return values.slice(1).reverse().map((row) => {
    try {
      return JSON.parse(row[9]);
    } catch (error) {
      return {
        id: row[0],
        createdAt: row[1],
        status: row[2],
        customerName: row[3],
        phone: row[4],
        pickupTime: row[5],
        items: [],
        total: row[7],
        note: row[8]
      };
    }
  });
}

function validateAndBuildOrder(payload) {
  const customerName = normalizeText(payload.customerName);
  const phone = normalizeText(payload.phone);
  const pickupTime = normalizeText(payload.pickupTime);
  const note = normalizeText(payload.note);
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (!customerName || !phone || !pickupTime) {
    return { error: "請填寫姓名、電話與取餐時間。" };
  }

  const orderItems = items
    .map((item) => {
      const menuItem = MENU.find((entry) => entry.id === item.id);
      const quantity = Number.parseInt(item.quantity, 10);
      if (!menuItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return null;
      }

      return {
        id: menuItem.id,
        name: menuItem.name,
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

  return {
    order: {
      id: Utilities.getUuid(),
      createdAt: new Date().toISOString(),
      status: "new",
      customerName,
      phone,
      pickupTime,
      note,
      items: orderItems,
      total
    }
  };
}

function normalizeText(value) {
  return String(value || "").trim();
}
