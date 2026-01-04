import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '../api/apiService';
import { exportScreeningResultsToCSV } from '../utils/exportUtils';

/**
 * Interface for portfolio data from API
 */
interface Portfolio {
  id: string;
  name: string;
  holdingsCount: number;
  client?: {
    id: string;
    name: string;
  };
}

/**
 * Interface for criteria set data from API
 */
interface CriteriaSet {
  id: string;
  name: string;
  version: string;
  _count?: {
    rules: number;
  };
  isGlobal: boolean;
}

/**
 * Interface for individual rule result
 */
interface RuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  severity: 'exclude' | 'warn' | 'info';
  failureReason?: string;
  actualValue?: string | number | boolean;  // The company's actual value
  threshold?: string;                        // The rule's threshold (e.g., "< 500")
}

/**
 * Interface for company screening result
 */
interface CompanyResult {
  company: {
    id: string;
    name: string;
  };
  passed: boolean;
  ruleResults: RuleResult[];
}

/**
 * Interface for screening summary
 */
interface ScreeningSummary {
  totalHoldings: number;
  passed: number;
  failed: number;
  passRate: number;
}

/**
 * Interface for full screening result
 */
interface ScreeningResult {
  id: string;
  screenedAt: string;
  asOfDate: string;
  portfolio: {
    id: string;
    name: string;
    client: any;
  };
  criteriaSet: {
    id: string;
    name: string;
    version: string;
  };
  results: CompanyResult[];
  summary: ScreeningSummary;
}

/**
 * Interface for historical screening result (list view)
 */
interface HistoricalResult {
  id: string;
  screenedAt: string;
  asOfDate: string;
  portfolio: {
    id: string;
    name: string;
    client?: { id: string; name: string };
  };
  criteriaSet: {
    id: string;
    name: string;
    version: string;
  };
  summary: ScreeningSummary;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Interface for parameter validation result
 */
interface ValidationResult {
  isValid: boolean;
  totalCompanies: number;
  companiesWithCompleteData: number;
  companiesWithMissingData: number;
  requiredParameters: string[];
  missingParameters: string[];
  companyIssues: Array<{
    companyId: string;
    companyName: string;
    missingParameters: string[];
  }>;
}

/**
 * RunScreeningPage Component
 * 
 * A streamlined page for running ESG screenings with tabs for:
 * - Results: View historical screening results
 * - Run Screening: Execute new screenings
 */
const RunScreeningPage: React.FC = () => {
  // URL search params for pre-selecting portfolio
  const [searchParams] = useSearchParams();
  const portfolioIdFromUrl = searchParams.get('portfolioId');

  // Tab state - start on 'run' tab if portfolioId is in URL
  const [activeTab, setActiveTab] = useState<'results' | 'run'>(portfolioIdFromUrl ? 'run' : 'results');

  // Data state
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  
  // Historical results state
  const [historicalResults, setHistoricalResults] = useState<HistoricalResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoricalResult, setSelectedHistoricalResult] = useState<ScreeningResult | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Selection state for new screening
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [selectedCriteriaSetId, setSelectedCriteriaSetId] = useState<string>('');
  
  // Results state for new screening
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Delete state
  const [deletingScreeningId, setDeletingScreeningId] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [screeningToDelete, setScreeningToDelete] = useState<string | null>(null);

  // Validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);

  /**
   * Fetch portfolios and criteria sets on mount
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [portfoliosData, criteriaSetsData] = await Promise.all([
          apiService.getPortfolios(),
          apiService.getCriteriaSets(),
        ]);
        setPortfolios(portfoliosData);
        setCriteriaSets(criteriaSetsData);
        setError(null);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Pre-select portfolio from URL parameter if provided
   */
  useEffect(() => {
    if (portfolioIdFromUrl && portfolios.length > 0) {
      // Check if the portfolio exists in our list
      const portfolioExists = portfolios.some(p => p.id === portfolioIdFromUrl);
      if (portfolioExists) {
        setSelectedPortfolioId(portfolioIdFromUrl);
      }
    }
  }, [portfolioIdFromUrl, portfolios]);

  /**
   * Fetch historical results when Results tab is active
   */
  useEffect(() => {
    if (activeTab === 'results') {
      fetchHistoricalResults();
    }
  }, [activeTab]);

  /**
   * Fetch historical screening results
   */
  const fetchHistoricalResults = async () => {
    try {
      setLoadingHistory(true);
      const results = await apiService.getScreeningResults();
      setHistoricalResults(results);
    } catch (err) {
      console.error('Error fetching historical results:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  /**
   * View details of a historical result
   */
  const viewHistoricalDetail = async (resultId: string) => {
    try {
      setLoadingDetail(true);
      const result = await apiService.getScreeningResult(resultId);
      
      // Map companyResults to results format expected by the UI
      // The API returns companyResults with nested company object
      const mappedResult: ScreeningResult = {
        id: result.id,
        screenedAt: result.screenedAt,
        asOfDate: result.asOfDate,
        portfolio: result.portfolio,
        criteriaSet: result.criteriaSet,
        summary: result.summary,
        results: (result.companyResults || []).map((cr: any) => ({
          company: cr.company,
          passed: cr.passed,
          ruleResults: cr.ruleResults || [],
        })),
      };
      
      setSelectedHistoricalResult(mappedResult);
    } catch (err) {
      console.error('Error fetching result details:', err);
      setError('Failed to load result details');
    } finally {
      setLoadingDetail(false);
    }
  };

  /**
   * Validate parameters before running screening
   */
  const handleValidateAndRun = async () => {
    if (!selectedPortfolioId || !selectedCriteriaSetId) {
      setError('Please select both a portfolio and a criteria set');
      return;
    }

    try {
      setValidating(true);
      setError(null);
      
      // First, validate parameter availability
      const validation = await apiService.validatePortfolioScreening({
        portfolioId: selectedPortfolioId,
        criteriaSetId: selectedCriteriaSetId,
      });
      
      setValidationResult(validation);
      
      if (!validation.isValid) {
        // Show validation warning modal
        setShowValidationModal(true);
      } else {
        // All parameters available, proceed with screening
        await executeScreening();
      }
    } catch (err: any) {
      setError(err.message || 'Validation failed. Please try again.');
      console.error('Error validating screening:', err);
    } finally {
      setValidating(false);
    }
  };

  /**
   * Execute the actual screening (called after validation passes or user confirms)
   */
  const executeScreening = async () => {
    try {
      setScreening(true);
      setError(null);
      setScreeningResult(null);
      setShowValidationModal(false);
      
      const result = await apiService.screenPortfolioDirect({
        portfolioId: selectedPortfolioId,
        criteriaSetId: selectedCriteriaSetId,
      });
      
      setScreeningResult(result);
      
      // Refresh historical results
      fetchHistoricalResults();
    } catch (err: any) {
      setError(err.message || 'Screening failed. Please try again.');
      console.error('Error running screening:', err);
    } finally {
      setScreening(false);
    }
  };

  /**
   * Run the screening with selected portfolio and criteria set
   * @deprecated Use handleValidateAndRun instead
   */
  const handleRunScreening = handleValidateAndRun;


  /**
   * Handle delete screening result
   */
  const handleDeleteScreening = async () => {
    if (!screeningToDelete) return;

    try {
      setDeletingScreeningId(screeningToDelete);
      await apiService.deleteScreeningResult(screeningToDelete);

      // Remove the deleted screening from history
      const updatedHistory = historicalResults.filter(s => s.id !== screeningToDelete);
      setHistoricalResults(updatedHistory);

      // If we deleted the currently selected result, clear it
      if (selectedHistoricalResult?.id === screeningToDelete) {
        setSelectedHistoricalResult(null);
      }

      setShowDeleteConfirmModal(false);
      setScreeningToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete screening result');
    } finally {
      setDeletingScreeningId(null);
    }
  };

  /**
   * Export screening results to CSV
   */
  const handleExport = (result: ScreeningResult) => {
    const exportData = result.results.map(r => ({
      companyName: r.company.name,
      passed: r.passed,
      failedRules: r.ruleResults.filter(rr => !rr.passed).map(rr => rr.ruleName).join('; '),
      warnings: r.ruleResults.filter(rr => !rr.passed && rr.severity === 'warn').length,
    }));
    
    exportScreeningResultsToCSV(
      exportData,
      `screening_${result.portfolio.name}_${new Date(result.screenedAt).toISOString().split('T')[0]}.csv`
    );
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get selected portfolio and criteria set details
   */
  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
  const selectedCriteriaSet = criteriaSets.find(c => c.id === selectedCriteriaSetId);

  /**
   * Render the results panel (shared between tabs)
   * Uses a table format for efficient display of many records
   */
  const renderResultsPanel = (result: ScreeningResult) => (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Results Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Screening Results</h2>
            <p className="text-sm text-gray-500">
              {result.portfolio.name} • {result.criteriaSet.name} v{result.criteriaSet.version}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Screened: {formatDate(result.screenedAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {selectedHistoricalResult && (
              <button
                onClick={() => setSelectedHistoricalResult(null)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ← Back to List
              </button>
            )}
            <button
              onClick={() => handleExport(result)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{result.summary.totalHoldings}</div>
            <div className="text-sm text-gray-500">Total Companies</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{result.summary.passed}</div>
            <div className="text-sm text-green-700">Included</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
            <div className="text-sm text-red-700">Excluded</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{result.summary.passRate}%</div>
            <div className="text-sm text-blue-700">Inclusion Rate</div>
          </div>
        </div>
      </div>

      {/* Warning for Missing Data */}
      {(() => {
        // Check if any rule results have missing actual values
        const hasMissingData = result.results.some(companyResult =>
          companyResult.ruleResults.some(rule => rule.actualValue === undefined)
        );
        
        if (hasMissingData) {
          return (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-800">Missing Parameter Data Detected</div>
                  <div className="text-sm text-amber-700 mt-1">
                    Some companies are missing parameter values required for screening. Rules with missing data show "N/A" and automatically fail. 
                    Import parameter values via CSV or the API to get accurate screening results.
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Company Results Table - Combined View */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Excluded
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rule
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actual Value
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Threshold
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Excluded
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {result.results.flatMap((companyResult) => {
              // Get only exclusion rules that failed (these are the ones that caused exclusion)
              const failedExclusionRules = companyResult.ruleResults.filter(
                r => !r.passed && r.severity === 'exclude'
              );
              
              // If company is not excluded, show just one row with company info
              if (companyResult.passed || failedExclusionRules.length === 0) {
                return (
                  <tr key={companyResult.company.id} className="bg-white">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {companyResult.company.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        No
                      </span>
                    </td>
                    <td colSpan={4} className="px-6 py-4 text-sm text-gray-500 italic">
                      All exclusion rules passed
                    </td>
                  </tr>
                );
              }
              
              // If company is excluded, show one row per exclusion rule
              return failedExclusionRules.map((ruleResult, ruleIndex) => {
                const isFirstRule = ruleIndex === 0;
                const rowSpan = failedExclusionRules.length;
                
                return (
                  <tr 
                    key={`${companyResult.company.id}-${ruleResult.ruleId}`}
                    className="bg-red-50"
                  >
                    {/* Company Name - only show on first row, with rowspan */}
                    {isFirstRule && (
                      <td 
                        rowSpan={rowSpan} 
                        className="px-6 py-4 whitespace-nowrap border-r border-gray-200"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {companyResult.company.name}
                        </div>
                      </td>
                    )}
                    {/* Company Excluded Status - only show on first row, with rowspan */}
                    {isFirstRule && (
                      <td 
                        rowSpan={rowSpan} 
                        className="px-6 py-4 whitespace-nowrap border-r border-gray-200"
                      >
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Yes
                        </span>
                      </td>
                    )}
                    {/* Rule Name */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {ruleResult.ruleName}
                    </td>
                    {/* Actual Value */}
                    <td className="px-6 py-4 text-sm font-mono">
                      {ruleResult.actualValue !== undefined ? (
                        <span className="text-red-700 font-medium">
                          {String(ruleResult.actualValue)}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1 group relative">
                          <span className="text-amber-600 italic font-medium">N/A</span>
                          <svg 
                            className="w-4 h-4 text-amber-500 cursor-help" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-6 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="font-semibold mb-1">Missing Data</div>
                            <div>
                              {ruleResult.failureReason && ruleResult.failureReason.includes('Missing value for parameter:') ? (
                                <span>{ruleResult.failureReason}</span>
                              ) : (
                                <span>No data available for this parameter. Import parameter values to see actual results.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    {/* Threshold */}
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {ruleResult.threshold || '-'}
                    </td>
                    {/* Rule Excluded Status */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">Yes</span>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">ESG Screening</h1>
        <p className="mt-1 text-sm text-gray-500">
          View historical screening results or run a new screening analysis.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('results');
              setSelectedHistoricalResult(null);
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'results'
                ? 'border-navy-500 text-navy-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Results History
              {historicalResults.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {historicalResults.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('run')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'run'
                ? 'border-navy-500 text-navy-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Screening
            </div>
          </button>
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Tab Content */}
      {activeTab === 'results' && (
        <>
          {loadingHistory ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
            </div>
          ) : selectedHistoricalResult ? (
            // Show detailed result
            loadingDetail ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
              </div>
            ) : (
              renderResultsPanel(selectedHistoricalResult)
            )
          ) : historicalResults.length === 0 ? (
            // Empty state
            <div className="text-center py-12 bg-white shadow rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No screening results yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Run your first screening to see results here.
              </p>
              <button
                onClick={() => setActiveTab('run')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700"
              >
                Run Screening
              </button>
            </div>
          ) : (
            // Historical results list
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-medium text-gray-900">Screening History</h2>
                <p className="text-sm text-gray-500">Click on a result to view details</p>
              </div>
              <div className="divide-y divide-gray-200">
                {historicalResults.map((result) => (
                  <div
                    key={result.id}
                    className="w-full px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => viewHistoricalDetail(result.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {result.portfolio.name}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            result.summary.passRate >= 80 ? 'bg-green-100 text-green-800' :
                            result.summary.passRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {result.summary.passRate}% pass
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                          <span>{result.criteriaSet.name} v{result.criteriaSet.version}</span>
                          <span>•</span>
                          <span>{result.summary.totalHoldings} companies</span>
                          <span>•</span>
                          <span className="text-green-600">{result.summary.passed} passed</span>
                          <span className="text-red-600">{result.summary.failed} failed</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {formatDate(result.screenedAt)}
                          {result.user && ` by ${result.user.name || result.user.email}`}
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setScreeningToDelete(result.id);
                            setShowDeleteConfirmModal(true);
                          }}
                          disabled={deletingScreeningId === result.id}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                          title="Delete screening"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Run Screening Tab Content */}
      {activeTab === 'run' && (
        <>
          {/* Selection Panel */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Screening Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Portfolio Selection */}
              <div>
                <label htmlFor="portfolio" className="block text-sm font-medium text-gray-700 mb-1">
                  Portfolio
                </label>
                <select
                  id="portfolio"
                  value={selectedPortfolioId}
                  onChange={(e) => {
                    setSelectedPortfolioId(e.target.value);
                    setScreeningResult(null);
                  }}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                >
                  <option value="">Select a portfolio...</option>
                  {portfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.name} ({portfolio.holdingsCount} holdings)
                    </option>
                  ))}
                </select>
                {selectedPortfolio && (
                  <p className="mt-1 text-xs text-gray-500">
                    Client: {selectedPortfolio.client?.name || 'N/A'} | {selectedPortfolio.holdingsCount} companies
                  </p>
                )}
              </div>

              {/* Criteria Set Selection */}
              <div>
                <label htmlFor="criteriaSet" className="block text-sm font-medium text-gray-700 mb-1">
                  Criteria Set
                </label>
                <select
                  id="criteriaSet"
                  value={selectedCriteriaSetId}
                  onChange={(e) => {
                    setSelectedCriteriaSetId(e.target.value);
                    setScreeningResult(null);
                  }}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                >
                  <option value="">Select a criteria set...</option>
                  {criteriaSets.map((criteriaSet) => (
                    <option key={criteriaSet.id} value={criteriaSet.id}>
                      {criteriaSet.name} v{criteriaSet.version} ({criteriaSet._count?.rules || 0} rules)
                    </option>
                  ))}
                </select>
                {selectedCriteriaSet && (
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedCriteriaSet.isGlobal ? 'Global' : 'Client-specific'} | {selectedCriteriaSet._count?.rules || 0} rules
                  </p>
                )}
              </div>
            </div>

            {/* Run Button */}
            <div className="mt-6">
              <button
                onClick={handleValidateAndRun}
                disabled={!selectedPortfolioId || !selectedCriteriaSetId || screening || validating}
                className="w-full md:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {validating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating Parameters...
                  </>
                ) : screening ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running Screening...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Run Screening
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          {screeningResult && renderResultsPanel(screeningResult)}

          {/* Empty State */}
          {!screeningResult && !screening && (
            <div className="text-center py-12 bg-white shadow rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Ready to run screening</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a portfolio and criteria set above, then click "Run Screening" to analyze.
              </p>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Screening</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setScreeningToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete this screening result? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setScreeningToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteScreening}
                disabled={deletingScreeningId !== null}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingScreeningId !== null ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warning Modal */}
      {showValidationModal && validationResult && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border max-w-2xl shadow-lg rounded-lg bg-white">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Missing Parameter Data</h3>
                  <p className="text-sm text-gray-500">
                    {validationResult.companiesWithMissingData} of {validationResult.totalCompanies} companies are missing required parameters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowValidationModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{validationResult.totalCompanies}</div>
                <div className="text-xs text-gray-500">Total Companies</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">{validationResult.companiesWithCompleteData}</div>
                <div className="text-xs text-green-700">Complete Data</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-600">{validationResult.companiesWithMissingData}</div>
                <div className="text-xs text-amber-700">Missing Data</div>
              </div>
            </div>

            {/* Required Parameters */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Required Parameters ({validationResult.requiredParameters.length})</h4>
              <div className="flex flex-wrap gap-2">
                {validationResult.requiredParameters.map((param) => (
                  <span
                    key={param}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      validationResult.missingParameters.includes(param)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {validationResult.missingParameters.includes(param) ? '✗' : '✓'} {param}
                  </span>
                ))}
              </div>
              {validationResult.missingParameters.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Red parameters have no data for any company
                </p>
              )}
            </div>

            {/* Company Issues List */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Companies with Missing Data ({validationResult.companyIssues.length})
              </h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Missing Parameters</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validationResult.companyIssues.slice(0, 10).map((issue) => (
                      <tr key={issue.companyId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">
                          {issue.companyName}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          <div className="flex flex-wrap gap-1">
                            {issue.missingParameters.slice(0, 3).map((param) => (
                              <span key={param} className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                {param}
                              </span>
                            ))}
                            {issue.missingParameters.length > 3 && (
                              <span className="text-gray-400">+{issue.missingParameters.length - 3} more</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validationResult.companyIssues.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t">
                    And {validationResult.companyIssues.length - 10} more companies...
                  </div>
                )}
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-amber-800">
                  <strong>If you proceed:</strong> Companies with missing data will fail rules that require those parameters. 
                  Results will show "N/A" values and those rules will automatically fail.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel & Fix Data
              </button>
              <button
                onClick={executeScreening}
                disabled={screening}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {screening ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Run Anyway
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunScreeningPage;
