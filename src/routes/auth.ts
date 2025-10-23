import {Router, Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import User, {IUser} from '../models/User';
import {signAccessToken, signRefreshToken, verifyRefreshToken} from '../services/jwt';
import {IUserForToken} from '../types/auth';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               address:
 *                 type: string
 *                 example: "123 Main St"
 *               age:
 *                 type: integer
 *                 example: 30
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               password:
 *                 type: string
 *                 example: secret123
 *               birthDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       '201':
 *         description: Created
 *       '400':
 *         description: Validation error
 *       '409':
 *         description: Email already registered
 */
// Register: POST /auth/register
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const {
      email: rawEmail,
      address,
      age: rawAge,
      firstName,
      lastName,
      password,
      birthDate: rawBirthDate,
    } = req.body as Record<string, any>;

    // Basic validation
    const errors: string[] = [];
    if (!rawEmail || typeof rawEmail !== 'string') errors.push('email is required');
    if (!address || typeof address !== 'string') errors.push('address is required');
    if (rawAge === undefined || rawAge === null) errors.push('age is required');
    if (firstName === undefined || firstName === null || String(firstName).trim() === '') errors.push('firstName is required');
    if (lastName === undefined || lastName === null || String(lastName).trim() === '') errors.push('lastName is required');
    if (!password || typeof password !== 'string' || password.length < 6) errors.push('password is required and must be at least 6 characters');

    const email = rawEmail ? String(rawEmail).toLowerCase().trim() : '';
    const age = rawAge !== undefined ? Number(rawAge) : NaN;
    const birthDate = rawBirthDate ? new Date(rawBirthDate) : null;

    if (!email.match(/[^@\s]+@[^@\s]+\.[^@\s]+/)) errors.push('email is invalid');
    if (Number.isNaN(age) || !Number.isFinite(age) || age < 0 || age > 150) errors.push('age must be a number between 0 and 150');

    if (errors.length) return res.status(400).json({errors});

    // Check for existing user
    const existing = await User.findOne({email}).lean();
    if (existing) return res.status(409).json({error: 'Email already registered'});

    // If birthDate not provided, derive approximate birthDate as Jan 1 of (currentYear - age)
    const computedBirthDate = birthDate || new Date(new Date().getFullYear() - Math.floor(age), 0, 1);

    // Create user instance and save (pre-save hook in model will hash the password)
    const user = new User({
      email,
      address: String(address).trim(),
      age: Math.floor(age),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      password,
      birthDate: computedBirthDate,
    });

    await user.save();

    const sanitized = user.toObject(); // transforms in schema remove password
    res.status(201).json(sanitized);
  } catch (err: any) {
    if (err && err.code === 11000) return res.status(409).json({error: 'Duplicate key error'});
    res.status(500).json({error: err?.message || 'Internal server error'});
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login and receive access and refresh tokens
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       '200':
 *         description: OK
 *       '400':
 *         description: Bad Request
 *       '401':
 *         description: Invalid credentials
 */
// Login: POST /auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const {email: rawEmail, password} = req.body as Record<string, any>;
    if (!rawEmail || typeof rawEmail !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({error: 'email and password are required'});
    }

    const email = String(rawEmail).toLowerCase().trim();

    const user = await User.findOne({email}).select('+password firstName lastName age birthDate address createdAt email').lean();
    console.log("user", user)

    if (!user) return res.status(401).json({error: 'Invalid credentials'});

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({error: 'Invalid credentials'});

    const userForToken: IUserForToken = {
      id: String(user._id),
      password: user.password,
      age: user.age,
      address: user.address,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const token = signAccessToken(userForToken);
    const refresh_token = signRefreshToken(userForToken);

    return res.status(200).json({token, refresh_token});
  } catch (err: any) {
    console.log("errr", err)
    return res.status(500).json({error: err?.message || 'Internal server error'});
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token and return new access + refresh tokens
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *     responses:
 *       '200':
 *         description: OK
 *       '400':
 *         description: Bad Request
 *       '401':
 *         description: Invalid or expired refresh token
 */
// New: Refresh tokens - POST /auth/refresh
router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const {refresh_token} = req.body as { refresh_token?: unknown };
    if (!refresh_token || typeof refresh_token !== 'string') {
      return res.status(400).json({error: 'refresh_token is required'});
    }

    let payload: IUserForToken;
    try {
      payload = verifyRefreshToken(refresh_token);

    } catch (err) {
      return res.status(401).json({error: 'Invalid or expired refresh token'});
    }

    const email = String(payload.email).toLowerCase().trim();

    console.log("email",payload)

    // Ensure the user still exists
    const user = await User.findOne({email});
    if (!user) return res.status(401).json({error: 'Invalid refresh token (user not found)'});

    const userForToken: IUserForToken = {
      id: String(user._id),
      password: user.password,
      age: user.age,
      address: user.address,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const newToken = signAccessToken(userForToken);
    const newRefresh = signRefreshToken(userForToken);

    return res.status(200).json({token: newToken, refresh_token: newRefresh});
  } catch (err: any) {

    console.log("errr", err)
    return res.status(500).json({error: err?.message || 'Internal server error'});
  }
});

export default router;
