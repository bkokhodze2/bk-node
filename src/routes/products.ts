import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Products from '../models/Products';

const router = Router();

// Create a product
/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a product
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Validation error
 */
router.post('/products', async (req: Request, res: Response) => {
  try {
    const product = await Products.create(req.body);
    return res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get all products with optional pagination and basic filtering
/**
 * @openapi
 * /products:
 *   get:
 *     summary: List products
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 count:
 *                   type: integer
 */
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
/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Invalid id
 *       '404':
 *         description: Not found
 */
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
/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     summary: Update a product
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: Not found
 */
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
/**
 * @openapi
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Deleted
 *       '400':
 *         description: Invalid id
 *       '404':
 *         description: Not found
 */
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
