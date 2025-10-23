import express from 'express';
import User from '../models/User';
import Flat from '../models/Flats';
import UserFlat from '../models/UserFlat';
import fs from 'fs';
import path from 'path';

import {guessContentType} from "../helpers/cloudinary";
import cloudinary from '../services/cloudinary';

import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({storage});

const router = express.Router();

const allowedCurrencies = new Set(['GEL', 'USD', 'EUR']);

function parseAddress(body: any) {
  let address: any = undefined;

  // Prefer nested address
  if (body?.address != null) {
    if (typeof body.address === 'string') {
      try {
        const parsed = JSON.parse(body.address);
        if (parsed && typeof parsed === 'object') {
          address = parsed;
        }
      } catch {
        // ignore, will try other shapes
      }
    } else if (typeof body.address === 'object') {
      address = body.address;
    }
  }

  // Fallback to flat fields (useful for multipart forms)
  if (!address) {
    const street = body?.street ?? body?.address_street ?? body?.addr_street;
    const city = body?.city ?? body?.address_city ?? body?.addr_city;
    const state = body?.state ?? body?.address_state ?? body?.addr_state;
    const zip = body?.zip ?? body?.address_zip ?? body?.addr_zip;
    if (street || city || state || zip) {
      address = {street, city, state, zip};
    }
  }

  // Legacy: map location -> address.street
  if (!address && body?.location) {
    address = {street: String(body.location)};
  }

  // Normalize/trim strings
  if (address) {
    const norm = (v: any) => (typeof v === 'string' ? v.trim() : v);
    address = {
      street: norm(address.street),
      city: norm(address.city),
      state: norm(address.state),
      zip: norm(address.zip),
    };
  }

  return address;
}

// Upload images to a flat (supports multiple files under field name `images`)
/**
 * @openapi
 * /flats/{id}/images:
 *   post:
 *     summary: Upload images to a flat
 *     tags:
 *       - Flats
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       '201':
 *         description: Images uploaded
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: Flat not found
 */
router.post('/flats/:id/images', upload.array('images', 10), async (req, res) => {
  try {

    console.log(req.body);
    const {id} = req.params;

    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({error: 'Flat not found'});

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({error: 'No images uploaded. Use form-data with field name "images".'});
    }

    // Upload all images to Cloudinary in parallel
    const results = await Promise.all(
        files.map((file) =>
            new Promise<{ up: any; file: Express.Multer.File }>((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                  {folder: 'flats', resource_type: 'image'},
                  (error, result) => {
                    if (error) return reject(error);
                    resolve({up: result, file});
                  }
              );
              stream.end(file.buffer);
            })
        )
    );

    const newImages = results.map(({up, file}) => {
      const filename = up?.original_filename && up?.format
          ? `${up.original_filename}.${up.format}`
          : file?.originalname || up?.public_id;
      return {
        url: up?.secure_url || up?.url,
        filename,
        size: up?.bytes ?? file.size,
        contentType: file.mimetype || (up?.format ? guessContentType(up.format) : 'image'),
        storage: 'cloudinary',
        cloudinaryPublicId: up?.public_id,
      } as any;
    });

    if (!newImages.length) {
      return res.status(400).json({error: 'No valid images found to upload'});
    }

    flat.images = [...(flat.images || []), ...newImages];
    await flat.save();

    res.status(201).json({
      images: flat.images,
      imagesCount: flat.images?.length || 0,
    });
  } catch (err: any) {
    res.status(400).json({error: err.message || "some sss"});
  }
});

// Delete a specific image from a flat by image subdocument id
/**
 * @openapi
 * /flats/{id}/images/{imageId}:
 *   delete:
 *     summary: Delete a specific image from a flat
 *     tags:
 *       - Flats
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Image deleted
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: Flat or image not found
 */
router.delete('/flats/:id/images/:imageId', async (req, res) => {
  try {
    const {id, imageId} = req.params;

    // const imageId = req.query.imageId;

    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({error: 'Flat not found'});

    const images = flat.images || [];
    const idx = images.findIndex((img: any) => String(img._id) === String(imageId));

    if (idx === -1) return res.status(404).json({error: 'Image not found'});

    const [removed] = images.splice(idx, 1);
    flat.images = images as any;
    await flat.save();

    // Remove from Cloudinary if applicable
    if (removed?.storage === 'cloudinary' && removed?.cloudinaryPublicId) {
      // best-effort delete; don't fail request on Cloudinary error
      cloudinary.uploader.destroy(removed.cloudinaryPublicId).catch(() => void 0);
    }

    // Legacy local cleanup
    if (removed?.storage === 'local' && removed?.filename) {
      const filePath = path.join(process.cwd(), 'uploads', removed.filename);
      fs.promises.unlink(filePath).catch(() => void 0);
    }

    return res.json({message: 'Image deleted', images: flat.images, imagesCount: flat.images?.length || 0});
  } catch (err: any) {
    return res.status(400).json({error: err.message});
  }
});

// Create flat
/**
 * @openapi
 * /flats:
 *   post:
 *     summary: Create a flat
 *     tags:
 *       - Flats
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               square:
 *                 type: number
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *               address:
 *                 type: object
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Flat'
 *       '400':
 *         description: Validation error
 */
router.post('/flats', async (req, res) => {
  try {
    const {square, price, currency} = req.body || {};
    const address = parseAddress(req.body);

    if (square == null || price == null || !address) {
      return res.status(400).json({error: 'square, address.street, and price are required'});
    }

    if (!address.street) {
      return res.status(400).json({error: 'address.street is required'});
    }

    // Require one image file
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({error: 'image file is required (multipart/form-data, field name "image")'});
    }

    // Normalize and validate currency if provided
    let normalizedCurrency: string | undefined;
    if (typeof currency === 'string' && currency.trim()) {
      normalizedCurrency = currency.trim().toUpperCase();
      if (!allowedCurrencies.has(normalizedCurrency)) {
        return res.status(400).json({error: 'Invalid currency. Allowed: GEL, USD, EUR'});
      }
    }

    // Create first with local image
    let imageDoc: any = {
      url: `/uploads/${file.filename}`,
      localUrl: `/uploads/${file.filename}`,
      filename: file.filename,
      size: file.size,
      contentType: file.mimetype,
      storage: 'local',
    };

    // Make document to obtain id
    const doc = await Flat.create({
      square,
      address,
      price,
      currency: normalizedCurrency, // undefined will fall back to schema default (GEL)
      images: [imageDoc],
    });

    // Mirror to Firebase if configured


    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(400).json({error: err.message});
  }
});

// Update flat
/**
 * @openapi
 * /flats/{id}:
 *   patch:
 *     summary: Update a flat
 *     tags:
 *       - Flats
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               square:
 *                 type: number
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *               address:
 *                 type: object
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Flat'
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: Not found
 */
router.patch('/flats/:id', async (req, res) => {
  try {
    const {id} = req.params;
    const {square, price, currency} = req.body || {};

    if (currency && !allowedCurrencies.has(String(String(currency).toUpperCase()))) {
      return res.status(400).json({error: 'Invalid currency. Allowed: GEL, USD, EUR'});
    }

    const update: any = {};
    if (square != null) update.square = square;
    if (price != null) update.price = price;
    if (currency != null) update.currency = String(currency).toUpperCase();

    const address = parseAddress(req.body);
    if (address) {
      update.$set = {...(update.$set || {})};
      if (address.street != null) update.$set['address.street'] = address.street;
      if (address.city != null) update.$set['address.city'] = address.city;
      if (address.state != null) update.$set['address.state'] = address.state;
      if (address.zip != null) update.$set['address.zip'] = address.zip;
    }

    // If explicitly clearing address (rare): support address = null
    if (req.body && (req.body.address === null || req.body.address === 'null')) {
      update.$unset = {...(update.$unset || {}), address: ''};
    }

    const doc = await Flat.findByIdAndUpdate(id, update, {new: true});
    if (!doc) return res.status(404).json({error: 'Flat not found'});

    return res.json(doc);
  } catch (err: any) {
    return res.status(400).json({error: err.message});
  }
});

// POST /api/assign-flat
/**
 * @openapi
 * /assign-flat:
 *   post:
 *     summary: Assign a flat to a user (creates join document)
 *     tags:
 *       - Flats
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               flatId:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Assigned
 *       '400':
 *         description: Validation error
 *       '404':
 *         description: User or Flat not found
 */
router.post('/assign-flat', async (req, res) => {

  console.log("boooody", req.body);

  const {userId, flatId} = req.body;

  if (!userId || !flatId) {
    return res.status(400).json({error: 'userId and flatId are required.'});
  }

  try {
    // Check if user and flat exist
    const user = await User.findById(userId);
    const flat = await Flat.findById(flatId);

    if (!user || !flat) {
      return res.status(404).json({error: 'User or Flat not found.'});
    }

    // Check if flat is already assigned to this user
    if (user.flats && user.flats.includes(flat._id as any)) {
      return res.status(400).json({error: 'Flat is already assigned to this user.'});
    }

    // Add flat to user's flats array (preserve existing flats)
    if (!user.flats) {
      user.flats = [];
    }
    user.flats.push(flat._id as any);
    await user.save();

    // Create join document
    await UserFlat.create({userId: user._id, flatId: flat._id});

    return res.json({message: 'Flat assigned to user successfully.', totalFlats: user.flats.length});
  } catch (error) {
    return res.status(500).json({error: 'Internal server error.'});
  }
});

//get flats
/**
 * @openapi
 * /flats:
 *   get:
 *     summary: List flats with optional currency filter
 *     tags:
 *       - Flats
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Filter by currency (GEL, USD, EUR)
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 flats:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Flat'
 *                 flatsCount:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       '400':
 *         description: Validation error
 */
router.get('/flats', async (req, res) => {
  try {
    const q = req.query as Record<string, string | undefined>;

    // Build filter - only handle currency
    const filter: any = {};

    // Handle currency filter with GEL fallback for missing currency field
    const currency = q.currency?.trim().toUpperCase();
    if (currency) {
      if (!allowedCurrencies.has(currency)) {
        return res.status(400).json({ error: 'Invalid currency. Allowed: GEL, USD, EUR' });
      }

      if (currency === 'GEL') {
        // For GEL, match both explicit GEL and missing currency field
        filter.$or = [
          { currency: 'GEL' },
          { currency: { $exists: false } }
        ];
      } else {
        // For USD/EUR, only match explicit currency
        filter.currency = currency;
      }
    }

    const [total, flats] = await Promise.all([
      Flat.countDocuments(filter),
      Flat.find(filter).lean(),
    ]);

    return res.json({
      flats,
      flatsCount: flats.length,
      total,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
