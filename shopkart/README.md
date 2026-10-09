# ShopNest – Express.js E-commerce (Hackathon Project)

Full-stack store built with **Node.js + Express**. No database setup needed (data is stored in `data/db.json`).

## Features
- Product catalog with search and category filter
- Shopping cart (add, change quantity, persisted in the browser)
- Checkout that creates orders and reduces stock (totals are calculated on the server)
- "My orders" lookup by email
- Admin panel: login, add / edit / delete products, view orders, update order status

## Run
```bash
npm install
npm start
```
Open http://localhost:3000

Admin: go to **Admin** in the menu. Default password `admin123`.
Change it with `ADMIN_PASSWORD=yourpass npm start` (Windows PowerShell: `$env:ADMIN_PASSWORD="yourpass"; npm start`).

## API
| Method | Route | Access |
|---|---|---|
| GET | /api/products, /api/products/:id | public |
| POST | /api/orders | public |
| GET | /api/orders?email= | public |
| POST | /api/admin/login | public |
| POST/PUT/DELETE | /api/products | admin |
| GET | /api/admin/orders | admin |
| PUT | /api/admin/orders/:id | admin |

## Structure
```
server.js        Express API + static hosting
data/db.json     Products and orders storage
public/          Frontend (index.html, app.js, style.css)
```

## Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit: ShopNest e-commerce"
git branch -M main
git remote add origin https://github.com/<your-username>/shopnest.git
git push -u origin main
```
