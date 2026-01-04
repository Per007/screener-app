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

// Validation schemas
const validatePortfolioSchema = z.object({
  portfolioId: z.string().uuid(),
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

const validateCompaniesSchema = z.object({
  companyIds: z.array(z.string().uuid()),
  criteriaSetId: z.string().uuid(),
  asOfDate: z.string().datetime().optional()
});

// =============================================================================
// Validation Endpoints - Call these BEFORE running a screening
// =============================================================================

/**
 * POST /screen/validate
 * Validates that all parameters required by the criteria set are available
 * for all companies in the portfolio. Call this before running a screening
 * to catch missing data issues early.
 * 
 * Request body:
 *   - portfolioId: UUID of the portfolio to validate
 *   - criteriaSetId: UUID of the criteria set to validate against
 *   - asOfDate: (optional) Date to use for parameter value lookups
 * 
 * Response:
 *   - isValid: boolean - true if all required parameters are available
 *   - totalCompanies: number - total companies in portfolio
 *   - companiesWithCompleteData: number - companies with all required parameters
 *   - companiesWithMissingData: number - companies missing at least one parameter
 *   - requiredParameters: string[] - all parameters needed by the rules
 *   - missingParameters: string[] - parameters with no data at all
 *   - companyIssues: array of { companyId, companyName, missingParameters }
 */
router.post('/screen/validate', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = validatePortfolioSchema.parse(req.body);
    const result = await screeningService.validatePortfolioParameters({
      portfolioId: data.portfolioId,
      criteriaSetId: data.criteriaSetId,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /screen/validate/companies
 * Validates that all parameters required by the criteria set are available
 * for a specific set of companies.
 * 
 * Request body:
 *   - companyIds: array of company UUIDs to validate
 *   - criteriaSetId: UUID of the criteria set to validate against
 *   - asOfDate: (optional) Date to use for parameter value lookups
 */
router.post('/screen/validate/companies', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const data = validateCompaniesSchema.parse(req.body);
    const result = await screeningService.validateCompaniesParameters({
      companyIds: data.companyIds,
      criteriaSetId: data.criteriaSetId,
      asOfDate: data.asOfDate ? new Date(data.asOfDate) : undefined
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// =============================================================================
// Screening Endpoints
// =============================================================================

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

// Delete a screening result
router.delete('/screening-results/:id', authenticate, async (req, res, next) => {
  try {
    const result = await screeningService.deleteScreeningResult(req.params.id);
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
