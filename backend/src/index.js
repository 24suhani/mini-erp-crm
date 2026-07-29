"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-123";
// Middleware: Authenticate Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Access token required" });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err)
            return res.status(403).json({ error: "Invalid or expired token" });
        req.user = user;
        next();
    });
};
// Middleware: Role Check
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
        }
        next();
    };
};
// ==========================================
// 1. AUTH ROUTES
// ==========================================
// Register User
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser)
            return res.status(400).json({ error: "User already exists" });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: role || "SALES" },
        });
        res.status(201).json({ message: "User registered successfully", userId: user.id });
    }
    catch (error) {
        res.status(500).json({ error: "Registration failed", details: error });
    }
});
// Login User
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(400).json({ error: "Invalid email or password" });
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword)
            return res.status(400).json({ error: "Invalid email or password" });
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});
// ==========================================
// 2. PRODUCT & INVENTORY ROUTES
// ==========================================
// Get All Products
app.get("/api/products", authenticateToken, async (req, res) => {
    try {
        const products = await prisma.product.findMany();
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});
// Add Product
app.post("/api/products", authenticateToken, requireRole(["ADMIN", "WAREHOUSE"]), async (req, res) => {
    try {
        const { name, sku, category, unitPrice, currentStock, minStockAlert, location } = req.body;
        const product = await prisma.product.create({
            data: { name, sku, category, unitPrice, currentStock, minStockAlert, location },
        });
        res.status(201).json(product);
    }
    catch (error) {
        res.status(400).json({ error: "Could not create product", details: error });
    }
});
// Log Stock Movement (Stock IN / Stock OUT)
app.post("/api/inventory/movement", authenticateToken, requireRole(["ADMIN", "WAREHOUSE"]), async (req, res) => {
    try {
        const { productId, quantity, type, reason } = req.body; // type: 'IN' | 'OUT'
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            return res.status(404).json({ error: "Product not found" });
        const newStock = type === "IN" ? product.currentStock + quantity : product.currentStock - quantity;
        if (newStock < 0)
            return res.status(400).json({ error: "Insufficient stock level" });
        const [movement, updatedProduct] = await prisma.$transaction([
            prisma.stockMovement.create({
                data: {
                    productId,
                    quantity,
                    type,
                    reason,
                    createdBy: req.user?.id || "SYSTEM",
                },
            }),
            prisma.product.update({
                where: { id: productId },
                data: { currentStock: newStock },
            }),
        ]);
        res.status(201).json({ movement, updatedProduct });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to process stock movement" });
    }
});
// ==========================================
// 3. CUSTOMER MANAGEMENT ROUTES
// ==========================================
// Get Customers
app.get("/api/customers", authenticateToken, async (req, res) => {
    try {
        const customers = await prisma.customer.findMany();
        res.json(customers);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch customers" });
    }
});
// Add Customer Lead
app.post("/api/customers", authenticateToken, async (req, res) => {
    try {
        const { name, mobile, email, businessName, gstNumber, type, notes } = req.body;
        const customer = await prisma.customer.create({
            data: { name, mobile, email, businessName, gstNumber, type, notes },
        });
        res.status(201).json(customer);
    }
    catch (error) {
        res.status(400).json({ error: "Failed to create customer" });
    }
});
// Update Customer Status
app.patch("/api/customers/:id/status", authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, followUpDate } = req.body;
        const customer = await prisma.customer.update({
            where: { id },
            data: { status, followUpDate: followUpDate ? new Date(followUpDate) : undefined },
        });
        res.json(customer);
    }
    catch (error) {
        res.status(400).json({ error: "Failed to update status" });
    }
});
// ==========================================
// 4. SALES CHALLAN ROUTES
// ==========================================
// Create Sales Challan
app.post("/api/challans", authenticateToken, requireRole(["ADMIN", "SALES"]), async (req, res) => {
    try {
        const { customerId, items } = req.body; // items: [{ productId, quantity }]
        let totalQuantity = 0;
        const challanItemsData = [];
        for (const item of items) {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            if (!product)
                return res.status(404).json({ error: `Product ID ${item.productId} not found` });
            if (product.currentStock < item.quantity) {
                return res.status(400).json({ error: `Not enough stock for ${product.name}` });
            }
            totalQuantity += item.quantity;
            challanItemsData.push({
                productId: product.id,
                productName: product.name,
                unitPrice: product.unitPrice,
                quantity: item.quantity,
            });
        }
        const challanNumber = `CH-${Date.now().toString().slice(-6)}`;
        const challan = await prisma.salesChallan.create({
            data: {
                challanNumber,
                customerId,
                totalQuantity,
                createdBy: req.user?.id || "SYSTEM",
                items: {
                    create: challanItemsData,
                },
            },
            include: { items: true },
        });
        res.status(201).json(challan);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create Sales Challan", details: error });
    }
});
// Get All Challans
app.get("/api/challans", authenticateToken, async (req, res) => {
    try {
        const challans = await prisma.salesChallan.findMany({
            include: { customer: true, items: true },
        });
        res.json(challans);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch challans" });
    }
});
// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map