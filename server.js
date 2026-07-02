const http = require("http"); 
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

const MENU = [
  { id: "chicken-rice", name: "香煎雞腿飯", category: "主餐", price: 140, description: "雞腿排、溫蔬菜、白飯" },
  { id: "pork-noodle", name: "蔥燒豬肉拌麵", category: "主餐", price: 120, description: "豬五花、青蔥、手工麵" },
  { id: "veggie-bowl", name: "季節蔬食碗", category: "主餐", price: 115, description: "豆腐、時蔬、穀物飯" },
  { id: "fried-tofu", name: "酥炸豆腐", category: "小點", price: 65, description: "外酥內嫩，附椒鹽" },
  { id: "sweet-potato", name: "梅粉地瓜條", category: "小點", price: 55, description: "宜蘭風味甜鹹小點" },
  { id: "black-tea", name: "古早味紅茶", category: "飲品", price: 35, description: "固定微糖去冰" },
  { id: "lemon-tea", name: "檸檬青茶", category: "飲品", price: 45, description: "清爽茶香與檸檬酸甜" }
];

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
      id: crypto.randomUUID(),
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

async function handleCreateOrder(req, res) {
  try {
    const payload = await readJsonBody(req);
    const result = validateAndBuildOrder(payload);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }

    const orders = JSON.parse(await fs.readFile(ORDERS_FILE, "utf8"));
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
    sendJson(res, 200, { menu: MENU });
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
