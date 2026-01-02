import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

// Validation schemas for threshold types
const thresholdTypeEnum = z.enum(['max', 'min', 'exact', 'range', 'exclude_if_true']);

// Schema for adding a parameter to a client's selection
const addClientParameterSchema = z.object({
  parameterId: z.string().uuid(),
  thresholdType: thresholdTypeEnum.optional(),
  thresholdValue: z.string().optional() // JSON-encoded value
});

// Schema for updating a client parameter's threshold
const updateClientParameterSchema = z.object({
  thresholdType: thresholdTypeEnum.optional().nullable(),
  thresholdValue: z.string().optional().nullable()
});

/**
 * GET /api/clients/:clientId/parameters
 * List all parameters selected by a client (with their thresholds)
 */
router.get('/:clientId/parameters', authenticate, async (req, res, next) => {
  try {
    const { clientId } = req.params;

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Get all parameters selected by this client with their thresholds
    const clientParameters = await prisma.clientParameter.findMany({
      where: { clientId },
      include: {
        parameter: true // Include the full parameter details
      },
      orderBy: { createdAt: 'asc' }
    });

    // Format the response to include parameter details and threshold info
    const result = clientParameters.map((cp) => ({
      id: cp.id,
      parameterId: cp.parameterId,
      parameter: {
        id: cp.parameter.id,
        name: cp.parameter.name,
        dataType: cp.parameter.dataType,
        unit: cp.parameter.unit,
        description: cp.parameter.description,
        isGlobal: cp.parameter.isGlobal
      },
      thresholdType: cp.thresholdType,
      thresholdValue: cp.thresholdValue ? JSON.parse(cp.thresholdValue) : null,
      createdAt: cp.createdAt
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/clients/:clientId/parameters
 * Add a parameter to a client's selection with optional threshold
 */
router.post('/:clientId/parameters', authenticate, async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const data = addClientParameterSchema.parse(req.body);

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    // Verify parameter exists and is accessible to this client
    // (either global or owned by this client)
    const parameter = await prisma.parameter.findUnique({
      where: { id: data.parameterId }
    });

    if (!parameter) {
      throw new AppError('Parameter not found', 404);
    }

    // Check if parameter is accessible: must be global OR owned by this client
    if (!parameter.isGlobal && parameter.clientId !== clientId) {
      throw new AppError('Parameter is not accessible to this client', 403);
    }

    // Check if already selected
    const existing = await prisma.clientParameter.findUnique({
      where: {
        clientId_parameterId: {
          clientId,
          parameterId: data.parameterId
        }
      }
    });

    if (existing) {
      throw new AppError('Parameter is already selected by this client', 409);
    }

    // Validate threshold value matches threshold type
    if (data.thresholdType && data.thresholdValue) {
      validateThreshold(data.thresholdType, data.thresholdValue, parameter.dataType);
    }

    // Create the client parameter selection
    const clientParameter = await prisma.clientParameter.create({
      data: {
        clientId,
        parameterId: data.parameterId,
        thresholdType: data.thresholdType,
        thresholdValue: data.thresholdValue
      },
      include: { parameter: true }
    });

    res.status(201).json({
      id: clientParameter.id,
      parameterId: clientParameter.parameterId,
      parameter: {
        id: clientParameter.parameter.id,
        name: clientParameter.parameter.name,
        dataType: clientParameter.parameter.dataType,
        unit: clientParameter.parameter.unit,
        description: clientParameter.parameter.description,
        isGlobal: clientParameter.parameter.isGlobal
      },
      thresholdType: clientParameter.thresholdType,
      thresholdValue: clientParameter.thresholdValue ? JSON.parse(clientParameter.thresholdValue) : null,
      createdAt: clientParameter.createdAt
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/clients/:clientId/parameters/:parameterId
 * Update threshold for a selected parameter
 */
router.put('/:clientId/parameters/:parameterId', authenticate, async (req, res, next) => {
  try {
    const { clientId, parameterId } = req.params;
    const data = updateClientParameterSchema.parse(req.body);

    // Find the client parameter
    const clientParameter = await prisma.clientParameter.findUnique({
      where: {
        clientId_parameterId: {
          clientId,
          parameterId
        }
      },
      include: { parameter: true }
    });

    if (!clientParameter) {
      throw new AppError('Parameter is not selected by this client', 404);
    }

    // Validate threshold if being updated
    if (data.thresholdType && data.thresholdValue) {
      validateThreshold(data.thresholdType, data.thresholdValue, clientParameter.parameter.dataType);
    }

    // Update the client parameter
    const updated = await prisma.clientParameter.update({
      where: {
        clientId_parameterId: {
          clientId,
          parameterId
        }
      },
      data: {
        thresholdType: data.thresholdType === null ? null : data.thresholdType,
        thresholdValue: data.thresholdValue === null ? null : data.thresholdValue
      },
      include: { parameter: true }
    });

    res.json({
      id: updated.id,
      parameterId: updated.parameterId,
      parameter: {
        id: updated.parameter.id,
        name: updated.parameter.name,
        dataType: updated.parameter.dataType,
        unit: updated.parameter.unit,
        description: updated.parameter.description,
        isGlobal: updated.parameter.isGlobal
      },
      thresholdType: updated.thresholdType,
      thresholdValue: updated.thresholdValue ? JSON.parse(updated.thresholdValue) : null,
      createdAt: updated.createdAt
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/clients/:clientId/parameters/:parameterId
 * Remove a parameter from a client's selection
 */
router.delete('/:clientId/parameters/:parameterId', authenticate, async (req, res, next) => {
  try {
    const { clientId, parameterId } = req.params;

    // Check if exists
    const clientParameter = await prisma.clientParameter.findUnique({
      where: {
        clientId_parameterId: {
          clientId,
          parameterId
        }
      }
    });

    if (!clientParameter) {
      throw new AppError('Parameter is not selected by this client', 404);
    }

    // Delete the selection
    await prisma.clientParameter.delete({
      where: {
        clientId_parameterId: {
          clientId,
          parameterId
        }
      }
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * Helper function to validate threshold value against threshold type and parameter data type
 */
function validateThreshold(thresholdType: string, thresholdValue: string, paramDataType: string): void {
  let parsedValue: any;
  
  try {
    parsedValue = JSON.parse(thresholdValue);
  } catch {
    throw new AppError('thresholdValue must be valid JSON', 400);
  }

  switch (thresholdType) {
    case 'max':
    case 'min':
      // For max/min, the parameter should be numeric and value should be a number
      if (paramDataType !== 'number') {
        throw new AppError(`Threshold type '${thresholdType}' is only valid for numeric parameters`, 400);
      }
      if (typeof parsedValue !== 'number') {
        throw new AppError(`Threshold value for '${thresholdType}' must be a number`, 400);
      }
      break;

    case 'exact':
      // For exact, the value type should match the parameter data type
      if (paramDataType === 'number' && typeof parsedValue !== 'number') {
        throw new AppError('Threshold value must be a number for numeric parameters', 400);
      }
      if (paramDataType === 'boolean' && typeof parsedValue !== 'boolean') {
        throw new AppError('Threshold value must be a boolean for boolean parameters', 400);
      }
      if (paramDataType === 'string' && typeof parsedValue !== 'string') {
        throw new AppError('Threshold value must be a string for string parameters', 400);
      }
      break;

    case 'range':
      // For range, value should be an array of two numbers [min, max]
      if (paramDataType !== 'number') {
        throw new AppError("Threshold type 'range' is only valid for numeric parameters", 400);
      }
      if (!Array.isArray(parsedValue) || parsedValue.length !== 2) {
        throw new AppError('Range threshold value must be an array of two numbers [min, max]', 400);
      }
      if (typeof parsedValue[0] !== 'number' || typeof parsedValue[1] !== 'number') {
        throw new AppError('Range values must be numbers', 400);
      }
      if (parsedValue[0] > parsedValue[1]) {
        throw new AppError('Range minimum must be less than or equal to maximum', 400);
      }
      break;

    case 'exclude_if_true':
      // For exclude_if_true, the parameter should be boolean
      if (paramDataType !== 'boolean') {
        throw new AppError("Threshold type 'exclude_if_true' is only valid for boolean parameters", 400);
      }
      break;
  }
}

export default router;

