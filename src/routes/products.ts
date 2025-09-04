import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Products from '../models/Products';

const router = Router();

// Create a product
router.post('/products', async (req: Request, res: Response) => {
  try {
    const product = await Products.create(req.body);
    return res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get all products with optional pagination and basic filtering
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { limit = '50', skip = '0', name, price } = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (name !== undefined) filter.name = Number(name);
    if (price !== undefined) filter.price = String(price);

    const items = await Products.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const count = await Products.countDocuments(filter);

    res.json({ items, count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get product by ID
router.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    const product = await Products.findById(id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.patch('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    const product = await Products.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete product
router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    const product = await Products.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

