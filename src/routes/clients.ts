import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

const createClientSchema = z.object({
  name: z.string().min(1)
});

const updateClientSchema = createClientSchema.partial();

/**
 * GET /api/clients
 * List all clients with counts for related entities
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            portfolios: true,
            users: true,
            parameters: true,        // Count of custom parameters owned by this client
            clientParameters: true,  // Count of parameters selected by this client
            criteriaSets: true       // Count of criteria sets owned by this client
          }
        }
      }
    });

    // Format the response with clearer naming
    const result = clients.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      counts: {
        portfolios: c._count.portfolios,
        users: c._count.users,
        customParameters: c._count.parameters,      // Custom parameters created by client
        selectedParameters: c._count.clientParameters, // Parameters selected with thresholds
        criteriaSets: c._count.criteriaSets         // Custom criteria sets
      }
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/clients/:id
 * Get a single client with all related entities
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        portfolios: {
          select: { id: true, name: true, createdAt: true }
        },
        users: {
          select: { id: true, email: true, name: true, role: true }
        },
        parameters: {
          // Custom parameters owned by this client
          select: { id: true, name: true, dataType: true, unit: true, description: true }
        },
        clientParameters: {
          // Parameters selected by this client with thresholds
          include: {
            parameter: {
              select: { id: true, name: true, dataType: true, unit: true, isGlobal: true }
            }
          }
        },
        criteriaSets: {
          // Criteria sets owned by this client
          select: { id: true, name: true, version: true, effectiveDate: true },
          orderBy: { effectiveDate: 'desc' }
        }
      }
    });

    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Format the response
    res.json({
      id: client.id,
      name: client.name,
      createdAt: client.createdAt,
      portfolios: client.portfolios,
      users: client.users,
      customParameters: client.parameters, // Parameters created by this client
      selectedParameters: client.clientParameters.map((cp) => ({
        id: cp.id,
        parameter: cp.parameter,
        thresholdType: cp.thresholdType,
        thresholdValue: cp.thresholdValue ? JSON.parse(cp.thresholdValue) : null,
        createdAt: cp.createdAt
      })),
      criteriaSets: client.criteriaSets
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/clients
 * Create a new client (admin only)
 */
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = createClientSchema.parse(req.body);
    const client = await prisma.client.create({ data });
    res.status(201).json({
      id: client.id,
      name: client.name,
      createdAt: client.createdAt
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/clients/:id
 * Update a client (admin only)
 */
router.put('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const data = updateClientSchema.parse(req.body);

    // Verify client exists
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError('Client not found', 404);
    }

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data
    });

    res.json({
      id: client.id,
      name: client.name,
      createdAt: client.createdAt
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/clients/:id
 * Delete a client (admin only)
 */
router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    // Verify client exists
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError('Client not found', 404);
    }

    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
