import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireRole('admin'));

/**
 * Get database statistics - counts for all tables
 * GET /admin/stats
 */
router.get('/stats', async (req, res, next) => {
  try {
    // Run all count queries in parallel for better performance
    const [
      usersCount,
      clientsCount,
      portfoliosCount,
      companiesCount,
      parametersCount,
      companyParameterValuesCount,
      portfolioHoldingsCount,
      criteriaSetsCount,
      rulesCount,
      screeningResultsCount,
      screeningCompanyResultsCount,
      clientParametersCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.portfolio.count(),
      prisma.company.count(),
      prisma.parameter.count(),
      prisma.companyParameterValue.count(),
      prisma.portfolioHolding.count(),
      prisma.criteriaSet.count(),
      prisma.rule.count(),
      prisma.screeningResult.count(),
      prisma.screeningCompanyResult.count(),
      prisma.clientParameter.count()
    ]);

    res.json({
      users: usersCount,
      clients: clientsCount,
      portfolios: portfoliosCount,
      companies: companiesCount,
      parameters: parametersCount,
      companyParameterValues: companyParameterValuesCount,
      portfolioHoldings: portfolioHoldingsCount,
      criteriaSets: criteriaSetsCount,
      rules: rulesCount,
      screeningResults: screeningResultsCount,
      screeningCompanyResults: screeningCompanyResultsCount,
      clientParameters: clientParametersCount
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all screening results
 * DELETE /admin/screening-results
 */
router.delete('/screening-results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // ScreeningCompanyResult has onDelete: Cascade, so deleting ScreeningResult will cascade
    const result = await prisma.screeningResult.deleteMany();
    res.json({ 
      message: 'All screening results cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all company parameter values
 * DELETE /admin/parameter-values
 */
router.delete('/parameter-values', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.companyParameterValue.deleteMany();
    res.json({ 
      message: 'All company parameter values cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all portfolios (and their holdings via cascade)
 * DELETE /admin/portfolios
 */
router.delete('/portfolios', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Holdings will be cascade deleted
    const result = await prisma.portfolio.deleteMany();
    res.json({ 
      message: 'All portfolios cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all companies (and their parameter values, holdings, screening results via cascade)
 * DELETE /admin/companies
 */
router.delete('/companies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.company.deleteMany();
    res.json({ 
      message: 'All companies cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all criteria sets (and their rules via cascade)
 * DELETE /admin/criteria-sets
 */
router.delete('/criteria-sets', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.criteriaSet.deleteMany();
    res.json({ 
      message: 'All criteria sets cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all parameters (global and client-specific)
 * DELETE /admin/parameters
 */
router.delete('/parameters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.parameter.deleteMany();
    res.json({ 
      message: 'All parameters cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all client parameters (threshold settings)
 * DELETE /admin/client-parameters
 */
router.delete('/client-parameters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.clientParameter.deleteMany();
    res.json({ 
      message: 'All client parameters cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Clear all clients (and related data via cascade)
 * DELETE /admin/clients
 */
router.delete('/clients', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.client.deleteMany();
    res.json({ 
      message: 'All clients cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete non-admin users
 * DELETE /admin/users
 */
router.delete('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only delete non-admin users to prevent locking out all admins
    const result = await prisma.user.deleteMany({
      where: {
        role: { not: 'admin' }
      }
    });
    res.json({ 
      message: 'All non-admin users cleared',
      deletedCount: result.count 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Reset entire database (except admin users)
 * This is a dangerous operation that clears most data
 * DELETE /admin/reset
 */
router.delete('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Order matters due to foreign key constraints
    // Delete in order of dependencies (child tables first)
    const results = {
      screeningCompanyResults: 0,
      screeningResults: 0,
      portfolioHoldings: 0,
      companyParameterValues: 0,
      clientParameters: 0,
      rules: 0,
      portfolios: 0,
      criteriaSets: 0,
      companies: 0,
      parameters: 0,
      clients: 0,
      users: 0
    };

    // 1. Clear screening company results
    const r1 = await prisma.screeningCompanyResult.deleteMany();
    results.screeningCompanyResults = r1.count;

    // 2. Clear screening results
    const r2 = await prisma.screeningResult.deleteMany();
    results.screeningResults = r2.count;

    // 3. Clear portfolio holdings
    const r3 = await prisma.portfolioHolding.deleteMany();
    results.portfolioHoldings = r3.count;

    // 4. Clear company parameter values
    const r4 = await prisma.companyParameterValue.deleteMany();
    results.companyParameterValues = r4.count;

    // 5. Clear client parameters
    const r5 = await prisma.clientParameter.deleteMany();
    results.clientParameters = r5.count;

    // 6. Clear rules
    const r6 = await prisma.rule.deleteMany();
    results.rules = r6.count;

    // 7. Clear portfolios
    const r7 = await prisma.portfolio.deleteMany();
    results.portfolios = r7.count;

    // 8. Clear criteria sets
    const r8 = await prisma.criteriaSet.deleteMany();
    results.criteriaSets = r8.count;

    // 9. Clear companies
    const r9 = await prisma.company.deleteMany();
    results.companies = r9.count;

    // 10. Clear parameters
    const r10 = await prisma.parameter.deleteMany();
    results.parameters = r10.count;

    // 11. Clear clients
    const r11 = await prisma.client.deleteMany();
    results.clients = r11.count;

    // 12. Clear non-admin users
    const r12 = await prisma.user.deleteMany({
      where: { role: { not: 'admin' } }
    });
    results.users = r12.count;

    res.json({
      message: 'Database reset complete (admin users preserved)',
      deletedCounts: results
    });
  } catch (err) {
    next(err);
  }
});

export default router;
