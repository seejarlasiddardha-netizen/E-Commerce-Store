const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Number(n).toFixed(2);

let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '[]'); // [{id, qty}]
let adminToken = sessionStorage.getItem('adminToken') || '';
let adminTab = 'products';

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  $('#count').textContent = cart.reduce((s, i) => s + i.qty, 0);
}
const cartLines = () =>
  cart.map((i) => ({ ...i, p: products.find((p) => p.id === i.id) })).filter((l) => l.p);

function addToCart(id) {
  const p = products.find((x) => x.id === id);
  const line = cart.find((i) => i.id === id);
  if ((line ? line.qty : 0) >= p.stock) return toast('No more stock available');
  line ? line.qty++ : cart.push({ id, qty: 1 });
  saveCart();
  toast(p.name + ' added to cart');
}
function changeQty(id, d) {
  const line = cart.find((i) => i.id === id);
  const p = products.find((x) => x.id === id);
  line.qty = Math.min(line.qty + d, p.stock);
  if (line.qty <= 0) cart = cart.filter((i) => i.id !== id);
  saveCart();
  viewCart();
}

// ---------- Shop ----------
function viewShop() {
  const cats = ['All', ...new Set(products.map((p) => p.category))];
  app.innerHTML = `<h1>Everyday things, well made</h1><p class="sub">Browse the collection and add what you like to your cart.</p>
  <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">
    <input id="q" placeholder="Search products" style="max-width:280px">
    <select id="cat" style="max-width:180px">${cats.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
  <div class="grid" id="list"></div>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase(), c = $('#cat').value;
    const list = products.filter((p) => (c === 'All' || p.category === c) && p.name.toLowerCase().includes(q));
    $('#list').innerHTML = list.length ? list.map((p) => `<div class="card">
      <div class="pic">${esc(p.emoji)}</div><span class="muted">${esc(p.category)}</span>
      <h3>${esc(p.name)}</h3><span class="muted">${esc(p.description)}</span>
      <div class="row"><span><span class="price">${money(p.price)}</span><br><span class="muted">${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}</span></span>
      <button ${p.stock < 1 ? 'disabled' : ''} onclick="addToCart(${p.id})">Add to cart</button></div></div>`).join('')
      : '<div class="empty">No products match your search.</div>';
  };
  $('#q').oninput = draw; $('#cat').onchange = draw; draw();
}

// ---------- Cart & checkout ----------
function viewCart() {
  const lines = cartLines();
  if (!lines.length) return (app.innerHTML = '<h1>Your cart</h1><div class="empty">Your cart is empty. <a href="#/">Browse products</a></div>');
  const total = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  app.innerHTML = `<h1>Your cart</h1><div class="cols"><div class="wrap"><table>
    ${lines.map((l) => `<tr><td>${esc(l.p.emoji)} ${esc(l.p.name)}<br><span class="muted">${money(l.p.price)} each</span></td>
    <td><span class="qty"><button class="ghost" onclick="changeQty(${l.id},-1)">−</button>${l.qty}<button class="ghost" onclick="changeQty(${l.id},1)">+</button></span></td>
    <td>${money(l.p.price * l.qty)}</td></tr>`).join('')}
    <tr><td colspan="2"><b>Total</b></td><td><b>${money(total)}</b></td></tr></table></div>
    <form class="card" id="checkout"><h3>Checkout</h3>
    <label for="n">Full name</label><input id="n" required>
    <label for="e">Email</label><input id="e" type="email" required>
    <label for="a">Delivery address</label><textarea id="a" rows="3" required></textarea>
    <button style="margin-top:14px">Place order</button></form></div>`;
  $('#checkout').onsubmit = async (ev) => {
    ev.preventDefault();
    try {
      const o = await api('/api/orders', 'POST', {
        customer: { name: $('#n').value, email: $('#e').value, address: $('#a').value },
        items: cart,
      });
      cart = []; saveCart();
      localStorage.setItem('email', o.customer.email);
      app.innerHTML = `<h1>Thank you, ${esc(o.customer.name)}!</h1><p class="sub">Order #${o.id} for ${money(o.total)} is confirmed.</p><a class="btn" href="#/orders">View my orders</a>`;
      products = await api('/api/products');
    } catch (e) { toast(e.message); }
  };
}

// ---------- My orders ----------
const orderTable = (orders, isAdmin) => orders.length ? `<div class="wrap"><table>
  <tr><th>#</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
  ${orders.map((o) => `<tr><td>${o.id}<br><span class="muted">${new Date(o.createdAt).toLocaleDateString()}</span></td>
  <td>${esc(o.customer.name)}<br><span class="muted">${esc(o.customer.email)}</span></td>
  <td>${o.items.map((i) => `${i.qty} × ${esc(i.name)}`).join('<br>')}</td><td>${money(o.total)}</td>
  <td>${isAdmin ? `<select onchange="setStatus(${o.id},this.value)">${['Pending', 'Shipped', 'Delivered', 'Cancelled'].map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>` : `<span class="tag">${o.status}</span>`}</td></tr>`).join('')}
  </table></div>` : '<div class="empty">No orders found.</div>';

function viewOrders() {
  app.innerHTML = `<h1>My orders</h1><p class="sub">Enter the email you used at checkout.</p>
  <form id="f" style="display:flex;gap:10px;max-width:460px;margin-bottom:20px"><input id="em" type="email" required placeholder="you@example.com" value="${esc(localStorage.getItem('email') || '')}"><button>Find orders</button></form><div id="res"></div>`;
  const run = async () => {
    try { $('#res').innerHTML = orderTable(await api('/api/orders?email=' + encodeURIComponent($('#em').value)), false); }
    catch (e) { toast(e.message); }
  };
  $('#f').onsubmit = (e) => { e.preventDefault(); localStorage.setItem('email', $('#em').value); run(); };
  if ($('#em').value) run();
}

// ---------- Admin ----------
function viewAdmin() {
  if (!adminToken) {
    app.innerHTML = `<h1>Admin login</h1><p class="sub">Default password is <code>admin123</code> (set ADMIN_PASSWORD to change it).</p>
    <form id="f" style="display:flex;gap:10px;max-width:400px"><input id="pw" type="password" placeholder="Password" required><button>Log in</button></form>`;
    return ($('#f').onsubmit = async (e) => {
      e.preventDefault();
      try {
        adminToken = (await api('/api/admin/login', 'POST', { password: $('#pw').value })).token;
        sessionStorage.setItem('adminToken', adminToken); viewAdmin();
      } catch (er) { toast(er.message); }
    });
  }
  app.innerHTML = `<h1>Admin</h1><div class="tabs">
    <button class="${adminTab === 'products' ? 'on' : ''}" onclick="adminTab='products';viewAdmin()">Products</button>
    <button class="${adminTab === 'orders' ? 'on' : ''}" onclick="adminTab='orders';viewAdmin()">Orders</button>
    <button class="ghost" onclick="logout()">Log out</button></div><div id="panel"></div>`;
  adminTab === 'products' ? adminProducts() : adminOrders();
}
function logout() { adminToken = ''; sessionStorage.removeItem('adminToken'); viewAdmin(); }

async function adminOrders() {
  try { $('#panel').innerHTML = orderTable(await api('/api/admin/orders'), true); }
  catch (e) { logout(); toast(e.message); }
}
async function setStatus(id, status) {
  try { await api('/api/admin/orders/' + id, 'PUT', { status }); toast('Order #' + id + ' marked ' + status); }
  catch (e) { toast(e.message); }
}
function adminProducts(edit) {
  const p = edit ? products.find((x) => x.id === edit) : {};
  $('#panel').innerHTML = `<div class="cols"><div class="wrap"><table><tr><th>Product</th><th>Price</th><th>Stock</th><th></th></tr>
  ${products.map((x) => `<tr><td>${esc(x.emoji)} ${esc(x.name)}</td><td>${money(x.price)}</td><td>${x.stock}</td>
  <td style="white-space:nowrap"><button class="ghost" onclick="adminProducts(${x.id})">Edit</button> <button class="danger" onclick="delProduct(${x.id})">Delete</button></td></tr>`).join('')}</table></div>
  <form class="card" id="pf"><h3>${edit ? 'Edit product' : 'Add product'}</h3>
  <label>Name</label><input id="pn" required value="${esc(p.name)}">
  <label>Price</label><input id="pp" type="number" step="0.01" min="0" required value="${p.price ?? ''}">
  <label>Stock</label><input id="ps" type="number" min="0" required value="${p.stock ?? ''}">
  <label>Emoji icon</label><input id="pe" value="${esc(p.emoji || '📦')}">
  <label>Category</label><input id="pc" value="${esc(p.category || '')}">
  <label>Description</label><textarea id="pd" rows="2">${esc(p.description)}</textarea>
  <button style="margin-top:14px">${edit ? 'Save changes' : 'Add product'}</button>
  ${edit ? '<button type="button" class="ghost" style="margin-top:8px" onclick="adminProducts()">Cancel</button>' : ''}</form></div>`;
  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    const body = { name: $('#pn').value, price: $('#pp').value, stock: $('#ps').value, emoji: $('#pe').value, category: $('#pc').value, description: $('#pd').value };
    try {
      await api(edit ? '/api/products/' + edit : '/api/products', edit ? 'PUT' : 'POST', body);
      products = await api('/api/products'); toast(edit ? 'Saved' : 'Product added'); adminProducts();
    } catch (er) { toast(er.message); }
  };
}
async function delProduct(id) {
  if (!confirm('Delete this product?')) return;
  try { await api('/api/products/' + id, 'DELETE'); products = await api('/api/products'); adminProducts(); }
  catch (e) { toast(e.message); }
}

// ---------- Router ----------
async function route() {
  const r = location.hash.replace('#', '') || '/';
  if (r === '/' || r === '/cart') products = await api('/api/products');
  ({ '/': viewShop, '/cart': viewCart, '/orders': viewOrders, '/admin': viewAdmin }[r] || viewShop)();
}
window.addEventListener('hashchange', route);
(async () => { products = await api('/api/products'); saveCart(); route(); })();
