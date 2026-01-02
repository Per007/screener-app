import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { validateExpression } from '../services/rules-engine.service';

const router = Router();

// Schema for creating a criteria set (now supports optional clientId for client-specific sets)
const createCriteriaSetSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  effectiveDate: z.string().datetime(),
  clientId: z.string().uuid().optional(), // If provided, creates a client-specific criteria set
  rules: z.array(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    expression: z.any(),
    failureMessage: z.string().optional(),
    severity: z.enum(['exclude', 'warn', 'info']).optional()
  })).optional()
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  expression: z.any(),
  failureMessage: z.string().optional(),
  severity: z.enum(['exclude', 'warn', 'info']).optional()
});

// Schema for copying a criteria set to a client
const copyCriteriaSetSchema = z.object({
  clientId: z.string().uuid(),
  newName: z.string().min(1).optional(),
  newVersion: z.string().min(1).optional()
});

/**
 * GET /api/criteria-sets
 * List criteria sets with optional filtering
 * Query params:
 *   - clientId: If provided, returns global sets + sets owned by that client
 *   - globalOnly: If true, returns only global criteria sets
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { clientId, globalOnly } = req.query;

    // Build the where clause based on filters
    let where: any = {};

    if (globalOnly === 'true') {
      // Only return global criteria sets
      where.isGlobal = true;
    } else if (clientId && typeof clientId === 'string') {
      // Return global criteria sets AND sets owned by the specified client
      where.OR = [
        { isGlobal: true },
        { clientId: clientId }
      ];
    }
    // If no filter, return all criteria sets (for admin use)

    const criteriaSets = await prisma.criteriaSet.findMany({
      where,
      orderBy: [{ name: 'asc' }, { effectiveDate: 'desc' }],
      include: {
        _count: { select: { rules: true } },
        client: {
          select: { id: true, name: true }
        }
      }
    });

    // Format response to clearly indicate ownership
    const result = criteriaSets.map((cs) => ({
      id: cs.id,
      name: cs.name,
      version: cs.version,
      effectiveDate: cs.effectiveDate,
      createdAt: cs.createdAt,
      isGlobal: cs.isGlobal,
      client: cs.client, // null for global criteria sets
      _count: cs._count
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/criteria-sets/:id
 * Get a criteria set with all its rules
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const criteriaSet = await prisma.criteriaSet.findUnique({
      where: { id: req.params.id },
      include: {
        rules: true,
        client: {
          select: { id: true, name: true }
        }
      }
    });

    if (!criteriaSet) {
      throw new AppError('Criteria set not found', 404);
    }

    // Parse rule expressions from JSON strings
    const result = {
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      effectiveDate: criteriaSet.effectiveDate,
      createdAt: criteriaSet.createdAt,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client,
      rules: criteriaSet.rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        expression: JSON.parse(r.expression),
        failureMessage: r.failureMessage,
        severity: r.severity
      }))
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/criteria-sets
 * Create a new criteria set with optional rules
 * - If clientId is provided, creates a client-specific criteria set (isGlobal = false)
 * - If clientId is not provided, creates a global criteria set (isGlobal = true)
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createCriteriaSetSchema.parse(req.body);

    // If clientId is provided, verify the client exists
    if (data.clientId) {
      const client = await prisma.client.findUnique({ where: { id: data.clientId } });
      if (!client) {
        throw new AppError('Client not found', 404);
      }
    }

    // Validate all rule expressions
    if (data.rules) {
      for (const rule of data.rules) {
        const validation = validateExpression(rule.expression);
        if (!validation.valid) {
          throw new AppError(`Invalid rule "${rule.name}": ${validation.error}`, 400);
        }
      }
    }

    const criteriaSet = await prisma.criteriaSet.create({
      data: {
        name: data.name,
        version: data.version,
        effectiveDate: new Date(data.effectiveDate),
        isGlobal: !data.clientId, // Global if no clientId provided
        clientId: data.clientId,
        rules: data.rules ? {
          create: data.rules.map((r) => ({
            name: r.name,
            description: r.description,
            expression: JSON.stringify(r.expression),
            failureMessage: r.failureMessage,
            severity: r.severity || 'exclude'
          }))
        } : undefined
      },
      include: {
        rules: true,
        client: {
          select: { id: true, name: true }
        }
      }
    });

    // Format the response
    res.status(201).json({
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      effectiveDate: criteriaSet.effectiveDate,
      createdAt: criteriaSet.createdAt,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client,
      rules: criteriaSet.rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        expression: JSON.parse(r.expression),
        failureMessage: r.failureMessage,
        severity: r.severity
      }))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/criteria-sets/:id/copy
 * Copy a criteria set to a client's ownership
 * This creates a new client-specific criteria set based on an existing one (usually global)
 */
router.post('/:id/copy', authenticate, async (req, res, next) => {
  try {
    const data = copyCriteriaSetSchema.parse(req.body);

    // Verify the source criteria set exists
    const sourceCriteriaSet = await prisma.criteriaSet.findUnique({
      where: { id: req.params.id },
      include: { rules: true }
    });

    if (!sourceCriteriaSet) {
      throw new AppError('Source criteria set not found', 404);
    }

    // Verify the target client exists
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Create the copy with the new client ownership
    const copiedCriteriaSet = await prisma.criteriaSet.create({
      data: {
        name: data.newName || `${sourceCriteriaSet.name} (Copy)`,
        version: data.newVersion || sourceCriteriaSet.version,
        effectiveDate: new Date(),
        isGlobal: false, // Copies are always client-specific
        clientId: data.clientId,
        rules: {
          create: sourceCriteriaSet.rules.map((r) => ({
            name: r.name,
            description: r.description,
            expression: r.expression, // Already JSON string
            failureMessage: r.failureMessage,
            severity: r.severity
          }))
        }
      },
      include: {
        rules: true,
        client: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      id: copiedCriteriaSet.id,
      name: copiedCriteriaSet.name,
      version: copiedCriteriaSet.version,
      effectiveDate: copiedCriteriaSet.effectiveDate,
      createdAt: copiedCriteriaSet.createdAt,
      isGlobal: copiedCriteriaSet.isGlobal,
      client: copiedCriteriaSet.client,
      copiedFrom: {
        id: sourceCriteriaSet.id,
        name: sourceCriteriaSet.name
      },
      rules: copiedCriteriaSet.rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        expression: JSON.parse(r.expression),
        failureMessage: r.failureMessage,
        severity: r.severity
      }))
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/criteria-sets/:id/rules
 * Add a rule to a criteria set
 */
router.post('/:id/rules', authenticate, async (req, res, next) => {
  try {
    const data = createRuleSchema.parse(req.body);

    // Validate expression
    const validation = validateExpression(data.expression);
    if (!validation.valid) {
      throw new AppError(`Invalid rule expression: ${validation.error}`, 400);
    }

    // Verify criteria set exists
    const criteriaSet = await prisma.criteriaSet.findUnique({ where: { id: req.params.id } });
    if (!criteriaSet) {
      throw new AppError('Criteria set not found', 404);
    }

    const rule = await prisma.rule.create({
      data: {
        criteriaSetId: req.params.id,
        name: data.name,
        description: data.description,
        expression: JSON.stringify(data.expression),
        failureMessage: data.failureMessage,
        severity: data.severity || 'exclude'
      }
    });

    res.status(201).json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      expression: JSON.parse(rule.expression),
      failureMessage: rule.failureMessage,
      severity: rule.severity
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/criteria-sets/:id
 * Delete a criteria set
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // Verify criteria set exists
    const existing = await prisma.criteriaSet.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw new AppError('Criteria set not found', 404);
    }

    await prisma.criteriaSet.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/criteria-sets/:id/rules/:ruleId
 * Delete a rule from a criteria set
 */
router.delete('/:id/rules/:ruleId', authenticate, async (req, res, next) => {
  try {
    // Verify rule exists
    const existing = await prisma.rule.findUnique({ where: { id: req.params.ruleId } });
    if (!existing) {
      throw new AppError('Rule not found', 404);
    }

    await prisma.rule.delete({ where: { id: req.params.ruleId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
