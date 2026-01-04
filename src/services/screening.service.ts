import prisma from '../lib/prisma';
import { evaluateExpression, getFailureReason, getActualValue } from './rules-engine.service';
import { RuleExpression, ComparisonCondition, RuleResult, CompanyScreeningResult, ScreeningSummary } from '../models/types';
import { AppError } from '../middleware/error-handler';

// =============================================================================
// Parameter Extraction & Validation Types
// =============================================================================

/**
 * Represents a company that is missing required parameters
 */
interface CompanyMissingParameters {
  companyId: string;
  companyName: string;
  missingParameters: string[];
}

/**
 * Validation result returned before running a screening
 */
export interface ParameterValidationResult {
  /** Whether all required parameters are available for all companies */
  isValid: boolean;
  /** Total number of companies in the portfolio */
  totalCompanies: number;
  /** Number of companies with complete parameter data */
  companiesWithCompleteData: number;
  /** Number of companies missing at least one parameter */
  companiesWithMissingData: number;
  /** List of all parameters required by the criteria set rules */
  requiredParameters: string[];
  /** List of parameters that are completely missing (no company has this value) */
  missingParameters: string[];
  /** Detailed breakdown of which companies are missing which parameters */
  companyIssues: CompanyMissingParameters[];
}

// =============================================================================
// Helper Functions for Parameter Extraction
// =============================================================================

/**
 * Recursively extracts all parameter names from a rule expression.
 * This handles nested logical expressions (AND, OR, NOT) and comparison conditions.
 * 
 * @param expression - The rule expression to extract parameters from
 * @returns Array of unique parameter names used in the expression
 */
export function extractParametersFromExpression(expression: RuleExpression): string[] {
  const parameters: Set<string> = new Set();
  
  // Helper function for recursive extraction
  function extract(expr: RuleExpression): void {
    if (expr.type === 'comparison') {
      // Comparison conditions have a single parameter
      parameters.add(expr.parameter);
    } else if (expr.type === 'AND' || expr.type === 'OR' || expr.type === 'NOT') {
      // Logical conditions have nested conditions
      for (const condition of expr.conditions) {
        extract(condition);
      }
    }
  }
  
  extract(expression);
  return Array.from(parameters);
}

/**
 * Extracts all parameter names from all rules in a criteria set.
 * 
 * @param rules - Array of rules with JSON-encoded expressions
 * @returns Array of unique parameter names required by all rules
 */
export function extractAllParametersFromRules(rules: { expression: string }[]): string[] {
  const allParameters: Set<string> = new Set();
  
  for (const rule of rules) {
    try {
      const expression = JSON.parse(rule.expression) as RuleExpression;
      const params = extractParametersFromExpression(expression);
      params.forEach(p => allParameters.add(p));
    } catch (error) {
      // If we can't parse the expression, log a warning but continue
      console.warn(`[Validation] Could not parse rule expression: ${rule.expression}`);
    }
  }
  
  return Array.from(allParameters);
}

// =============================================================================
// Validation Functions
// =============================================================================

interface ValidatePortfolioInput {
  portfolioId: string;
  criteriaSetId: string;
  asOfDate?: Date;
}

interface ValidateCompaniesInput {
  companyIds: string[];
  criteriaSetId: string;
  asOfDate?: Date;
}

/**
 * Validates that all parameters required by the criteria set rules are available
 * for all companies in the portfolio. This should be called BEFORE running a screening.
 * 
 * @param input - Portfolio ID, criteria set ID, and optional as-of date
 * @returns Validation result with detailed information about missing parameters
 */
export async function validatePortfolioParameters(input: ValidatePortfolioInput): Promise<ParameterValidationResult> {
  const { portfolioId, criteriaSetId, asOfDate = new Date() } = input;

  // Fetch portfolio with holdings
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

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: { rules: true }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Extract all required parameters from the rules
  const requiredParameters = extractAllParametersFromRules(criteriaSet.rules);
  
  if (requiredParameters.length === 0) {
    // No parameters required means validation passes
    return {
      isValid: true,
      totalCompanies: portfolio.holdings.length,
      companiesWithCompleteData: portfolio.holdings.length,
      companiesWithMissingData: 0,
      requiredParameters: [],
      missingParameters: [],
      companyIssues: []
    };
  }

  // Get company IDs from portfolio
  const companyIds = portfolio.holdings.map(h => h.companyId);
  
  // Build company name map for the result
  const companyNameMap = new Map<string, string>();
  portfolio.holdings.forEach(h => {
    companyNameMap.set(h.company.id, h.company.name);
  });

  // Validate parameters for these companies
  return validateCompanyParametersInternal(
    companyIds,
    companyNameMap,
    requiredParameters,
    asOfDate
  );
}

/**
 * Validates that all parameters required by the criteria set rules are available
 * for a specific set of companies.
 * 
 * @param input - Company IDs, criteria set ID, and optional as-of date
 * @returns Validation result with detailed information about missing parameters
 */
export async function validateCompaniesParameters(input: ValidateCompaniesInput): Promise<ParameterValidationResult> {
  const { companyIds, criteriaSetId, asOfDate = new Date() } = input;

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: { rules: true }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Fetch companies
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } }
  });

  if (companies.length === 0) {
    throw new AppError('No companies found', 404);
  }

  // Extract all required parameters from the rules
  const requiredParameters = extractAllParametersFromRules(criteriaSet.rules);
  
  if (requiredParameters.length === 0) {
    return {
      isValid: true,
      totalCompanies: companies.length,
      companiesWithCompleteData: companies.length,
      companiesWithMissingData: 0,
      requiredParameters: [],
      missingParameters: [],
      companyIssues: []
    };
  }

  // Build company name map
  const companyNameMap = new Map<string, string>();
  companies.forEach(c => {
    companyNameMap.set(c.id, c.name);
  });

  return validateCompanyParametersInternal(
    companyIds,
    companyNameMap,
    requiredParameters,
    asOfDate
  );
}

/**
 * Internal helper that performs the actual parameter validation logic.
 * This is shared between portfolio and company validation.
 */
async function validateCompanyParametersInternal(
  companyIds: string[],
  companyNameMap: Map<string, string>,
  requiredParameters: string[],
  asOfDate: Date
): Promise<ParameterValidationResult> {
  // Fetch all parameter values for these companies
  let parameterValues = await prisma.companyParameterValue.findMany({
    where: {
      companyId: { in: companyIds },
      asOfDate: { lte: asOfDate }
    },
    include: { parameter: true },
    orderBy: { asOfDate: 'desc' }
  });

  // Fallback: Get values for companies without any data (same logic as screening)
  const companiesWithValues = new Set(parameterValues.map(pv => pv.companyId));
  const companiesWithoutValues = companyIds.filter(id => !companiesWithValues.has(id));
  
  if (companiesWithoutValues.length > 0) {
    const fallbackValues = await prisma.companyParameterValue.findMany({
      where: {
        companyId: { in: companiesWithoutValues }
      },
      include: { parameter: true },
      orderBy: { asOfDate: 'desc' }
    });
    parameterValues = [...parameterValues, ...fallbackValues];
  }

  // Build parameter map per company (track which parameters each company has)
  const companyParamSets = new Map<string, Set<string>>();
  
  for (const companyId of companyIds) {
    companyParamSets.set(companyId, new Set());
  }

  for (const pv of parameterValues) {
    const paramSet = companyParamSets.get(pv.companyId);
    if (paramSet) {
      paramSet.add(pv.parameter.name);
    }
  }

  // Check which companies are missing which parameters
  const companyIssues: CompanyMissingParameters[] = [];
  const globalMissingParams = new Set<string>(requiredParameters);
  let companiesWithCompleteData = 0;

  for (const companyId of companyIds) {
    const availableParams = companyParamSets.get(companyId) || new Set();
    const missingParams: string[] = [];

    for (const requiredParam of requiredParameters) {
      if (!availableParams.has(requiredParam)) {
        missingParams.push(requiredParam);
      } else {
        // If at least one company has this parameter, remove from global missing
        globalMissingParams.delete(requiredParam);
      }
    }

    if (missingParams.length > 0) {
      companyIssues.push({
        companyId,
        companyName: companyNameMap.get(companyId) || 'Unknown',
        missingParameters: missingParams
      });
    } else {
      companiesWithCompleteData++;
    }
  }

  // Sort company issues by number of missing parameters (most issues first)
  companyIssues.sort((a, b) => b.missingParameters.length - a.missingParameters.length);

  return {
    isValid: companyIssues.length === 0,
    totalCompanies: companyIds.length,
    companiesWithCompleteData,
    companiesWithMissingData: companyIssues.length,
    requiredParameters,
    missingParameters: Array.from(globalMissingParams),
    companyIssues
  };
}

interface ScreeningInput {
  portfolioId: string;
  criteriaSetId: string;
  userId: string;
  asOfDate?: Date;
}

interface IndividualCompanyScreeningInput {
  companyId: string;
  criteriaSetId: string;
  userId: string;
  asOfDate?: Date;
}

interface MultipleCompaniesScreeningInput {
  companyIds: string[];
  criteriaSetId: string;
  userId: string;
  asOfDate?: Date;
}

interface SectorScreeningInput {
  sector: string;
  criteriaSetId: string;
  userId: string;
  asOfDate?: Date;
}

interface RegionScreeningInput {
  region: string;
  criteriaSetId: string;
  userId: string;
  asOfDate?: Date;
}

interface CustomCriteriaScreeningInput {
  criteriaSetId: string;
  userId: string;
  asOfDate?: Date;
  // Additional custom filters can be added here
}

interface ScreeningInput {
  portfolioId: string;
  criteriaSetId: string;
  userId: string;
  asOfDate?: Date;
}

export async function screenPortfolio(input: ScreeningInput) {
  const { portfolioId, criteriaSetId, userId, asOfDate = new Date() } = input;

  // Fetch portfolio with holdings
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId },
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

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: {
      rules: true,
      client: { select: { id: true, name: true } }
    }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Validate that the client can access this criteria set
  // The criteria set must be global OR owned by the portfolio's client
  if (!criteriaSet.isGlobal && criteriaSet.clientId !== portfolio.clientId) {
    throw new AppError(
      'This criteria set is not accessible to the portfolio\'s client. ' +
      'Only global criteria sets or criteria sets owned by the client can be used.',
      403
    );
  }

  // Get company IDs in portfolio
  const companyIds = portfolio.holdings.map((h) => h.companyId);

  // Fetch parameter values for all companies (with date filter)
  let parameterValues = await prisma.companyParameterValue.findMany({
    where: {
      companyId: { in: companyIds },
      asOfDate: { lte: asOfDate }
    },
    include: { parameter: true },
    orderBy: { asOfDate: 'desc' }
  });

  // If no values found with date filter for some companies, get most recent values regardless of date
  const companiesWithValues = new Set(parameterValues.map(pv => pv.companyId));
  const companiesWithoutValues = companyIds.filter(id => !companiesWithValues.has(id));
  
  if (companiesWithoutValues.length > 0) {
    const fallbackValues = await prisma.companyParameterValue.findMany({
      where: {
        companyId: { in: companiesWithoutValues }
      },
      include: { parameter: true },
      orderBy: { asOfDate: 'desc' }
    });
    parameterValues = [...parameterValues, ...fallbackValues];
  }

  // Build parameter value maps per company (most recent value for each parameter)
  const companyParamMaps = new Map<string, Map<string, number | boolean | string>>();

  for (const companyId of companyIds) {
    const paramMap = new Map<string, number | boolean | string>();
    companyParamMaps.set(companyId, paramMap);
  }

  for (const pv of parameterValues) {
    const map = companyParamMaps.get(pv.companyId)!;
    // Only set if not already set (since ordered by desc, first is most recent)
    if (!map.has(pv.parameter.name)) {
      const value = JSON.parse(pv.value);
      map.set(pv.parameter.name, value);
    }
  }

  // Debug: Log parameter availability for portfolio screening
  const ruleParameters = criteriaSet.rules.map(rule => {
    try {
      const expr = JSON.parse(rule.expression);
      return expr.type === 'comparison' ? expr.parameter : null;
    } catch {
      return null;
    }
  }).filter(p => p !== null) as string[];

  console.log(`\n[Portfolio Screening] Portfolio: ${portfolio.name} (${portfolioId})`);
  console.log(`[Portfolio Screening] Companies in portfolio: ${companyIds.length}`);
  console.log(`[Portfolio Screening] Total parameter values found: ${parameterValues.length}`);
  console.log(`[Portfolio Screening] Parameters expected by rules:`, ruleParameters);

  // Screen each company
  const companyResults: CompanyScreeningResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const holding of portfolio.holdings) {
    const company = holding.company;
    const paramMap = companyParamMaps.get(company.id)!;
    
    // Debug logging for each company with missing parameters
    const foundParams = Array.from(paramMap.keys());
    const missingParams = ruleParameters.filter(p => !foundParams.includes(p));
    
    if (missingParams.length > 0) {
      const companyValues = parameterValues.filter(pv => pv.companyId === company.id);
      console.log(`\n[Portfolio Screening] Company: ${company.name} (${company.id})`);
      console.log(`[Portfolio Screening]   Missing parameters:`, missingParams);
      console.log(`[Portfolio Screening]   Found parameters:`, foundParams);
      console.log(`[Portfolio Screening]   Parameter values in DB for this company: ${companyValues.length}`);
      if (companyValues.length > 0) {
        console.log(`[Portfolio Screening]   Raw values:`);
        companyValues.forEach(pv => {
          console.log(`     - ${pv.parameter.name}: ${pv.value} (asOfDate: ${pv.asOfDate.toISOString()})`);
        });
      } else {
        console.log(`[Portfolio Screening]   ⚠️ NO PARAMETER VALUES FOUND IN DATABASE FOR THIS COMPANY`);
      }
    }

    const ruleResults: RuleResult[] = [];
    let companyPassed = true;

    for (const rule of criteriaSet.rules) {
      const expression = JSON.parse(rule.expression) as RuleExpression;
      // Expression describes the VIOLATION condition (problematic range)
      // If expression is TRUE, the rule is violated (not passed)
      const violated = evaluateExpression(expression, paramMap);
      const passed = !violated;

      // Get actual value and threshold for display (works for all rules, passed or failed)
      const { actualValue, threshold } = getActualValue(expression, paramMap);

      let failureReason: string | undefined;
      if (!passed && expression.type === 'comparison') {
        failureReason = getFailureReason(expression as ComparisonCondition, paramMap, rule.failureMessage || undefined);
      } else if (!passed) {
        failureReason = rule.failureMessage || 'Rule condition not met';
      }

      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        severity: rule.severity,
        failureReason,
        actualValue,
        threshold
      });

      // Only 'exclude' severity rules affect pass/fail status
      if (!passed && rule.severity === 'exclude') {
        companyPassed = false;
      }
    }

    if (companyPassed) {
      passedCount++;
    } else {
      failedCount++;
    }

    companyResults.push({
      companyId: company.id,
      companyName: company.name,
      passed: companyPassed,
      ruleResults
    });
  }

  const summary: ScreeningSummary = {
    totalHoldings: portfolio.holdings.length,
    passed: passedCount,
    failed: failedCount,
    passRate: portfolio.holdings.length > 0 ? Math.round((passedCount / portfolio.holdings.length) * 100) : 0
  };

  // Save screening result
  const screeningResult = await prisma.screeningResult.create({
    data: {
      portfolioId,
      criteriaSetId,
      userId,
      asOfDate,
      summary: JSON.stringify(summary),
      companyResults: {
        create: companyResults.map((cr) => ({
          companyId: cr.companyId,
          passed: cr.passed,
          ruleResults: JSON.stringify(cr.ruleResults)
        }))
      }
    },
    include: {
      portfolio: { include: { client: true } },
      criteriaSet: true,
      companyResults: { include: { company: true } }
    }
  });

  // Format response
  return {
    id: screeningResult.id,
    screenedAt: screeningResult.screenedAt,
    asOfDate: screeningResult.asOfDate,
    portfolio: {
      id: portfolio.id,
      name: portfolio.name,
      client: portfolio.client
    },
    criteriaSet: {
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client
    },
    results: companyResults.map((cr) => ({
      company: {
        id: cr.companyId,
        name: cr.companyName
      },
      passed: cr.passed,
      ruleResults: cr.ruleResults
    })),
    summary
  };
}

export async function getScreeningResults(filters: {
  portfolioId?: string;
  criteriaSetId?: string;
  userId?: string;
}) {
  const where: any = {};
  if (filters.portfolioId) where.portfolioId = filters.portfolioId;
  if (filters.criteriaSetId) where.criteriaSetId = filters.criteriaSetId;
  if (filters.userId) where.userId = filters.userId;

  const results = await prisma.screeningResult.findMany({
    where,
    orderBy: { screenedAt: 'desc' },
    include: {
      portfolio: { include: { client: true } },
      criteriaSet: true,
      user: { select: { id: true, name: true, email: true } },
      companyResults: { include: { company: true } }  // Include company results for weight calculations
    }
  });

  return results.map((r) => ({
    ...r,
    summary: JSON.parse(r.summary),
    // Parse ruleResults JSON for each company result
    companyResults: r.companyResults.map((cr) => ({
      ...cr,
      ruleResults: JSON.parse(cr.ruleResults)
    }))
  }));
}

export async function getScreeningResultById(id: string) {
  const result = await prisma.screeningResult.findUnique({
    where: { id },
    include: {
      portfolio: { include: { client: true } },
      criteriaSet: { include: { rules: true } },
      user: { select: { id: true, name: true, email: true } },
      companyResults: { include: { company: true } }
    }
  });

  if (!result) {
    throw new AppError('Screening result not found', 404);
  }

  return {
    ...result,
    summary: JSON.parse(result.summary),
    companyResults: result.companyResults.map((cr) => ({
      ...cr,
      ruleResults: JSON.parse(cr.ruleResults)
    }))
  };
}

// Screen individual company
export async function screenIndividualCompany(input: IndividualCompanyScreeningInput) {
  const { companyId, criteriaSetId, userId, asOfDate = new Date() } = input;

  // Fetch company
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: {
      rules: true,
      client: { select: { id: true, name: true } }
    }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Fetch parameter values for the company (with date filter)
  let parameterValues = await prisma.companyParameterValue.findMany({
    where: {
      companyId,
      asOfDate: { lte: asOfDate }
    },
    include: { parameter: true },
    orderBy: { asOfDate: 'desc' }
  });

  // If no values found with date filter, try to get the most recent values regardless of date
  // This handles cases where values exist but have a future asOfDate
  if (parameterValues.length === 0) {
    parameterValues = await prisma.companyParameterValue.findMany({
      where: {
        companyId
      },
      include: { parameter: true },
      orderBy: { asOfDate: 'desc' }
    });
  }

  // Build parameter value map (most recent value for each parameter)
  const paramMap = new Map<string, number | boolean | string>();

  for (const pv of parameterValues) {
    // Only set if not already set (since ordered by desc, first is most recent)
    if (!paramMap.has(pv.parameter.name)) {
      const value = JSON.parse(pv.value);
      paramMap.set(pv.parameter.name, value);
    }
  }

  // Debug: Log what parameters were found vs what rules expect
  const ruleParameters = criteriaSet.rules.map(rule => {
    try {
      const expr = JSON.parse(rule.expression);
      return expr.type === 'comparison' ? expr.parameter : null;
    } catch {
      return null;
    }
  }).filter(p => p !== null) as string[];

  const foundParams = Array.from(paramMap.keys());
  const missingParams = ruleParameters.filter(p => !foundParams.includes(p));
  
  // Enhanced logging for debugging
  console.log(`\n[Screening Debug] Company: ${company.name} (${companyId})`);
  console.log(`[Screening Debug] Screening asOfDate: ${asOfDate.toISOString()}`);
  console.log(`[Screening Debug] Parameter values found in DB: ${parameterValues.length}`);
  console.log(`[Screening Debug] Parameters expected by rules:`, ruleParameters);
  console.log(`[Screening Debug] Parameters found in paramMap:`, foundParams);
  
  if (parameterValues.length > 0) {
    console.log(`[Screening Debug] Raw parameter values from DB:`);
    parameterValues.forEach(pv => {
      console.log(`  - ${pv.parameter.name}: ${pv.value} (asOfDate: ${pv.asOfDate.toISOString()})`);
    });
  }
  
  if (missingParams.length > 0) {
    console.log(`[Screening Debug] ⚠️ MISSING PARAMETERS:`, missingParams);
    console.log(`[Screening Debug] This will cause rules to fail with N/A values\n`);
  } else {
    console.log(`[Screening Debug] ✓ All required parameters found\n`);
  }

  // Screen the company
  const ruleResults: RuleResult[] = [];
  let companyPassed = true;

  for (const rule of criteriaSet.rules) {
    const expression = JSON.parse(rule.expression) as RuleExpression;
    // Expression describes the VIOLATION condition (problematic range)
    // If expression is TRUE, the rule is violated (not passed)
    const violated = evaluateExpression(expression, paramMap);
    const passed = !violated;

    // Get actual value and threshold for display
    const { actualValue, threshold } = getActualValue(expression, paramMap);

    let failureReason: string | undefined;
    if (!passed && expression.type === 'comparison') {
      failureReason = getFailureReason(expression as ComparisonCondition, paramMap, rule.failureMessage || undefined);
    } else if (!passed) {
      failureReason = rule.failureMessage || 'Rule condition not met';
    }

    ruleResults.push({
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      severity: rule.severity,
      failureReason,
      actualValue,
      threshold
    });

    // Only 'exclude' severity rules affect pass/fail status
    if (!passed && rule.severity === 'exclude') {
      companyPassed = false;
    }
  }

  const companyResult: CompanyScreeningResult = {
    companyId: company.id,
    companyName: company.name,
    passed: companyPassed,
    ruleResults
  };

  return {
    companyResult,
    criteriaSet: {
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client
    },
    screenedAt: new Date(),
    asOfDate
  };
}

// Screen multiple companies
export async function screenMultipleCompanies(input: MultipleCompaniesScreeningInput) {
  const { companyIds, criteriaSetId, userId, asOfDate = new Date() } = input;

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: {
      rules: true,
      client: { select: { id: true, name: true } }
    }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Fetch companies
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } }
  });

  if (companies.length === 0) {
    throw new AppError('No companies found', 404);
  }

  // Fetch parameter values for all companies (with date filter)
  let parameterValues = await prisma.companyParameterValue.findMany({
    where: {
      companyId: { in: companyIds },
      asOfDate: { lte: asOfDate }
    },
    include: { parameter: true },
    orderBy: { asOfDate: 'desc' }
  });

  // If no values found with date filter for some companies, get most recent values regardless of date
  const companiesWithValues = new Set(parameterValues.map(pv => pv.companyId));
  const companiesWithoutValues = companyIds.filter(id => !companiesWithValues.has(id));
  
  if (companiesWithoutValues.length > 0) {
    const fallbackValues = await prisma.companyParameterValue.findMany({
      where: {
        companyId: { in: companiesWithoutValues }
      },
      include: { parameter: true },
      orderBy: { asOfDate: 'desc' }
    });
    parameterValues = [...parameterValues, ...fallbackValues];
  }

  // Build parameter value maps per company (most recent value for each parameter)
  const companyParamMaps = new Map<string, Map<string, number | boolean | string>>();

  for (const company of companies) {
    const paramMap = new Map<string, number | boolean | string>();
    companyParamMaps.set(company.id, paramMap);
  }

  for (const pv of parameterValues) {
    const map = companyParamMaps.get(pv.companyId)!;
    // Only set if not already set (since ordered by desc, first is most recent)
    if (!map.has(pv.parameter.name)) {
      const value = JSON.parse(pv.value);
      map.set(pv.parameter.name, value);
    }
  }

  // Screen each company
  const companyResults: CompanyScreeningResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const company of companies) {
    const paramMap = companyParamMaps.get(company.id)!;

    const ruleResults: RuleResult[] = [];
    let companyPassed = true;

    for (const rule of criteriaSet.rules) {
      const expression = JSON.parse(rule.expression) as RuleExpression;
      // Expression describes the VIOLATION condition (problematic range)
      // If expression is TRUE, the rule is violated (not passed)
      const violated = evaluateExpression(expression, paramMap);
      const passed = !violated;

      // Get actual value and threshold for display
      const { actualValue, threshold } = getActualValue(expression, paramMap);

      let failureReason: string | undefined;
      if (!passed && expression.type === 'comparison') {
        failureReason = getFailureReason(expression as ComparisonCondition, paramMap, rule.failureMessage || undefined);
      } else if (!passed) {
        failureReason = rule.failureMessage || 'Rule condition not met';
      }

      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        severity: rule.severity,
        failureReason,
        actualValue,
        threshold
      });

      // Only 'exclude' severity rules affect pass/fail status
      if (!passed && rule.severity === 'exclude') {
        companyPassed = false;
      }
    }

    if (companyPassed) {
      passedCount++;
    } else {
      failedCount++;
    }

    companyResults.push({
      companyId: company.id,
      companyName: company.name,
      passed: companyPassed,
      ruleResults
    });
  }

  const summary: ScreeningSummary = {
    totalHoldings: companies.length,
    passed: passedCount,
    failed: failedCount,
    passRate: companies.length > 0 ? Math.round((passedCount / companies.length) * 100) : 0
  };

  return {
    criteriaSet: {
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client
    },
    results: companyResults,
    summary,
    screenedAt: new Date(),
    asOfDate
  };
}

// Screen companies by sector
export async function screenBySector(input: SectorScreeningInput) {
  const { sector, criteriaSetId, userId, asOfDate = new Date() } = input;

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: {
      rules: true,
      client: { select: { id: true, name: true } }
    }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Fetch companies in the specified sector
  const companies = await prisma.company.findMany({
    where: { sector }
  });

  if (companies.length === 0) {
    throw new AppError(`No companies found in sector: ${sector}`, 404);
  }

  // Fetch parameter values for all companies (with date filter)
  const companyIds = companies.map(c => c.id);
  let parameterValues = await prisma.companyParameterValue.findMany({
    where: {
      companyId: { in: companyIds },
      asOfDate: { lte: asOfDate }
    },
    include: { parameter: true },
    orderBy: { asOfDate: 'desc' }
  });

  // If no values found with date filter for some companies, get most recent values regardless of date
  const companiesWithValues = new Set(parameterValues.map(pv => pv.companyId));
  const companiesWithoutValues = companyIds.filter(id => !companiesWithValues.has(id));
  
  if (companiesWithoutValues.length > 0) {
    const fallbackValues = await prisma.companyParameterValue.findMany({
      where: {
        companyId: { in: companiesWithoutValues }
      },
      include: { parameter: true },
      orderBy: { asOfDate: 'desc' }
    });
    parameterValues = [...parameterValues, ...fallbackValues];
  }

  // Build parameter value maps per company (most recent value for each parameter)
  const companyParamMaps = new Map<string, Map<string, number | boolean | string>>();

  for (const company of companies) {
    const paramMap = new Map<string, number | boolean | string>();
    companyParamMaps.set(company.id, paramMap);
  }

  for (const pv of parameterValues) {
    const map = companyParamMaps.get(pv.companyId)!;
    // Only set if not already set (since ordered by desc, first is most recent)
    if (!map.has(pv.parameter.name)) {
      const value = JSON.parse(pv.value);
      map.set(pv.parameter.name, value);
    }
  }

  // Screen each company
  const companyResults: CompanyScreeningResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const company of companies) {
    const paramMap = companyParamMaps.get(company.id)!;

    const ruleResults: RuleResult[] = [];
    let companyPassed = true;

    for (const rule of criteriaSet.rules) {
      const expression = JSON.parse(rule.expression) as RuleExpression;
      // Expression describes the VIOLATION condition (problematic range)
      // If expression is TRUE, the rule is violated (not passed)
      const violated = evaluateExpression(expression, paramMap);
      const passed = !violated;

      // Get actual value and threshold for display
      const { actualValue, threshold } = getActualValue(expression, paramMap);

      let failureReason: string | undefined;
      if (!passed && expression.type === 'comparison') {
        failureReason = getFailureReason(expression as ComparisonCondition, paramMap, rule.failureMessage || undefined);
      } else if (!passed) {
        failureReason = rule.failureMessage || 'Rule condition not met';
      }

      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        severity: rule.severity,
        failureReason,
        actualValue,
        threshold
      });

      // Only 'exclude' severity rules affect pass/fail status
      if (!passed && rule.severity === 'exclude') {
        companyPassed = false;
      }
    }

    if (companyPassed) {
      passedCount++;
    } else {
      failedCount++;
    }

    companyResults.push({
      companyId: company.id,
      companyName: company.name,
      passed: companyPassed,
      ruleResults
    });
  }

  const summary: ScreeningSummary = {
    totalHoldings: companies.length,
    passed: passedCount,
    failed: failedCount,
    passRate: companies.length > 0 ? Math.round((passedCount / companies.length) * 100) : 0
  };

  return {
    sector,
    criteriaSet: {
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client
    },
    results: companyResults,
    summary,
    screenedAt: new Date(),
    asOfDate
  };
}

// Screen companies by region
export async function screenByRegion(input: RegionScreeningInput) {
  const { region, criteriaSetId, userId, asOfDate = new Date() } = input;

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: {
      rules: true,
      client: { select: { id: true, name: true } }
    }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Note: The current schema doesn't have a region field on Company model
  // For now, we'll implement this as a placeholder that can be extended later
  // In a real implementation, we would need to add region to the Company model
  // or use a different approach to filter by region
  
  // For demonstration purposes, we'll fetch all companies
  const companies = await prisma.company.findMany();

  if (companies.length === 0) {
    throw new AppError('No companies found', 404);
  }

  // Fetch parameter values for all companies (with date filter)
  const companyIds = companies.map(c => c.id);
  let parameterValues = await prisma.companyParameterValue.findMany({
    where: {
      companyId: { in: companyIds },
      asOfDate: { lte: asOfDate }
    },
    include: { parameter: true },
    orderBy: { asOfDate: 'desc' }
  });

  // If no values found with date filter for some companies, get most recent values regardless of date
  const companiesWithValues = new Set(parameterValues.map(pv => pv.companyId));
  const companiesWithoutValues = companyIds.filter(id => !companiesWithValues.has(id));
  
  if (companiesWithoutValues.length > 0) {
    const fallbackValues = await prisma.companyParameterValue.findMany({
      where: {
        companyId: { in: companiesWithoutValues }
      },
      include: { parameter: true },
      orderBy: { asOfDate: 'desc' }
    });
    parameterValues = [...parameterValues, ...fallbackValues];
  }

  // Build parameter value maps per company (most recent value for each parameter)
  const companyParamMaps = new Map<string, Map<string, number | boolean | string>>();

  for (const company of companies) {
    const paramMap = new Map<string, number | boolean | string>();
    companyParamMaps.set(company.id, paramMap);
  }

  for (const pv of parameterValues) {
    const map = companyParamMaps.get(pv.companyId)!;
    // Only set if not already set (since ordered by desc, first is most recent)
    if (!map.has(pv.parameter.name)) {
      const value = JSON.parse(pv.value);
      map.set(pv.parameter.name, value);
    }
  }

  // Screen each company
  const companyResults: CompanyScreeningResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const company of companies) {
    const paramMap = companyParamMaps.get(company.id)!;

    const ruleResults: RuleResult[] = [];
    let companyPassed = true;

    for (const rule of criteriaSet.rules) {
      const expression = JSON.parse(rule.expression) as RuleExpression;
      // Expression describes the VIOLATION condition (problematic range)
      // If expression is TRUE, the rule is violated (not passed)
      const violated = evaluateExpression(expression, paramMap);
      const passed = !violated;

      // Get actual value and threshold for display
      const { actualValue, threshold } = getActualValue(expression, paramMap);

      let failureReason: string | undefined;
      if (!passed && expression.type === 'comparison') {
        failureReason = getFailureReason(expression as ComparisonCondition, paramMap, rule.failureMessage || undefined);
      } else if (!passed) {
        failureReason = rule.failureMessage || 'Rule condition not met';
      }

      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        severity: rule.severity,
        failureReason,
        actualValue,
        threshold
      });

      // Only 'exclude' severity rules affect pass/fail status
      if (!passed && rule.severity === 'exclude') {
        companyPassed = false;
      }
    }

    if (companyPassed) {
      passedCount++;
    } else {
      failedCount++;
    }

    companyResults.push({
      companyId: company.id,
      companyName: company.name,
      passed: companyPassed,
      ruleResults
    });
  }

  const summary: ScreeningSummary = {
    totalHoldings: companies.length,
    passed: passedCount,
    failed: failedCount,
    passRate: companies.length > 0 ? Math.round((passedCount / companies.length) * 100) : 0
  };

  return {
    region,
    criteriaSet: {
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client
    },
    results: companyResults,
    summary,
    screenedAt: new Date(),
    asOfDate
  };
}

// Delete a screening result
export async function deleteScreeningResult(id: string) {
  // First check if the screening result exists
  const existingResult = await prisma.screeningResult.findUnique({
    where: { id }
  });

  if (!existingResult) {
    throw new AppError('Screening result not found', 404);
  }

  // Delete the screening result (cascade will handle companyResults)
  await prisma.screeningResult.delete({
    where: { id }
  });

  return { message: 'Screening result deleted successfully' };
}

// Screen companies with custom criteria
export async function screenWithCustomCriteria(input: CustomCriteriaScreeningInput) {
  const { criteriaSetId, userId, asOfDate = new Date() } = input;

  // Fetch criteria set with rules
  const criteriaSet = await prisma.criteriaSet.findUnique({
    where: { id: criteriaSetId },
    include: {
      rules: true,
      client: { select: { id: true, name: true } }
    }
  });

  if (!criteriaSet) {
    throw new AppError('Criteria set not found', 404);
  }

  // Fetch all companies
  const companies = await prisma.company.findMany();

  if (companies.length === 0) {
    throw new AppError('No companies found', 404);
  }

  // Fetch parameter values for all companies (with date filter)
  const companyIds = companies.map(c => c.id);
  let parameterValues = await prisma.companyParameterValue.findMany({
    where: {
      companyId: { in: companyIds },
      asOfDate: { lte: asOfDate }
    },
    include: { parameter: true },
    orderBy: { asOfDate: 'desc' }
  });

  // If no values found with date filter for some companies, get most recent values regardless of date
  const companiesWithValues = new Set(parameterValues.map(pv => pv.companyId));
  const companiesWithoutValues = companyIds.filter(id => !companiesWithValues.has(id));
  
  if (companiesWithoutValues.length > 0) {
    const fallbackValues = await prisma.companyParameterValue.findMany({
      where: {
        companyId: { in: companiesWithoutValues }
      },
      include: { parameter: true },
      orderBy: { asOfDate: 'desc' }
    });
    parameterValues = [...parameterValues, ...fallbackValues];
  }

  // Build parameter value maps per company (most recent value for each parameter)
  const companyParamMaps = new Map<string, Map<string, number | boolean | string>>();

  for (const company of companies) {
    const paramMap = new Map<string, number | boolean | string>();
    companyParamMaps.set(company.id, paramMap);
  }

  for (const pv of parameterValues) {
    const map = companyParamMaps.get(pv.companyId)!;
    // Only set if not already set (since ordered by desc, first is most recent)
    if (!map.has(pv.parameter.name)) {
      const value = JSON.parse(pv.value);
      map.set(pv.parameter.name, value);
    }
  }

  // Screen each company
  const companyResults: CompanyScreeningResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const company of companies) {
    const paramMap = companyParamMaps.get(company.id)!;

    const ruleResults: RuleResult[] = [];
    let companyPassed = true;

    for (const rule of criteriaSet.rules) {
      const expression = JSON.parse(rule.expression) as RuleExpression;
      // Expression describes the VIOLATION condition (problematic range)
      // If expression is TRUE, the rule is violated (not passed)
      const violated = evaluateExpression(expression, paramMap);
      const passed = !violated;

      // Get actual value and threshold for display
      const { actualValue, threshold } = getActualValue(expression, paramMap);

      let failureReason: string | undefined;
      if (!passed && expression.type === 'comparison') {
        failureReason = getFailureReason(expression as ComparisonCondition, paramMap, rule.failureMessage || undefined);
      } else if (!passed) {
        failureReason = rule.failureMessage || 'Rule condition not met';
      }

      ruleResults.push({
        ruleId: rule.id,
        ruleName: rule.name,
        passed,
        severity: rule.severity,
        failureReason,
        actualValue,
        threshold
      });

      // Only 'exclude' severity rules affect pass/fail status
      if (!passed && rule.severity === 'exclude') {
        companyPassed = false;
      }
    }

    if (companyPassed) {
      passedCount++;
    } else {
      failedCount++;
    }

    companyResults.push({
      companyId: company.id,
      companyName: company.name,
      passed: companyPassed,
      ruleResults
    });
  }

  const summary: ScreeningSummary = {
    totalHoldings: companies.length,
    passed: passedCount,
    failed: failedCount,
    passRate: companies.length > 0 ? Math.round((passedCount / companies.length) * 100) : 0
  };

  return {
    criteriaSet: {
      id: criteriaSet.id,
      name: criteriaSet.name,
      version: criteriaSet.version,
      isGlobal: criteriaSet.isGlobal,
      client: criteriaSet.client
    },
    results: companyResults,
    summary,
    screenedAt: new Date(),
    asOfDate
  };
}
