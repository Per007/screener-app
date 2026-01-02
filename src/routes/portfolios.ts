import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../models/types';

const router = Router();

const createPortfolioSchema = z.object({
  name: z.string().min(1)
});

const updatePortfolioSchema = createPortfolioSchema.partial();

const holdingSchema = z.object({
  companyId: z.string().uuid(),
  weight: z.number().min(0).max(100),
  shares: z.number().optional()
});

const holdingsSchema = z.object({
  holdings: z.array(holdingSchema)
});

// List portfolios for the authenticated user's client (admins see all)
router.get('/portfolios', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      throw new AppError('Not authenticated', 401);
    }

    // Admins can see all portfolios, regular users only see their client's portfolios
    const whereClause = user.role === 'admin' 
      ? {} 
      : user.clientId 
        ? { clientId: user.clientId }
        : { clientId: 'none' }; // No portfolios if user has no client

    const portfolios = await prisma.portfolio.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        },
        holdings: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                ticker: true
              }
            }
          }
        },
        _count: { 
          select: { holdings: true } 
        }
      }
    });

    // Format portfolios with additional computed fields
    const formattedPortfolios = portfolios.map(portfolio => ({
      id: portfolio.id,
      name: portfolio.name,
      client: portfolio.client,
      holdings: portfolio.holdings,
      holdingsCount: portfolio._count.holdings,
      createdAt: portfolio.createdAt,
      // These fields would come from screening results if available
      lastScreenedAt: null,
      status: 'pending',
      summary: {
        passRate: 0,
        failed: 0
      }
    }));

    res.json(formattedPortfolios);
  } catch (err) {
    next(err);
  }
});

// List portfolios for a client
router.get('/clients/:clientId/portfolios', authenticate, async (req, res, next) => {
  try {
    const portfolios = await prisma.portfolio.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { holdings: true } }
      }
    });
    res.json(portfolios);
  } catch (err) {
    next(err);
  }
});

// Create portfolio for a client
router.post('/clients/:clientId/portfolios', authenticate, async (req, res, next) => {
  try {
    const data = createPortfolioSchema.parse(req.body);

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: req.params.clientId } });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        ...data,
        clientId: req.params.clientId
      }
    });
    res.status(201).json(portfolio);
  } catch (err) {
    next(err);
  }
});

// Get portfolio with holdings
router.get('/portfolios/:id', authenticate, async (req, res, next) => {
  try {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        holdings: {
          include: { company: true }
        }
      }
    });
    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }
    res.json(portfolio);
  } catch (err) {
    next(err);
  }
});

// Update portfolio
router.put('/portfolios/:id', authenticate, async (req, res, next) => {
  try {
    const data = updatePortfolioSchema.parse(req.body);
    const portfolio = await prisma.portfolio.update({
      where: { id: req.params.id },
      data
    });
    res.json(portfolio);
  } catch (err) {
    next(err);
  }
});

// Add/update holdings (replaces all holdings)
router.post('/portfolios/:id/holdings', authenticate, async (req, res, next) => {
  try {
    const { holdings } = holdingsSchema.parse(req.body);
    const portfolioId = req.params.id;

    // Verify portfolio exists
    const portfolio = await prisma.portfolio.findUnique({ where: { id: portfolioId } });
    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    // Delete existing holdings and create new ones
    await prisma.$transaction([
      prisma.portfolioHolding.deleteMany({ where: { portfolioId } }),
      ...holdings.map((h) =>
        prisma.portfolioHolding.create({
          data: {
            portfolioId,
            companyId: h.companyId,
            weight: h.weight,
            shares: h.shares
          }
        })
      )
    ]);

    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: { holdings: { include: { company: true } } }
    });

    res.json(updatedPortfolio);
  } catch (err) {
    next(err);
  }
});

// Delete portfolio
router.delete('/portfolios/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.portfolio.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
