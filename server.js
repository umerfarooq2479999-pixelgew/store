const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const PAYMENT_INSTRUCTIONS = process.env.PAYMENT_INSTRUCTIONS ||
  "Contact EternalMC support for payment instructions.";

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]", { mode: 0o600 });

const PRODUCTS = [
  { id: "vip", name: "VIP Rank", price: 500, description: "Starter VIP perks. Configure the actual benefits before launch." },
  { id: "mvp", name: "MVP Rank", price: 1000, description: "Mid-tier rank. Configure the actual benefits before launch." },
  { id: "elite", name: "ELITE Rank", price: 2000, description: "Premium rank. Configure the actual benefits before launch." }
];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: null
    }
  }
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/orders", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")); }
  catch { return []; }
}
function writeOrders(orders) {
  const temp = ORDERS_FILE + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(orders, null, 2), { mode: 0o600 });
  fs.renameSync(temp, ORDERS_FILE);
}
function adminAuth(req, res, next) {
  if (!ADMIN_TOKEN || ADMIN_TOKEN === "REPLACE_WITH_A_LONG_RANDOM_SECRET") {
    return res.status(503).json({ error: "Admin is not configured. Set ADMIN_TOKEN in .env first." });
  }
  const supplied = req.get("x-admin-token") || "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_TOKEN);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/api/products", (_req, res) => res.json(PRODUCTS));
app.get("/api/payment-instructions", (_req, res) => res.json({ instructions: PAYMENT_INSTRUCTIONS }));

app.post("/api/orders", (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.body.productId);
  const player = String(req.body.minecraftUsername || "").trim();
  const contact = String(req.body.contact || "").trim();

  if (!product) return res.status(400).json({ error: "Choose a valid product." });
  if (!/^[A-Za-z0-9_]{3,16}$/.test(player)) {
    return res.status(400).json({ error: "Minecraft username must be 3–16 letters, numbers, or underscores." });
  }
  if (contact.length > 100) return res.status(400).json({ error: "Contact field is too long." });

  const order = {
    id: "EMC-" + crypto.randomBytes(4).toString("hex").toUpperCase(),
    productId: product.id,
    productName: product.name,
    amountPKR: product.price,
    minecraftUsername: player,
    contact,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);
  res.status(201).json({
    orderId: order.id,
    amountPKR: order.amountPKR,
    status: order.status,
    instructions: PAYMENT_INSTRUCTIONS,
    message: "Order created. Your order stays pending until an admin verifies payment."
  });
});

app.get("/api/admin/orders", adminAuth, (_req, res) => {
  res.json(readOrders());
});

app.post("/api/admin/orders/:id/mark-paid", adminAuth, (req, res) => {
  const orders = readOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  order.status = "paid_verified";
  order.verifiedAt = new Date().toISOString();
  writeOrders(orders);
  res.json({ message: "Payment marked verified. This starter does not automatically deliver Minecraft rewards.", order });
});

app.post("/api/admin/orders/:id/mark-rejected", adminAuth, (req, res) => {
  const orders = readOrders();
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  order.status = "rejected";
  order.rejectedAt = new Date().toISOString();
  writeOrders(orders);
  res.json({ message: "Order marked rejected.", order });
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`EternalMC Store listening on http://127.0.0.1:${PORT}`);
});
