/**
 * Import Service
 * 
 * This service handles the import of portfolio data from CSV files.
 * It processes files containing company information, identifiers, and ESG parameter values.
 * 
 * The import process:
 * 1. Parse the CSV file
 * 2. Validate each row
 * 3. Create/update companies
 * 4. Create parameters if needed
 * 5. Create/update parameter values
 * 6. Create portfolio holdings
 */

import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma';
import { 
  ImportRow, 
  ImportResult, 
  ImportOptions, 
  RowValidationResult 
} from '../models/types';

// Reserved column names that are NOT parameter values
// These columns have special meaning in the import file
const RESERVED_COLUMNS = [
  'companyname',      // Required: Company name
  'company_name',     // Alternative: Company name
  'ticker',           // Optional: Stock ticker symbol
  'sector',           // Optional: Company sector
];

/**
 * Normalizes column names to a consistent format
 * Converts to lowercase and replaces spaces/special chars with underscores
 */
function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Determines if a column name is a reserved field or a parameter
 */
function isReservedColumn(normalizedName: string): boolean {
  return RESERVED_COLUMNS.includes(normalizedName);
}

/**
 * Parse a value to the appropriate type based on content
 */
function parseValue(value: string): string | number | boolean {
  // Handle empty values
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const trimmed = value.trim();
  
  // Check for boolean values
  if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'yes') {
    return true;
  }
  if (trimmed.toLowerCase() === 'false' || trimmed.toLowerCase() === 'no') {
    return false;
  }
  
  // Check for numeric values
  const numValue = Number(trimmed);
  if (!isNaN(numValue) && trimmed !== '') {
    return numValue;
  }
  
  // Return as string
  return trimmed;
}

/**
 * Infer the data type of a parameter based on sample values
 */
function inferDataType(values: (string | number | boolean)[]): 'number' | 'boolean' | 'string' {
  // Filter out empty values
  const nonEmptyValues = values.filter(v => v !== '' && v !== null && v !== undefined);
  
  if (nonEmptyValues.length === 0) {
    return 'string'; // Default to string if no values
  }
  
  // Check if all values are booleans
  if (nonEmptyValues.every(v => typeof v === 'boolean')) {
    return 'boolean';
  }
  
  // Check if all values are numbers
  if (nonEmptyValues.every(v => typeof v === 'number')) {
    return 'number';
  }
  
  // Default to string
  return 'string';
}

/**
 * Validates a single row of import data
 */
function validateRow(row: Record<string, string>, rowNumber: number): RowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Normalize all column names
  const normalizedRow: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeColumnName(key)] = value;
  }
  
  // Check for required fields - company name is required
  const companyName = normalizedRow['companyname'] || normalizedRow['company_name'];
  if (!companyName || companyName.trim() === '') {
    errors.push('Company name is required');
  }
  
  // Validate weight if provided
  const weight = normalizedRow['weight'];
  if (weight && weight.trim() !== '') {
    const weightNum = Number(weight);
    if (isNaN(weightNum)) {
      errors.push(`Invalid weight value: "${weight}" - must be a number`);
    } else if (weightNum < 0 || weightNum > 100) {
      warnings.push(`Weight ${weightNum} is outside typical range (0-100)`);
    }
  }
  
  // Build the import row data
  const importRow: ImportRow = {
    companyName: companyName?.trim() || '',
    ticker: normalizedRow['ticker']?.trim() || undefined,
    weight: weight ? Number(weight) : undefined,
    sector: normalizedRow['sector']?.trim() || undefined,
  };
  
  // Add all non-reserved columns as parameter values
  for (const [key, value] of Object.entries(normalizedRow)) {
    if (!isReservedColumn(key) && value && value.trim() !== '') {
      // Use the original column name (before normalization) for the parameter
      const originalKey = Object.keys(row).find(k => normalizeColumnName(k) === key);
      if (originalKey) {
        importRow[originalKey] = parseValue(value);
      }
    }
  }
  
  return {
    rowNumber,
    isValid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? importRow : undefined
  };
}

/**
 * Main import function - processes a CSV file and imports portfolio data
 * 
 * @param fileBuffer - The CSV file content as a Buffer
 * @param portfolioName - Name for the new portfolio
 * @param clientId - ID of the client who owns the portfolio
 * @param options - Import configuration options
 * @returns ImportResult with summary and any errors
 */
export async function importPortfolioFromCSV(
  fileBuffer: Buffer,
  portfolioName: string,
  clientId: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  // Set default options
  const opts: Required<ImportOptions> = {
    createMissingCompanies: options.createMissingCompanies ?? true,
    createMissingParameters: options.createMissingParameters ?? true,
    updateExistingValues: options.updateExistingValues ?? true,
    holdingsMode: options.holdingsMode ?? 'replace',
    asOfDate: options.asOfDate ?? new Date(),
    source: options.source ?? 'csv-import'
  };
  
  // Initialize result tracking
  const result: ImportResult = {
    success: false,
    summary: {
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      companiesCreated: 0,
      companiesUpdated: 0,
      parametersCreated: 0,
      parameterValuesCreated: 0,
      holdingsCreated: 0
    },
    errors: [],
    warnings: []
  };
  
  try {
    // Step 1: Parse the CSV file
    // The csv-parse library handles different CSV formats and encodings
    const records = parse(fileBuffer, {
      columns: true,           // Use first row as column headers
      skip_empty_lines: true,  // Ignore blank lines
      trim: true,              // Trim whitespace from values
      bom: true,               // Handle byte order mark (BOM) in UTF-8 files
      relax_column_count: true // Allow rows with different column counts
    }) as Record<string, string>[];
    
    result.summary.totalRows = records.length;
    
    if (records.length === 0) {
      result.errors.push({
        rowNumber: 0,
        isValid: false,
        errors: ['CSV file is empty or has no data rows'],
        warnings: []
      });
      return result;
    }
    
    // Step 2: Validate all rows first
    const validatedRows: RowValidationResult[] = [];
    for (let i = 0; i < records.length; i++) {
      const validation = validateRow(records[i], i + 2); // +2 because row 1 is headers, data starts at row 2
      validatedRows.push(validation);
      
      if (!validation.isValid) {
        result.errors.push(validation);
        result.summary.failedRows++;
      } else {
        result.summary.successfulRows++;
        if (validation.warnings.length > 0) {
          result.warnings.push(...validation.warnings.map(w => `Row ${validation.rowNumber}: ${w}`));
        }
      }
    }
    
    // Get only valid rows for processing
    const validRows = validatedRows.filter(v => v.isValid && v.data);
    
    if (validRows.length === 0) {
      result.errors.push({
        rowNumber: 0,
        isValid: false,
        errors: ['No valid rows to import'],
        warnings: []
      });
      return result;
    }
    
    // Step 3: Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      result.errors.push({
        rowNumber: 0,
        isValid: false,
        errors: [`Client with ID "${clientId}" not found`],
        warnings: []
      });
      return result;
    }
    
    // Step 4: Identify all unique parameter names from the data
    const parameterNames = new Set<string>();
    for (const row of validRows) {
      if (row.data) {
        for (const key of Object.keys(row.data)) {
          if (!isReservedColumn(normalizeColumnName(key)) && 
              !['companyName', 'ticker', 'weight', 'sector'].includes(key)) {
            parameterNames.add(key);
          }
        }
      }
    }
    
    // Step 5: Get or create parameters
    const parameterMap = new Map<string, { id: string; dataType: string }>();
    
    for (const paramName of parameterNames) {
      // Try to find existing parameter (case-insensitive search)
      let parameter = await prisma.parameter.findFirst({
        where: { name: { equals: paramName } }
      });
      
      if (!parameter) {
        if (!opts.createMissingParameters) {
          result.warnings.push(`Parameter "${paramName}" not found and createMissingParameters is false - skipping`);
          continue;
        }
        
        // Infer data type from values in the data
        const values = validRows
          .map(r => r.data?.[paramName])
          .filter(v => v !== undefined) as (string | number | boolean)[];
        const dataType = inferDataType(values);
        
        // Create the parameter
        parameter = await prisma.parameter.create({
          data: {
            name: paramName,
            dataType,
            description: `Auto-created during import on ${new Date().toISOString()}`
          }
        });
        result.summary.parametersCreated++;
      }
      
      parameterMap.set(paramName, { id: parameter.id, dataType: parameter.dataType });
    }
    
    // Step 6: Process companies and create/update them
    const companyMap = new Map<string, string>(); // companyName/ticker -> companyId
    
    for (const row of validRows) {
      if (!row.data) continue;
      
      const { companyName, ticker, sector } = row.data;
      
      // Try to find existing company by ticker first (more reliable), then by name
      let company = null;
      
      if (ticker) {
        company = await prisma.company.findFirst({
          where: { ticker: { equals: ticker } }
        });
      }
      
      if (!company) {
        company = await prisma.company.findFirst({
          where: { name: { equals: companyName } }
        });
      }
      
      if (!company) {
        if (!opts.createMissingCompanies) {
          result.warnings.push(`Company "${companyName}" not found and createMissingCompanies is false - skipping`);
          continue;
        }
        
        // Create new company
        company = await prisma.company.create({
          data: {
            name: companyName,
            ticker: ticker || null,
            sector: sector || null
          }
        });
        result.summary.companiesCreated++;
      } else {
        // Update existing company if we have new info
        const updates: { ticker?: string; sector?: string } = {};
        if (ticker && !company.ticker) updates.ticker = ticker;
        if (sector && !company.sector) updates.sector = sector;
        
        if (Object.keys(updates).length > 0) {
          await prisma.company.update({
            where: { id: company.id },
            data: updates
          });
          result.summary.companiesUpdated++;
        }
      }
      
      // Store company ID for later use
      const key = ticker || companyName;
      companyMap.set(key, company.id);
      
      // Step 7: Create/update parameter values for this company
      for (const [paramName, paramInfo] of parameterMap) {
        const value = row.data[paramName];
        if (value === undefined || value === '') continue;
        
        // Check if value already exists
        const existingValue = await prisma.companyParameterValue.findFirst({
          where: {
            companyId: company.id,
            parameterId: paramInfo.id,
            asOfDate: opts.asOfDate
          }
        });
        
        if (existingValue) {
          if (opts.updateExistingValues) {
            await prisma.companyParameterValue.update({
              where: { id: existingValue.id },
              data: {
                value: JSON.stringify(value),
                source: opts.source
              }
            });
          }
        } else {
          await prisma.companyParameterValue.create({
            data: {
              companyId: company.id,
              parameterId: paramInfo.id,
              value: JSON.stringify(value),
              asOfDate: opts.asOfDate,
              source: opts.source
            }
          });
          result.summary.parameterValuesCreated++;
        }
      }
    }
    
    // Step 8: Create the portfolio
    const portfolio = await prisma.portfolio.create({
      data: {
        name: portfolioName,
        clientId: clientId
      }
    });
    result.portfolioId = portfolio.id;
    result.portfolioName = portfolio.name;
    
    // Step 9: Create portfolio holdings
    for (const row of validRows) {
      if (!row.data) continue;
      
      const key = row.data.ticker || row.data.companyName;
      const companyId = companyMap.get(key);
      
      if (!companyId) {
        // Company was skipped (createMissingCompanies was false)
        continue;
      }
      
      // Default weight to 0 if not provided
      // Convert weight to number, handling all possible types from ImportRow
      const weightValue = row.data.weight;
      const weight = typeof weightValue === 'number' 
        ? weightValue 
        : (weightValue ? Number(weightValue) : 0);
      
      await prisma.portfolioHolding.create({
        data: {
          portfolioId: portfolio.id,
          companyId,
          weight
        }
      });
      result.summary.holdingsCreated++;
    }
    
    result.success = true;
    return result;
    
  } catch (error) {
    // Handle any unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    result.errors.push({
      rowNumber: 0,
      isValid: false,
      errors: [`Import failed: ${errorMessage}`],
      warnings: []
    });
    return result;
  }
}

/**
 * Validates a CSV file without actually importing it
 * Useful for preview/dry-run functionality
 */
export async function validatePortfolioCSV(
  fileBuffer: Buffer
): Promise<{ isValid: boolean; rowCount: number; columns: string[]; errors: RowValidationResult[] }> {
  try {
    const records = parse(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true
    }) as Record<string, string>[];
    
    const errors: RowValidationResult[] = [];
    
    // Get column names from first record
    const columns = records.length > 0 ? Object.keys(records[0]) : [];
    
    // Validate all rows
    for (let i = 0; i < records.length; i++) {
      const validation = validateRow(records[i], i + 2);
      if (!validation.isValid) {
        errors.push(validation);
      }
    }
    
    return {
      isValid: errors.length === 0,
      rowCount: records.length,
      columns,
      errors
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV';
    return {
      isValid: false,
      rowCount: 0,
      columns: [],
      errors: [{
        rowNumber: 0,
        isValid: false,
        errors: [errorMessage],
        warnings: []
      }]
    };
  }
}

/**
 * Generate a sample CSV template that users can fill in
 */
export function generateCSVTemplate(includeExampleData: boolean = true): string {
  const headers = [
    'Company Name',
    'Ticker',
    'Sector',
    'Weight',
    'ESG Score',
    'Carbon Intensity',
    'Renewable Energy %',
    'Has Controversies'
  ];
  
  let csv = headers.join(',') + '\n';
  
  if (includeExampleData) {
    const exampleRows = [
      ['Apple Inc.', 'AAPL', 'Technology', '1000', '78.5', '12.3', '85', 'false'],
      ['Microsoft Corp.', 'MSFT', 'Technology', '800', '82.1', '8.7', '100', 'false'],
      ['ExxonMobil', 'XOM', 'Energy', '500', '45.2', '156.8', '5', 'true'],
    ];
    
    for (const row of exampleRows) {
      csv += row.join(',') + '\n';
    }
  }
  
  return csv;
}

