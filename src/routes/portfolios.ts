import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../models/types';

const router = Router();

const createPortfolioSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().uuid().optional() // Optional for admin users
});

const updatePortfolioSchema = createPortfolioSchema.partial();

const holdingSchema = z.object({
  companyId: z.string().uuid(),
  weight: z.number().min(0).max(100)
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

// Create portfolio (admin can specify clientId, regular users use their clientId)
router.post('/portfolios', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      throw new AppError('Not authenticated', 401);
    }

    const data = createPortfolioSchema.parse(req.body);
    
    // Determine clientId: admin can specify, regular users use their own
    let clientId: string;
    if (user.role === 'admin') {
      // Admin must provide clientId in request body
      if (!data.clientId) {
        throw new AppError('clientId is required for admin users', 400);
      }
      clientId = data.clientId;
    } else {
      // Regular users use their own clientId
      if (!user.clientId) {
        throw new AppError('User must be associated with a client', 403);
      }
      clientId = user.clientId;
    }

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        name: data.name,
        clientId: clientId
      }
    });
    
    res.status(201).json(portfolio);
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
            weight: h.weight
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

// Add a single holding to a portfolio (incremental add)
router.post('/portfolios/:id/holdings/add', authenticate, async (req, res, next) => {
  try {
    const holdingData = holdingSchema.parse(req.body);
    const portfolioId = req.params.id;

    // Verify portfolio exists
    const portfolio = await prisma.portfolio.findUnique({ where: { id: portfolioId } });
    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: holdingData.companyId } });
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Check if holding already exists (upsert - update if exists, create if not)
    const holding = await prisma.portfolioHolding.upsert({
      where: {
        portfolioId_companyId: {
          portfolioId,
          companyId: holdingData.companyId
        }
      },
      update: {
        weight: holdingData.weight
      },
      create: {
        portfolioId,
        companyId: holdingData.companyId,
        weight: holdingData.weight
      }
    });

    // Return updated portfolio with all holdings
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

/**
 * POST /portfolios/:id/normalize-weights
 * 
 * Normalize all holding weights in a portfolio to sum to exactly 100%.
 * This is useful for fixing portfolios imported with raw weights that don't sum to 100%.
 * 
 * The normalization formula: newWeight = (oldWeight / totalWeight) * 100
 * 
 * Example:
 * - Before: Shell 100, Apple 1000, Microsoft 800, ExxonMobil 500 (Total: 2400)
 * - After:  Shell 4.17%, Apple 41.67%, Microsoft 33.33%, ExxonMobil 20.83% (Total: 100%)
 */
router.post('/portfolios/:id/normalize-weights', authenticate, async (req, res, next) => {
  try {
    const portfolioId = req.params.id;

    // Get portfolio with holdings
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        holdings: {
          include: { company: true }
        }
      }
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404);
    }

    if (portfolio.holdings.length === 0) {
      throw new AppError('Portfolio has no holdings to normalize', 400);
    }

    // Calculate total weight
    const totalWeight = portfolio.holdings.reduce((sum, h) => sum + (h.weight || 0), 0);

    if (totalWeight === 0) {
      // If all weights are 0, distribute equally
      const equalWeight = 100 / portfolio.holdings.length;
      await prisma.$transaction(
        portfolio.holdings.map(holding =>
          prisma.portfolioHolding.update({
            where: { id: holding.id },
            data: { weight: equalWeight }
          })
        )
      );
    } else {
      // Normalize each weight: (weight / totalWeight) * 100
      await prisma.$transaction(
        portfolio.holdings.map(holding => {
          const normalizedWeight = ((holding.weight || 0) / totalWeight) * 100;
          return prisma.portfolioHolding.update({
            where: { id: holding.id },
            data: { weight: normalizedWeight }
          });
        })
      );
    }

    // Return updated portfolio
    const updatedPortfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
      include: {
        client: true,
        holdings: {
          include: { company: true }
        }
      }
    });

    res.json({
      message: `Weights normalized from ${totalWeight.toFixed(2)}% to 100%`,
      originalTotal: totalWeight,
      portfolio: updatedPortfolio
    });
  } catch (err) {
    next(err);
  }
});

export default router;
