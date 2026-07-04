const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

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

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function ensureOrdersFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, "[]\n", "utf8");
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 1024 * 1024) {
      throw new Error("Request body is too large.");
    }
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function normalizeText(value) {
  return String(value || "").trim();
}

function orderNumberFromId(id) {
  const match = String(id || "").match(/^ORD-(\d+)$/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function nextOrderId(orders) {
  const maxOrderNumber = orders.reduce((max, order) => Math.max(max, orderNumberFromId(order.id)), 0);
  return `ORD-${String(maxOrderNumber + 1).padStart(4, "0")}`;
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

async function handleCreateOrder(req, res) {
  try {
    const payload = await readJsonBody(req);
    const result = validateAndBuildOrder(payload);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    const orders = JSON.parse(await fs.readFile(ORDERS_FILE, "utf8"));
    result.order.id = nextOrderId(orders);
    orders.unshift(result.order);
    await fs.writeFile(ORDERS_FILE, `${JSON.stringify(orders, null, 2)}\n`, "utf8");

    sendJson(res, 201, { order: result.order });
  } catch (error) {
    sendJson(res, 500, { error: "訂單儲存失敗，請稍後再試。" });
  }
}

async function serveStatic(req, res) {
  const requestPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const safePath = requestPath === "/" ? "/index.html" : decodeURIComponent(requestPath);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

async function handleRequest(req, res) {
  if (req.url === "/api/menu" && req.method === "GET") {
    sendJson(res, 200, { days: MENU_BY_DAY, menu: MENU_BY_DAY[0].menu });
    return;
  }

  if (req.url === "/api/orders" && req.method === "GET") {
    const orders = JSON.parse(await fs.readFile(ORDERS_FILE, "utf8"));
    sendJson(res, 200, { orders });
    return;
  }

  if (req.url === "/api/orders" && req.method === "POST") {
    await handleCreateOrder(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

ensureOrdersFile().then(() => {
  http.createServer(handleRequest).listen(PORT, () => {
    console.log(`Order system is running at http://localhost:${PORT}`);
  });
});
