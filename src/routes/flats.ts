import express from 'express';
import User from '../models/User';
import Flat from '../models/Flats';
import UserFlat from '../models/UserFlat';
import { upload } from '../services/uploads';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const allowedCurrencies = new Set(['GEL', 'USD', 'EUR']);

// Upload images to a flat (supports multiple files under field name `images`)
router.post('/flats/:id/images', upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded. Use form-data with field name "images".' });
    }

    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({ error: 'Flat not found' });

    const newImages = [] as any[];

    for (const f of files) {
      let imageDoc: any = {
        url: `/uploads/${f.filename}`,
        localUrl: `/uploads/${f.filename}`,
        filename: f.filename,
        size: f.size,
        contentType: f.mimetype,
        storage: 'local',
      };

      // Mirror to Firebase if available


      newImages.push(imageDoc);
    }

    flat.images = [...(flat.images || []), ...newImages];
    await flat.save();

    res.status(201).json({ images: flat.images, imagesCount: flat.images?.length || 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a specific image from a flat by image subdocument id
router.delete('/flats/:id/images/:imageId', async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const flat = await Flat.findById(id);
    if (!flat) return res.status(404).json({ error: 'Flat not found' });

    const images = flat.images || [];
    const idx = images.findIndex((img: any) => String(img._id) === String(imageId));
    if (idx === -1) return res.status(404).json({ error: 'Image not found' });

    const [removed] = images.splice(idx, 1);
    flat.images = images as any;
    await flat.save();

    // Attempt to remove file from disk
    if (removed?.filename) {
      const filePath = path.join(process.cwd(), 'uploads', removed.filename);
      fs.promises.unlink(filePath).catch(() => void 0);
    }

    // Attempt to remove from Firebase
    if (removed?.storage === 'firebase' && removed?.path) {
    }

    res.json({ message: 'Image deleted', images: flat.images, imagesCount: flat.images?.length || 0 });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Create flat
router.post('/flats', upload.single('image'), async (req, res) => {
  try {
    const { square, location, price, currency } = req.body || {};

    if (square == null || location == null || price == null) {
      return res.status(400).json({ error: 'square, location, price are required' });
    }

    // Require one image file
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'image file is required (multipart/form-data, field name "image")' });
    }

    // Normalize and validate currency if provided
    let normalizedCurrency: string | undefined;
    if (typeof currency === 'string' && currency.trim()) {
      normalizedCurrency = currency.trim().toUpperCase();
      if (!allowedCurrencies.has(normalizedCurrency)) {
        return res.status(400).json({ error: 'Invalid currency. Allowed: GEL, USD, EUR' });
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
      location,
      price,
      currency: normalizedCurrency, // undefined will fall back to schema default (GEL)
      images: [imageDoc],
    });

    // Mirror to Firebase if configured


    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Update flat
router.patch('/flats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { square, location, price, currency } = req.body || {};

    if (currency && !allowedCurrencies.has(String(currency.toUpperCase()))) {
      return res.status(400).json({ error: 'Invalid currency. Allowed: GEL, USD, EUR' });
    }

    const update: any = {};
    if (square != null) update.square = square;
    if (location != null) update.location = location;
    if (price != null) update.price = price;
    if (currency != null) update.currency = currency.toUpperCase();

    const doc = await Flat.findByIdAndUpdate(id, update, { new: true });
    if (!doc) return res.status(404).json({ error: 'Flat not found' });

    return res.json(doc);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/assign-flat
router.post('/assign-flat', async (req, res) => {

  console.log("boooody",req.body);

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
router.get('/flats', async (req, res) => {
  try {
    const { currency } = req.query as Record<string, string | undefined>;
    const filter: any = {};

    // Normalize input currency (trim + uppercase)
    const inputCurrency = typeof currency === 'string' ? currency.trim().toUpperCase() : undefined;
    const selectedCurrency = inputCurrency || 'GEL';

    if (selectedCurrency) {
      if (!allowedCurrencies.has(String(selectedCurrency))) {
        return res.status(400).json({ error: 'Invalid currency. Allowed: GEL, USD, EUR' });
      }
      // Treat missing currency as GEL for backward compatibility
      if (selectedCurrency === 'GEL') {
        filter.$or = [{ currency: 'GEL' }, { currency: { $exists: false } }];
      } else {
        filter.currency = selectedCurrency;
      }
    }

    const flats = await Flat.find(filter);

    if (!flats) {
      return res.status(404).json({ error: 'flats not found.' });
    }

    return res.json({
      flats: flats,
      flatsCount: flats.length,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
