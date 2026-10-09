const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const tokens = new Set();

const load = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const save = (db) => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const admin = (req, res, next) =>
  tokens.has(req.get('x-admin-token')) ? next() : res.status(401).json({ error: 'Admin login required' });

// ---------- Products (public) ----------
app.get('/api/products', (req, res) => res.json(load().products));
app.get('/api/products/:id', (req, res) => {
  const p = load().products.find((x) => x.id === +req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
});

// ---------- Admin ----------
app.post('/api/admin/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const token = crypto.randomBytes(24).toString('hex');
  tokens.add(token);
  res.json({ token });
});

const clean = (b) => ({
  name: String(b.name || '').trim(),
  price: Number(b.price),
  stock: parseInt(b.stock, 10),
  emoji: String(b.emoji || '📦').trim(),
  category: String(b.category || 'General').trim(),
  description: String(b.description || '').trim(),
});
const invalid = (p) => !p.name || !(p.price >= 0) || !(p.stock >= 0);

app.post('/api/products', admin, (req, res) => {
  const p = clean(req.body);
  if (invalid(p)) return res.status(400).json({ error: 'Name, price and stock are required' });
  const db = load();
  p.id = db.nextProductId++;
  db.products.push(p);
  save(db);
  res.status(201).json(p);
});
app.put('/api/products/:id', admin, (req, res) => {
  const db = load();
  const i = db.products.findIndex((x) => x.id === +req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Product not found' });
  const p = clean(req.body);
  if (invalid(p)) return res.status(400).json({ error: 'Name, price and stock are required' });
  db.products[i] = { ...p, id: db.products[i].id };
  save(db);
  res.json(db.products[i]);
});
app.delete('/api/products/:id', admin, (req, res) => {
  const db = load();
  db.products = db.products.filter((x) => x.id !== +req.params.id);
  save(db);
  res.json({ ok: true });
});
app.get('/api/admin/orders', admin, (req, res) => res.json(load().orders.slice().reverse()));
app.put('/api/admin/orders/:id', admin, (req, res) => {
  const db = load();
  const o = db.orders.find((x) => x.id === +req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (!['Pending', 'Shipped', 'Delivered', 'Cancelled'].includes(req.body.status))
    return res.status(400).json({ error: 'Invalid status' });
  o.status = req.body.status;
  save(db);
  res.json(o);
});

// ---------- Orders (customers) ----------
app.post('/api/orders', (req, res) => {
  const { customer = {}, items = [] } = req.body;
  if (!customer.name || !customer.email || !customer.address)
    return res.status(400).json({ error: 'Name, email and address are required' });
  if (!items.length) return res.status(400).json({ error: 'Your cart is empty' });
  const db = load();
  const lines = [];
  for (const it of items) {
    const p = db.products.find((x) => x.id === +it.id);
    const qty = parseInt(it.qty, 10);
    if (!p || !(qty > 0)) return res.status(400).json({ error: 'Invalid item in cart' });
    if (p.stock < qty) return res.status(400).json({ error: `Only ${p.stock} left of ${p.name}` });
    lines.push({ id: p.id, name: p.name, price: p.price, qty });
  }
  lines.forEach((l) => (db.products.find((p) => p.id === l.id).stock -= l.qty));
  const order = {
    id: db.nextOrderId++,
    customer: { name: customer.name, email: customer.email.toLowerCase(), address: customer.address },
    items: lines,
    total: +lines.reduce((s, l) => s + l.price * l.qty, 0).toFixed(2),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  db.orders.push(order);
  save(db);
  res.status(201).json(order);
});
app.get('/api/orders', (req, res) => {
  const email = String(req.query.email || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required' });
  res.json(load().orders.filter((o) => o.customer.email === email).reverse());
});

app.listen(PORT, () => console.log(`ShopNest running at http://localhost:${PORT}`));
