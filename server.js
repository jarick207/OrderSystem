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
	categoryTabs: ["漢堡", "吐司", "蛋餅", "飲料"],
    menu: [
      { id: "day1-pork-burger", name: "豬肉蛋漢堡", category: "漢堡", price: 50, description: "" },
      { id: "day1-pork-toast", name: "豬肉蛋吐司", category: "吐司", price: 45, description: "" },
      { id: "day1-ham-toast", name: "火腿蛋吐司", category: "吐司", price: 40, description: "" },
      { id: "day1-corn-toast", name: "玉米蛋吐司", category: "吐司", price: 40, description: "蛋奶素" },
      { id: "day1-corn-eggroll", name: "玉米蛋餅", category: "蛋餅", price: 40, description: "蛋奶素" },
      { id: "day1-black-tea", name: "紅茶", category: "飲料", price: 20, description: "" },
	  { id: "day1-milk-tea", name: "奶茶", category: "飲料", price: 25, description: "" },
	  { id: "day1-soy-milk", name: "豆漿", category: "飲料", price: 20, description: "" },
	  { id: "day1-orange-juice", name: "柳橙汁", category: "飲料", price: 25, description: "" }

    ]
  },
  {
    id: "day2",
    name: "第二天",
    categoryTabs: ["漢堡", "吐司", "蛋餅", "抓餅", "鐵板麵", "點心", "厚片吐司", "薄片吐司", "飲料"],
    menu: [
      { id: "day2-karaage-chicken-burger", name: "卡拉雞腿堡", category: "漢堡", price: 70, description: "" },
      { id: "day2-roasted-chicken-burger", name: "香烤雞腿堡", category: "漢堡", price: 70, description: "" },
      { id: "day2-cheese-pork-burger", name: "起司豬排堡", category: "漢堡", price: 65, description: "" },
      { id: "day2-pepper-pork-burger", name: "黑胡椒豬排堡", category: "漢堡", price: 55, description: "" },
      { id: "day2-smoked-chicken-burger", name: "燻雞堡", category: "漢堡", price: 50, description: "" },
      { id: "day2-squid-burger", name: "花枝堡", category: "漢堡", price: 50, description: "" },
      { id: "day2-tuna-burger", name: "鮪魚堡", category: "漢堡", price: 50, description: "" },
      { id: "day2-shrimp-burger", name: "鮮蝦堡", category: "漢堡", price: 50, description: "" },
      { id: "day2-hash-brown-burger", name: "薯餅堡", category: "漢堡", price: 50, description: "蛋奶素" },
      { id: "day2-chicken-burger", name: "香雞堡", category: "漢堡", price: 50, description: "" },
      { id: "day2-bacon-burger", name: "田園培根堡", category: "漢堡", price: 50, description: "" },
      { id: "day2-plain-burger", name: "漢堡", category: "漢堡", price: 45, description: "" },
      { id: "day2-pork-floss-burger", name: "肉鬆堡", category: "漢堡", price: 45, description: "" },
      { id: "day2-vegetarian-egg-burger", name: "素蛋堡", category: "漢堡", price: 35, description: "蛋奶素" },
      { id: "day2-karaage-chicken-toast", name: "卡拉雞腿吐司", category: "吐司", price: 70, description: "" },
      { id: "day2-roasted-chicken-toast", name: "香烤雞腿吐司", category: "吐司", price: 70, description: "" },
      { id: "day2-club-toast", name: "總匯吐司", category: "吐司", price: 65, description: "" },
      { id: "day2-pepper-pork-toast", name: "黑胡椒豬排吐司", category: "吐司", price: 50, description: "" },
      { id: "day2-smoked-chicken-toast", name: "燻雞吐司", category: "吐司", price: 45, description: "" },
      { id: "day2-squid-toast", name: "花枝吐司", category: "吐司", price: 45, description: "" },
      { id: "day2-tuna-toast", name: "鮪魚吐司", category: "吐司", price: 45, description: "" },
      { id: "day2-chicken-toast", name: "香雞吐司", category: "吐司", price: 45, description: "" },
      { id: "day2-pork-toast", name: "豬肉吐司", category: "吐司", price: 45, description: "" },
      { id: "day2-bacon-toast", name: "培根吐司", category: "吐司", price: 40, description: "" },
      { id: "day2-pork-floss-toast", name: "肉鬆吐司", category: "吐司", price: 35, description: "" },
      { id: "day2-ham-toast", name: "火腿吐司", category: "吐司", price: 30, description: "" },
      { id: "day2-corn-toast", name: "玉米吐司", category: "吐司", price: 30, description: "蛋奶素" },
      { id: "day2-cheese-toast", name: "起士吐司", category: "吐司", price: 30, description: "蛋奶素" },
      { id: "day2-fried-egg-toast", name: "煎蛋吐司", category: "吐司", price: 25, description: "蛋奶素" },
      { id: "day2-karaage-chicken-egg-pancake", name: "卡拉雞腿蛋餅", category: "蛋餅", price: 70, description: "" },
      { id: "day2-pepper-pork-egg-pancake", name: "黑胡椒豬排蛋餅", category: "蛋餅", price: 50, description: "" },
      { id: "day2-smoked-chicken-egg-pancake", name: "燻雞蛋餅", category: "蛋餅", price: 45, description: "" },
      { id: "day2-tuna-egg-pancake", name: "鮪魚蛋餅", category: "蛋餅", price: 45, description: "" },
      { id: "day2-chicken-egg-pancake", name: "香雞蛋餅", category: "蛋餅", price: 45, description: "" },
      { id: "day2-hash-brown-egg-pancake", name: "薯餅蛋餅", category: "蛋餅", price: 45, description: "蛋奶素" },
      { id: "day2-pork-egg-pancake", name: "豬肉蛋餅", category: "蛋餅", price: 40, description: "" },
      { id: "day2-bacon-egg-pancake", name: "培根蛋餅", category: "蛋餅", price: 40, description: "" },
      { id: "day2-hot-dog-egg-pancake", name: "熱狗蛋餅", category: "蛋餅", price: 35, description: "" },
      { id: "day2-pork-floss-egg-pancake", name: "肉鬆蛋餅", category: "蛋餅", price: 35, description: "" },
      { id: "day2-cheese-egg-pancake", name: "起士蛋餅", category: "蛋餅", price: 30, description: "蛋奶素" },
      { id: "day2-ham-egg-pancake", name: "火腿蛋餅", category: "蛋餅", price: 30, description: "" },
      { id: "day2-corn-egg-pancake", name: "玉米蛋餅", category: "蛋餅", price: 30, description: "蛋奶素" },
      { id: "day2-plain-egg-pancake", name: "原味蛋餅", category: "蛋餅", price: 25, description: "蛋奶素" },
      { id: "day2-scallion-pork-pancake", name: "蔥肉拉餅", category: "抓餅", price: 35, description: "" },
      { id: "day2-sweet-potato-pancake", name: "地瓜拉餅", category: "抓餅", price: 35, description: "" },
      { id: "day2-plain-pancake", name: "原味抓餅", category: "抓餅", price: 35, description: "" },
      { id: "day2-jade-pancake", name: "翡翠抓餅", category: "抓餅", price: 35, description: "" },
      { id: "day2-scallion-pancake", name: "蔥油餅", category: "抓餅", price: 35, description: "" },
      { id: "day2-pancake-add-egg", name: "抓餅加蛋", category: "抓餅", price: 15, description: "" },
      { id: "day2-pepper-noodle", name: "黑胡椒麵", category: "鐵板麵", price: 45, description: "" },
      { id: "day2-mushroom-noodle", name: "蘑菇麵", category: "鐵板麵", price: 45, description: "" },
      { id: "day2-noodle-add-egg", name: "鐵板麵加蛋", category: "鐵板麵", price: 15, description: "" },
      { id: "day2-radish-cake", name: "蘿蔔糕", category: "點心", price: 40, description: "" },
      { id: "day2-chicken-nuggets", name: "小雞塊", category: "點心", price: 35, description: "" },
      { id: "day2-fries", name: "薯條", category: "點心", price: 30, description: "" },
      { id: "day2-hot-dog-egg-roll", name: "熱狗滾蛋", category: "點心", price: 30, description: "" },
      { id: "day2-dumplings", name: "煎餃", category: "點心", price: 30, description: "" },
      { id: "day2-hash-brown", name: "薯餅", category: "點心", price: 20, description: "蛋奶素" },
      { id: "day2-hot-dog", name: "熱狗", category: "點心", price: 20, description: "" },
      { id: "day2-fried-egg", name: "荷包蛋", category: "點心", price: 15, description: "蛋奶素" },
      { id: "day2-peanut-thick-toast", name: "花生厚片", category: "厚片吐司", price: 25, description: "" },
      { id: "day2-peanut-thin-toast", name: "花生薄片", category: "薄片吐司", price: 15, description: "" },
      { id: "day2-garlic-thick-toast", name: "蒜香厚片", category: "厚片吐司", price: 25, description: "" },
      { id: "day2-garlic-thin-toast", name: "蒜香薄片", category: "薄片吐司", price: 15, description: "" },
      { id: "day2-strawberry-thick-toast", name: "草莓厚片", category: "厚片吐司", price: 25, description: "" },
      { id: "day2-strawberry-thin-toast", name: "草莓薄片", category: "薄片吐司", price: 15, description: "" },
      { id: "day2-blueberry-thick-toast", name: "藍莓厚片", category: "厚片吐司", price: 25, description: "" },
      { id: "day2-blueberry-thin-toast", name: "藍莓薄片", category: "薄片吐司", price: 15, description: "" },
      { id: "day2-chocolate-thick-toast", name: "巧克力厚片", category: "厚片吐司", price: 25, description: "" },
      { id: "day2-chocolate-thin-toast", name: "巧克力薄片", category: "薄片吐司", price: 15, description: "" },
      { id: "day2-coconut-thick-toast", name: "椰香厚片", category: "厚片吐司", price: 25, description: "" },
      { id: "day2-coconut-thin-toast", name: "椰香薄片", category: "薄片吐司", price: 15, description: "" },
      { id: "day2-americano-large", name: "美式咖啡 大", category: "飲料", price: 35, description: "" },
      { id: "day2-americano-medium", name: "美式咖啡 中", category: "飲料", price: 30, description: "" },
      { id: "day2-americano-small", name: "美式咖啡 小", category: "飲料", price: 25, description: "" },
      { id: "day2-latte-large", name: "拿鐵 大", category: "飲料", price: 35, description: "" },
      { id: "day2-latte-medium", name: "拿鐵 中", category: "飲料", price: 30, description: "" },
      { id: "day2-latte-small", name: "拿鐵 小", category: "飲料", price: 25, description: "" },
      { id: "day2-unsweetened-soy-milk-large", name: "無糖豆漿 大", category: "飲料", price: 20, description: "" },
      { id: "day2-unsweetened-soy-milk-medium", name: "無糖豆漿 中", category: "飲料", price: 15, description: "" },
      { id: "day2-unsweetened-soy-milk-small", name: "無糖豆漿 小", category: "飲料", price: 10, description: "" },
      { id: "day2-soy-milk-large", name: "豆漿 大", category: "飲料", price: 20, description: "" },
      { id: "day2-soy-milk-medium", name: "豆漿 中", category: "飲料", price: 15, description: "" },
      { id: "day2-soy-milk-small", name: "豆漿 小", category: "飲料", price: 10, description: "" },
      { id: "day2-black-tea-large", name: "紅茶 大", category: "飲料", price: 20, description: "" },
      { id: "day2-black-tea-medium", name: "紅茶 中", category: "飲料", price: 15, description: "" },
      { id: "day2-black-tea-small", name: "紅茶 小", category: "飲料", price: 10, description: "" },
      { id: "day2-milk-tea-large", name: "奶茶 大", category: "飲料", price: 20, description: "" },
      { id: "day2-milk-tea-medium", name: "奶茶 中", category: "飲料", price: 15, description: "" },
      { id: "day2-milk-tea-small", name: "奶茶 小", category: "飲料", price: 10, description: "" },
      { id: "day2-orange-juice-large", name: "柳橙汁 大", category: "飲料", price: 30, description: "" },
      { id: "day2-orange-juice-medium", name: "柳橙汁 中", category: "飲料", price: 25, description: "" },
      { id: "day2-orange-juice-small", name: "柳橙汁 小", category: "飲料", price: 20, description: "" },
      { id: "day2-passion-fruit-juice-large", name: "百香果汁 大", category: "飲料", price: 30, description: "" },
      { id: "day2-passion-fruit-juice-medium", name: "百香果汁 中", category: "飲料", price: 25, description: "" },
      { id: "day2-passion-fruit-juice-small", name: "百香果汁 小", category: "飲料", price: 20, description: "" }
    ]
  }
];

const CUSTOMER_NAMES = ["大舅舅", "小舅舅", "小阿姨", "258", "翁蝦", "竹南", "新豐", "台灣大道", "呱", "英傑叔叔"];
const ADD_EGG_CATEGORIES = ["漢堡", "吐司", "抓餅", "鐵板麵"];
const ADD_EGG_PRICE = 15;

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

function canAddEgg(menuItem) {
  return ADD_EGG_CATEGORIES.includes(menuItem.category) && !menuItem.id.endsWith("-add-egg");
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
      const addEgg = item.addEgg === true || item.addEgg === "true";
      if (!menuItem || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return null;
      }

      if (["飲品", "飲料"].includes(menuItem.category) && !["冰", "熱"].includes(temperature)) {
        return null;
      }

      if (addEgg && !canAddEgg(menuItem)) {
        return null;
      }

      const price = menuItem.price + (addEgg ? ADD_EGG_PRICE : 0);

      return {
        id: menuItem.id,
        name: menuItem.name,
        dayId: day.id,
        dayName: day.name,
        temperature: ["飲品", "飲料"].includes(menuItem.category) ? temperature : "",
        addEgg,
        price,
        quantity,
        subtotal: price * quantity
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
