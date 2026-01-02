import { Request } from 'express';

// Authenticated request with user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    clientId?: string;
  };
}

// Rule expression types
export type ComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not_in' | 'contains';

export interface ComparisonCondition {
  type: 'comparison';
  parameter: string;
  operator: ComparisonOperator;
  value: number | string | boolean | (number | string)[];
}

export interface LogicalCondition {
  type: 'AND' | 'OR' | 'NOT';
  conditions: RuleExpression[];
}

export type RuleExpression = ComparisonCondition | LogicalCondition;

// Screening result types
export interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: string;
  failureReason?: string;
}

export interface CompanyScreeningResult {
  companyId: string;
  companyName: string;
  passed: boolean;
  ruleResults: RuleResult[];
}

export interface ScreeningSummary {
  totalHoldings: number;
  passed: number;
  failed: number;
  passRate: number;
}

// =====================================
// Portfolio Import Types
// =====================================

/**
 * Represents a single row from the imported CSV file.
 * Each row contains company information, identifiers, and dynamic parameter values.
 */
export interface ImportRow {
  // Company identifiers (at least one required)
  companyName: string;
  ticker?: string;
  
  // Portfolio-specific fields
  weight?: number;  // Percentage weight in portfolio (0-100)
  shares?: number;  // Number of shares held
  sector?: string;  // Company sector classification
  
  // Dynamic parameter values - keys are parameter names, values are the scores/values
  [parameterName: string]: string | number | boolean | undefined;
}

/**
 * Result of validating a single row during import
 */
export interface RowValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: ImportRow;
}

/**
 * Summary of the entire import operation
 */
export interface ImportResult {
  success: boolean;
  portfolioId?: string;
  portfolioName?: string;
  summary: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    companiesCreated: number;
    companiesUpdated: number;
    parametersCreated: number;
    parameterValuesCreated: number;
    holdingsCreated: number;
  };
  errors: RowValidationResult[];
  warnings: string[];
}

/**
 * Options for the import operation
 */
export interface ImportOptions {
  // Whether to create new companies if they don't exist (default: true)
  createMissingCompanies?: boolean;
  
  // Whether to create new parameters if they don't exist (default: true)
  createMissingParameters?: boolean;
  
  // Whether to update existing parameter values (default: true)
  updateExistingValues?: boolean;
  
  // Whether to replace all holdings or merge with existing (default: 'replace')
  holdingsMode?: 'replace' | 'merge';
  
  // The date to use for parameter values (default: current date)
  asOfDate?: Date;
  
  // Source identifier for the imported data
  source?: string;
}
