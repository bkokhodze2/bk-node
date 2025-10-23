import {Router, Request, Response} from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import authMiddleware, { AuthRequest } from '../middleware/auth';

const router = Router();

// List users with pagination and basic filters (protected)
router.get('/users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // req.user is now typed as AuthPayload
    const requester = req.user; // AuthPayload | undefined

    console.log('Requester:', requester);

    const {limit = '50', skip = '0', email, firstName, lastName} = req.query as Record<string, string>;

    const filter: Record<string, any> = {};
    if (email) filter.email = String(email).toLowerCase();
    if (firstName) filter.firstName = new RegExp(String(firstName), 'i');
    if (lastName) filter.lastName = new RegExp(String(lastName), 'i');

    const items = await User.find(filter)
        .select('-password')
        .populate('flats')
        .sort({createdAt: -1})
        .skip(Number(skip))
        .limit(Number(limit))
        .lean();

    const count = await User.countDocuments(filter);

    res.json({items, count, requester});
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

// Get user by ID
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({error: 'Invalid user id'});

    const user = await User.findById(id).select('-password').populate('flats');
    if (!user) return res.status(404).json({error: 'User not found'});

    res.json(user);
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

// Update user (uses save hook to hash password if provided)
router.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({error: 'Invalid user id'});

    const user = await User.findById(id).select('+password');
    if (!user) return res.status(404).json({error: 'User not found'});

    const allowed = ['age', 'email', 'firstName', 'lastName', 'birthDate', 'address', 'password'] as const;
    for (const key of Object.keys(req.body)) {
      if ((allowed as readonly string[]).includes(key)) {
        // @ts-ignore
        user[key] = req.body[key];
      }
    }

    await user.save(); // triggers pre-save hash if password modified

    const sanitized = user.toObject();
    // ensure password omitted (transform also removes it, but be explicit)
    // @ts-ignore
    delete sanitized.password;

    res.json(sanitized);
  } catch (err: any) {
    res.status(400).json({error: err.message});
  }
});

// Delete user
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const {id} = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({error: 'Invalid user id'});
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({error: 'User not found'});
    res.json({message: 'Deleted'});
  } catch (err: any) {
    res.status(500).json({error: err.message});
  }
});

// Get users with their flats populated
router.get('/users-with-flats', async (req: Request, res: Response) => {
  try {
    const ageFilter = req.query.age ? {age: {$lt: Number(req.query.age)}} : {};

    const users = await User.find(ageFilter)
        .populate('flats')
        .select('-password')
        .exec();

    if (!users || users.length === 0) {
      return res.status(404).json({error: 'No users found'});
    }

    res.json({
      users,
      count: users.length
    });
  } catch (error: any) {
    res.status(500).json({error: error.message});
  }
});

export default router;
