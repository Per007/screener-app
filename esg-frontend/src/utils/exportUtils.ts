import * as XLSX from 'xlsx';
import { format as formatDate } from 'date-fns';

// Re-export formatDate for backward compatibility
const format = formatDate;

/**
 * Export screening results to CSV with a custom filename
 * @param data - Array of objects to export
 * @param filename - Full filename with extension
 */
export function exportScreeningResultsToCSV(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export screening results to CSV format
 * @param data - The screening results data to export
 * @param filename - Optional filename (without extension)
 */
export function exportToCSV(data: any[], filename: string = 'screening-results'): void {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Export screening results to Excel format
 * @param data - The screening results data to export
 * @param filename - Optional filename (without extension)
 * @param sheetName - Optional sheet name
 */
export function exportToExcel(data: any[], filename: string = 'screening-results', sheetName: string = 'Screening Results'): void {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  // Set column widths (optional - auto-width)
  const maxWidth = 50;
  const wscols = Object.keys(data[0]).map(() => ({ wch: maxWidth }));
  worksheet['!cols'] = wscols;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate Excel file and download
  XLSX.writeFile(workbook, `${filename}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

/**
 * Export failed holdings to CSV/Excel
 * @param results - Array of company screening results
 * @param format - 'csv' or 'excel'
 * @param portfolioName - Portfolio name for filename
 */
export function exportFailedHoldings(
  results: Array<{
    company: { id: string; name: string };
    passed: boolean;
    ruleResults: Array<{
      ruleId: string;
      ruleName: string;
      passed: boolean;
      severity: 'exclude' | 'warn';
      failureReason?: string;
    }>;
  }>,
  format: 'csv' | 'excel',
  portfolioName: string = 'portfolio'
): void {
  const failedResults = results.filter(r => !r.passed);
  
  if (failedResults.length === 0) {
    alert('No failed holdings to export');
    return;
  }

  // Transform data for export
  const exportData = failedResults.map(result => {
    const failedRules = result.ruleResults.filter(r => !r.passed && r.severity === 'exclude');
    const failedRuleNames = failedRules.map(r => r.ruleName).join('; ');
    const failureReasons = failedRules.map(r => r.failureReason || 'N/A').join('; ');
    
    return {
      'Company Name': result.company.name,
      'Company ID': result.company.id,
      'Status': 'Failed',
      'Number of Failed Criteria': failedRules.length,
      'Failed Criteria': failedRuleNames,
      'Failure Reasons': failureReasons,
      'Total Rules Checked': result.ruleResults.length,
      'Passed Rules': result.ruleResults.filter(r => r.passed).length
    };
  });

  const filename = `${portfolioName}-failed-holdings`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, 'Failed Holdings');
  }
}

/**
 * Export all holdings to CSV/Excel
 * @param results - Array of company screening results
 * @param format - 'csv' or 'excel'
 * @param portfolioName - Portfolio name for filename
 */
export function exportAllHoldings(
  results: Array<{
    company: { id: string; name: string };
    passed: boolean;
    ruleResults: Array<{
      ruleId: string;
      ruleName: string;
      passed: boolean;
      severity: 'exclude' | 'warn';
      failureReason?: string;
    }>;
  }>,
  format: 'csv' | 'excel',
  portfolioName: string = 'portfolio'
): void {
  if (results.length === 0) {
    alert('No holdings to export');
    return;
  }

  // Transform data for export
  const exportData = results.map(result => {
    const passedRules = result.ruleResults.filter(r => r.passed);
    const failedRules = result.ruleResults.filter(r => !r.passed);
    const failedRuleNames = failedRules.length > 0 
      ? failedRules.map(r => r.ruleName).join('; ') 
      : 'None';
    
    return {
      'Company Name': result.company.name,
      'Company ID': result.company.id,
      'Status': result.passed ? 'Passed' : 'Failed',
      'Rules Passed': `${passedRules.length}/${result.ruleResults.length}`,
      'Rules Failed': failedRules.length,
      'Failed Criteria': failedRuleNames,
      'Pass Rate': result.ruleResults.length > 0 
        ? `${Math.round((passedRules.length / result.ruleResults.length) * 100)}%`
        : '0%'
    };
  });

  const filename = `${portfolioName}-all-holdings`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, 'All Holdings');
  }
}

/**
 * Export screening history to CSV/Excel
 * @param history - Array of screening results
 * @param format - 'csv' or 'excel'
 * @param portfolioName - Portfolio name for filename
 */
export function exportScreeningHistory(
  history: Array<{
    id: string;
    screenedAt: string;
    asOfDate: string;
    summary: {
      totalHoldings: number;
      passed: number;
      failed: number;
      passRate: number;
    };
    criteriaSet: {
      name: string;
      version: string;
    };
  }>,
  format: 'csv' | 'excel',
  portfolioName: string = 'portfolio'
): void {
  if (history.length === 0) {
    alert('No screening history to export');
    return;
  }

  // Transform data for export
  const exportData = history.map(result => ({
    'Date': format(new Date(result.screenedAt), 'yyyy-MM-dd HH:mm:ss'),
    'As of Date': format(new Date(result.asOfDate), 'yyyy-MM-dd'),
    'Criteria Set': `${result.criteriaSet.name} ${result.criteriaSet.version}`,
    'Total Holdings': result.summary.totalHoldings,
    'Passed': result.summary.passed,
    'Failed': result.summary.failed,
    'Pass Rate': `${result.summary.passRate}%`
  }));

  const filename = `${portfolioName}-screening-history`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, 'Screening History');
  }
}

/**
 * Export detailed screening result with all rule details
 * @param result - Single screening result with full details
 * @param format - 'csv' or 'excel'
 * @param portfolioName - Portfolio name for filename
 */
export function exportDetailedScreeningResult(
  result: {
    id: string;
    screenedAt: string;
    asOfDate: string;
    summary: {
      totalHoldings: number;
      passed: number;
      failed: number;
      passRate: number;
    };
    criteriaSet: {
      name: string;
      version: string;
    };
    results: Array<{
      company: { id: string; name: string };
      passed: boolean;
      ruleResults: Array<{
        ruleId: string;
        ruleName: string;
        passed: boolean;
        severity: 'exclude' | 'warn';
        failureReason?: string;
      }>;
    }>;
  },
  format: 'csv' | 'excel',
  portfolioName: string = 'portfolio'
): void {
  if (!result || !result.results || result.results.length === 0) {
    alert('No screening result data to export');
    return;
  }

  // Create detailed export data with one row per company-rule combination
  const exportData: any[] = [];
  
  result.results.forEach(companyResult => {
    companyResult.ruleResults.forEach(rule => {
      exportData.push({
        'Company Name': companyResult.company.name,
        'Company ID': companyResult.company.id,
        'Company Status': companyResult.passed ? 'Passed' : 'Failed',
        'Rule Name': rule.ruleName,
        'Rule Passed': rule.passed ? 'Yes' : 'No',
        'Severity': rule.severity,
        'Failure Reason': rule.failureReason || 'N/A'
      });
    });
  });

  const filename = `${portfolioName}-detailed-screening-${format(new Date(result.screenedAt), 'yyyy-MM-dd')}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  if (format === 'csv') {
    exportToCSV(exportData, filename);
  } else {
    exportToExcel(exportData, filename, 'Detailed Results');
  }
}
