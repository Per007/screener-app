import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

const createCompanySchema = z.object({
  name: z.string().min(1),
  ticker: z.string().optional(),
  sector: z.string().optional()
});

const updateCompanySchema = createCompanySchema.partial();

const parameterValueSchema = z.object({
  parameterId: z.string().uuid(),
  value: z.union([z.number(), z.boolean(), z.string()]),
  asOfDate: z.string().datetime(),
  source: z.string().optional()
});

const bulkParameterValuesSchema = z.object({
  values: z.array(parameterValueSchema)
});

// List companies with optional filtering
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { sector, search } = req.query;
    const where: any = {};

    if (sector) {
      where.sector = sector;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { ticker: { contains: search as string } }
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    res.json(companies);
  } catch (err) {
    next(err);
  }
});

// Get company with parameter values
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        parameterValues: {
          include: { parameter: true },
          orderBy: { asOfDate: 'desc' }
        }
      }
    });
    if (!company) {
      throw new AppError('Company not found', 404);
    }
    res.json(company);
  } catch (err) {
    next(err);
  }
});

// Create company
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createCompanySchema.parse(req.body);
    const company = await prisma.company.create({ data });
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

// Update company
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateCompanySchema.parse(req.body);
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data
    });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

// Bulk update parameter values
router.put('/:id/parameters', authenticate, async (req, res, next) => {
  try {
    const { values } = bulkParameterValuesSchema.parse(req.body);
    const companyId = req.params.id;

    // Verify company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Upsert each parameter value
    const results = await Promise.all(
      values.map(async (v) => {
        const asOfDate = new Date(v.asOfDate);
        return prisma.companyParameterValue.upsert({
          where: {
            companyId_parameterId_asOfDate: {
              companyId,
              parameterId: v.parameterId,
              asOfDate
            }
          },
          create: {
            companyId,
            parameterId: v.parameterId,
            value: JSON.stringify(v.value),
            asOfDate,
            source: v.source
          },
          update: {
            value: JSON.stringify(v.value),
            source: v.source
          }
        });
      })
    );

    res.json({ updated: results.length });
  } catch (err) {
    next(err);
  }
});

// Delete company
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
