# 🍻 Bar Tab Manager

A simple and responsive web API to manage bar tabs, drinks, payments, and users.  
Built with **Node.js**, **Express**, and **MongoDB**.

---

## 📁 Project Structure

```
bar-tab-manager/
├── models/         # Mongoose schemas (User, Customer, Transaction)
├── routes/         # Express route handlers
├── middleware/     # JWT and role-based authentication
├── .env            # Environment variables
├── index.js        # App entry point
├── package.json    # NPM metadata
└── README.md       # You’re here
```

---

## ⚙️ Requirements

- Node.js (v18+ recommended)
- MongoDB (local or cloud)
- Postman or frontend (optional)

---

## 🚀 Installation

1. **Clone or Download**
   ```bash
   git clone https://github.com/yourusername/bar-tab-manager.git
   cd bar-tab-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up `.env`**

   Create a `.env` file:
   ```
   JWT_SECRET=supersecretkey
   JWT_EXPIRES_IN=1d
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/bar-tab-manager
   ```

4. **Run the app**
   ```bash
   node index.js
   ```

---

## 🔐 Authentication

- All routes are protected.
- Use `/api/auth/login` to obtain a JWT token.
- Add the token to each request header:

```
Authorization: Bearer YOUR_TOKEN
```

---

## 👥 Roles

- **admin**: Can create users, change prices, manage customers
- **worker**: Can only adjust balances (add drinks/payments)

---

## 📦 API Endpoints

| Method | Route                     | Description                   | Auth Required |
|--------|---------------------------|-------------------------------|---------------|
| POST   | `/api/auth/login`         | Login and get token           | ❌            |
| POST   | `/api/users`              | Create new user (admin)       | ✅ admin      |
| GET    | `/api/users`              | Get all users (admin)         | ✅ admin      |
| POST   | `/api/customers`          | Add new customer              | ✅            |
| GET    | `/api/customers`          | List all customers            | ✅            |
| DELETE | `/api/customers/:id`      | Delete a customer             | ✅            |
| POST   | `/api/transactions`       | Add drink/payment             | ✅            |
| GET    | `/api/transactions`       | List transactions             | ✅            |

---

## 💡 License

MIT — use it, break it, remix it.

---

## 👑 Made by Mustapha “Musse” Ben Messaoud


