# Mini ERP + CRM Operations Portal

A full-stack Mini ERP/CRM system designed for wholesale and distribution operations, featuring authentication, role-based access, inventory management, customer tracking, sales challans with automatic stock reduction, and real-time stock movement logging.

---

## 🚀 Tech Stack

- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Authentication:** JWT (JSON Web Tokens) with Password Hashing (bcryptjs)

---

## 👥 Test Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `password123` |
| **Sales** | `sales@example.com` | `password123` |
| **Warehouse** | `warehouse@example.com` | `password123` |
| **Accounts** | `accounts@example.com` | `password123` |

---

## 🛠️ Features Implemented

1. **Authentication & Roles:** Role-based access for Admin, Sales, Warehouse, and Accounts users.
2. **Customer CRM Module:** Complete customer management including Business Name, Contact Info, GST Number, Address, Customer Type, Status, Follow-Up Date, Notes, and Search.
3. **Product & Inventory Module:** Product catalog, SKU tracking, pricing, location mapping, minimum stock alerts, and full **Stock Movement Logs (`IN`/`OUT`)**.
4. **Sales Challan Flow:** Auto-generated challan numbers, snapshot storage, draft/confirmed states, and **strict stock validation preventing negative inventory**.

---

## ⚙️ Local Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npx prisma generate
node dist/index.js

Backend runs on http://localhost:5000

2. Frontend Setup
cd frontend
npm install
npm run dev

Frontend runs on http://localhost:5173

🔑 Environment Variables
Create a .env file inside the backend/ directory:
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
JWT_SECRET="supersecretkey"
PORT=5000
