import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../models/types';
import * as screeningService from '../services/screening.service';

const router = Router();

const screenSchema = z.object({
  portfolioId: z.string().uuid(),
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

const individualCompanyScreenSchema = z.object({
  companyId: z.string().uuid(),
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

const multipleCompaniesScreenSchema = z.object({
  companyIds: z.array(z.string().uuid()),
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

const sectorScreenSchema = z.object({
  sector: z.string(),
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

const regionScreenSchema = z.object({
  region: z.string(),
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

const customCriteriaScreenSchema = z.object({
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

// Screen a portfolio
router.post('/screen', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = screenSchema.parse(req.body);
    const result = await screeningService.screenPortfolio({
      portfolioId: data.portfolioId,
      criteriaSetId: data.criteriaSetId,
      userId: req.user!.id,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// List screening results
router.get('/screening-results', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const { portfolioId, criteriaSetId } = req.query;
    const results = await screeningService.getScreeningResults({
      portfolioId: portfolioId as string,
      criteriaSetId: criteriaSetId as string
    });
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// Get screening result by ID
router.get('/screening-results/:id', authenticate, async (req, res, next) => {
  try {
    const result = await screeningService.getScreeningResultById(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Screen individual company
router.post('/screen/company', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = individualCompanyScreenSchema.parse(req.body);
    const result = await screeningService.screenIndividualCompany({
      companyId: data.companyId,
      criteriaSetId: data.criteriaSetId,
      userId: req.user!.id,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Screen multiple companies
router.post('/screen/companies', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = multipleCompaniesScreenSchema.parse(req.body);
    const result = await screeningService.screenMultipleCompanies({
      companyIds: data.companyIds,
      criteriaSetId: data.criteriaSetId,
      userId: req.user!.id,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Screen companies by sector
router.post('/screen/sector', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = sectorScreenSchema.parse(req.body);
    const result = await screeningService.screenBySector({
      sector: data.sector,
      criteriaSetId: data.criteriaSetId,
      userId: req.user!.id,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Screen companies by region
router.post('/screen/region', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = regionScreenSchema.parse(req.body);
    const result = await screeningService.screenByRegion({
      region: data.region,
      criteriaSetId: data.criteriaSetId,
      userId: req.user!.id,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Screen companies with custom criteria
router.post('/screen/custom', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = customCriteriaScreenSchema.parse(req.body);
    const result = await screeningService.screenWithCustomCriteria({
      criteriaSetId: data.criteriaSetId,
      userId: req.user!.id,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
