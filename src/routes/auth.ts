import { Router, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../models/types';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'analyst']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data.email, data.password, data.name, data.role);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = await authService.getUserById(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Refresh token
router.post('/refresh', authenticate, (req: AuthRequest, res: Response, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader!.substring(7);
    const newToken = authService.refreshToken(token);
    res.json({ token: newToken });
  } catch (err) {
    next(err);
  }
});

export default router;
