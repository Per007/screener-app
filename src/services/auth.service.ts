import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/error-handler';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}
const JWT_EXPIRES_IN = '7d';

export async function register(email: string, password: string, name: string, role: string = 'analyst') {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  const passwordHash = await bcrypt.hash(password, 8);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clientId: true,
      createdAt: true
    }
  });

  const token = generateToken(user);
  return { user, token };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientId: user.clientId
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId
    },
    token
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clientId: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

function generateToken(user: { id: string; email: string; name: string; role: string; clientId?: string | null }) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function refreshToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      role: string;
      clientId?: string;
    };

    return generateToken(decoded);
  } catch (err) {
    throw new AppError('Invalid token', 401);
  }
}
