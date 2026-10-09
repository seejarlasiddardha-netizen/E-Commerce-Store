# E-Commerce-Store
Full-stack E-Commerce Store.
# ShopNest

A full-stack e-commerce web app built with **Node.js** and **Express.js** for a hackathon. Customers can browse products, fill a cart and place orders. An admin can manage products and update order status.

No database setup is needed. Data is stored in a JSON file, so the project runs with two commands.

## Features

**Customer**
- Product catalog with search and category filter
- Shopping cart with quantity controls (saved in the browser)
- Checkout with name, email and delivery address
- Stock is checked and reduced when an order is placed
- Order totals are calculated on the server
- "My orders" page to look up orders by email

**Admin**
- Password-protected admin panel
- Add, edit and delete products
- View all orders
- Update order status: Pending, Shipped, Delivered, Cancelled

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Frontend | HTML, CSS, vanilla JavaScript |
| Storage | JSON file (`data/db.json`) |

## Getting Started

### Requirements
- [Node.js](https://nodejs.org) 18 or newer

### Install and run

```bash
git clone https://github.com/YOUR-USERNAME/shopnest.git
cd shopnest
npm install
npm start
```

Open **http://localhost:3000** in your browser.

### Admin access

Click **Admin** in the menu and log in with the default password:

```
admin123
```

Set your own password before sharing the site:

```bash
# macOS / Linux
ADMIN_PASSWORD=mysecret npm start

# Windows PowerShell
$env:ADMIN_PASSWORD="mysecret"; npm start
```

### Change the port

```bash
PORT=5000 npm start
```

## Project Structure

```
shopnest/
├── server.js        # Express API and static file hosting
├── package.json
├── data/
│   └── db.json      # Products and orders
└── public/
    ├── index.html   # Page shell
    ├── app.js       # Shop, cart, orders and admin views
    └── style.css    # Styles (light and dark mode)
```

## API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | Public | List products |
| GET | `/api/products/:id` | Public | Get one product |
| POST | `/api/orders` | Public | Place an order |
| GET | `/api/orders?email=` | Public | List orders for an email |
| POST | `/api/admin/login` | Public | Get an admin token |
| POST | `/api/products` | Admin | Create a product |
| PUT | `/api/products/:id` | Admin | Update a product |
| DELETE | `/api/products/:id` | Admin | Delete a product |
| GET | `/api/admin/orders` | Admin | List all orders |
| PUT | `/api/admin/orders/:id` | Admin | Update order status |

Admin requests send the token in an `x-admin-token` header.

### Example: place an order

```json
POST /api/orders
{
  "customer": { "name": "Asha", "email": "asha@example.com", "address": "12 Main St" },
  "items": [{ "id": 1, "qty": 2 }]
}
```

## Limitations

- Products use emoji instead of uploaded images
- No payment gateway (orders are placed without payment)
- Customers don't have accounts; orders are found by email
- JSON file storage suits demos, not heavy production traffic

## Ideas for Next Steps

- Product image uploads
- Customer accounts and login
- Payment integration (Stripe or Razorpay)
- Move storage to MongoDB or PostgreSQL
- Order confirmation emails

## License

MIT
