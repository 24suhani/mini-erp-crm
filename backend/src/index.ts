import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

app.use(cors());
app.use(express.json());

// Authentication Middleware
const authenticate = (req: any, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// 1. AUTHENTICATION
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || 'SALES' }
    });
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.encode({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CUSTOMER CRM MODULE
app.get('/api/customers', authenticate, async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    const where = search ? {
      OR: [
        { name: { contains: String(search), mode: 'insensitive' as const } },
        { businessName: { contains: String(search), mode: 'insensitive' as const } },
        { mobile: { contains: String(search) } }
      ]
    } : {};
    const customers = await prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes } = req.body;
    const customer = await prisma.customer.create({
      data: {
        name, mobile, email, businessName, gstNumber,
        type: type || 'Wholesale',
        address,
        status: status || 'Lead',
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes
      }
    });
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, mobile, email, businessName, gstNumber, type, address, status, followUpDate, notes } = req.body;
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name, mobile, email, businessName, gstNumber, type, address, status,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        notes
      }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PRODUCT & INVENTORY MODULE
app.get('/api/products', authenticate, async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', authenticate, async (req: any, res: Response) => {
  try {
    const { name, sku, category, unitPrice, currentStock, minStockAlert, location } = req.body;
    const product = await prisma.product.create({
      data: {
        name, sku, category,
        unitPrice: Number(unitPrice),
        currentStock: Number(currentStock),
        minStockAlert: Number(minStockAlert || 5),
        location
      }
    });

    // Log initial stock entry movement
    if (Number(currentStock) > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: Number(currentStock),
          type: 'IN',
          reason: 'Initial Inventory Entry',
          userId: req.user.id
        }
      });
    }

    res.status(201).json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stock Movements Log Endpoint
app.get('/api/stock-movements', authenticate, async (req: Request, res: Response) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: { product: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. SALES CHALLAN MODULE WITH STOCK VALIDATION
app.get('/api/challans', authenticate, async (req: Request, res: Response) => {
  try {
    const challans = await prisma.challan.findMany({
      include: { customer: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(challans);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/challans', authenticate, async (req: any, res: Response) => {
  try {
    const { customerId, items, status } = req.body; 
    // items: Array of { productId, quantity }

    let totalQuantity = 0;
    const productSnapshots = [];

    // Step 1: Validate stock levels for all products
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(404).json({ error: `Product ID ${item.productId} not found` });

      if (status === 'Confirmed' && product.currentStock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product "${product.name}". Available: ${product.currentStock}, Requested: ${item.quantity}`
        });
      }

      totalQuantity += Number(item.quantity);
      productSnapshots.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: product.unitPrice,
        quantity: item.quantity
      });
    }

    // Step 2: Auto-generate Challan Number
    const challanCount = await prisma.challan.count();
    const challanNumber = `CHAL-${1000 + challanCount + 1}`;

    // Step 3: Create Challan
    const challan = await prisma.challan.create({
      data: {
        challanNumber,
        customerId,
        products: productSnapshots,
        totalQuantity,
        status: status || 'Draft',
        userId: req.user.id
      }
    });

    // Step 4: Reduce stock and record movement if status is Confirmed
    if (status === 'Confirmed') {
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: Number(item.quantity) } }
        });

        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: Number(item.quantity),
            type: 'OUT',
            reason: `Dispatched via Challan ${challanNumber}`,
            userId: req.user.id
          }
        });
      }
    }

    res.status(201).json(challan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});