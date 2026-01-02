import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { AuthRequest } from '../models/types';

const router = Router();

// Schema for creating a parameter (now supports optional clientId for client-specific parameters)
const createParameterSchema = z.object({
  name: z.string().min(1),
  dataType: z.enum(['number', 'boolean', 'string']),
  unit: z.string().optional(),
  description: z.string().optional(),
  clientId: z.string().uuid().optional() // If provided, creates a client-specific parameter
});

const updateParameterSchema = z.object({
  name: z.string().min(1).optional(),
  dataType: z.enum(['number', 'boolean', 'string']).optional(),
  unit: z.string().optional().nullable(),
  description: z.string().optional().nullable()
});

/**
 * GET /api/parameters
 * List parameters with optional filtering
 * Query params:
 *   - clientId: If provided, returns global parameters + parameters owned by that client
 *   - globalOnly: If true, returns only global parameters
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { clientId, globalOnly } = req.query;

    // Build the where clause based on filters
    let where: any = {};

    if (globalOnly === 'true') {
      // Only return global parameters
      where.isGlobal = true;
    } else if (clientId && typeof clientId === 'string') {
      // Return global parameters AND parameters owned by the specified client
      where.OR = [
        { isGlobal: true },
        { clientId: clientId }
      ];
    }
    // If no filter, return all parameters (for admin use)

    const parameters = await prisma.parameter.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        client: {
          select: { id: true, name: true }
        }
      }
    });

    // Format response to clearly indicate ownership
    const result = parameters.map((p) => ({
      id: p.id,
      name: p.name,
      dataType: p.dataType,
      unit: p.unit,
      description: p.description,
      isGlobal: p.isGlobal,
      client: p.client // null for global parameters
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/parameters/:id
 * Get a single parameter by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const parameter = await prisma.parameter.findUnique({
      where: { id: req.params.id },
      include: {
        client: {
          select: { id: true, name: true }
        }
      }
    });

    if (!parameter) {
      throw new AppError('Parameter not found', 404);
    }

    res.json({
      id: parameter.id,
      name: parameter.name,
      dataType: parameter.dataType,
      unit: parameter.unit,
      description: parameter.description,
      isGlobal: parameter.isGlobal,
      client: parameter.client
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/parameters
 * Create a new parameter
 * - If clientId is provided, creates a client-specific parameter (isGlobal = false)
 * - If clientId is not provided, creates a global parameter (isGlobal = true)
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createParameterSchema.parse(req.body);

    // If clientId is provided, verify the client exists
    if (data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: data.clientId } });
      if (!client) {
        throw new AppError('Client not found', 404);
      }
    }

    // Create the parameter
    const parameter = await prisma.parameter.create({
      data: {
        name: data.name,
        dataType: data.dataType,
        unit: data.unit,
        description: data.description,
        isGlobal: !data.clientId, // Global if no clientId provided
        clientId: data.clientId
      },
      include: {
        client: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      id: parameter.id,
      name: parameter.name,
      dataType: parameter.dataType,
      unit: parameter.unit,
      description: parameter.description,
      isGlobal: parameter.isGlobal,
      client: parameter.client
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/parameters/:id
 * Update a parameter
 * Note: Cannot change ownership (isGlobal/clientId) after creation
 */
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateParameterSchema.parse(req.body);

    // Verify parameter exists
    const existing = await prisma.parameter.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      throw new AppError('Parameter not found', 404);
    }

    // Update the parameter
    const parameter = await prisma.parameter.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        dataType: data.dataType,
        unit: data.unit === null ? null : data.unit,
        description: data.description === null ? null : data.description
      },
      include: {
        client: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      id: parameter.id,
      name: parameter.name,
      dataType: parameter.dataType,
      unit: parameter.unit,
      description: parameter.description,
      isGlobal: parameter.isGlobal,
      client: parameter.client
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/parameters/:id
 * Delete a parameter
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // Verify parameter exists
    const existing = await prisma.parameter.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      throw new AppError('Parameter not found', 404);
    }

    await prisma.parameter.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
