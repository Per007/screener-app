import React, { useState, useEffect } from 'react';
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
 * RunScreeningPage Component
 * 
 * A streamlined page for running ESG screenings with tabs for:
 * - Results: View historical screening results
 * - Run Screening: Execute new screenings
 */
const RunScreeningPage: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'results' | 'run'>('results');

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
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setExpandedCompanies(new Set());
    } catch (err) {
      console.error('Error fetching result details:', err);
      setError('Failed to load result details');
    } finally {
      setLoadingDetail(false);
    }
  };

  /**
   * Run the screening with selected portfolio and criteria set
   */
  const handleRunScreening = async () => {
    if (!selectedPortfolioId || !selectedCriteriaSetId) {
      setError('Please select both a portfolio and a criteria set');
      return;
    }

    try {
      setScreening(true);
      setError(null);
      setScreeningResult(null);
      
      const result = await apiService.screenPortfolioDirect({
        portfolioId: selectedPortfolioId,
        criteriaSetId: selectedCriteriaSetId,
      });
      
      setScreeningResult(result);
      setExpandedCompanies(new Set());
      
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
   * Toggle expanded state for a company's detailed results
   */
  const toggleCompanyExpanded = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
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

      {/* Company Results Table */}
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
                Rules Failed
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exclusion Reasons
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {result.results.map((companyResult) => {
              // Get failed exclusion rules with their values
              const failedExclusionRules = companyResult.ruleResults.filter(
                r => !r.passed && r.severity === 'exclude'
              );
              const isExpanded = expandedCompanies.has(companyResult.company.id);
              
              return (
                <React.Fragment key={companyResult.company.id}>
                  {/* Main Row */}
                  <tr className={companyResult.passed ? 'bg-white' : 'bg-red-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {companyResult.company.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {companyResult.passed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          No
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Yes
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {companyResult.ruleResults.filter(r => !r.passed).length} / {companyResult.ruleResults.length}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {failedExclusionRules.length > 0 ? (
                        <div className="max-w-md">
                          {failedExclusionRules.slice(0, 2).map((rule) => (
                            <div key={rule.ruleId} className="text-red-600 text-xs">
                              <span className="font-medium">{rule.ruleName}:</span>{' '}
                              {rule.actualValue !== undefined && (
                                <span className="font-mono">{String(rule.actualValue)}</span>
                              )}
                              {rule.threshold && (
                                <span className="text-gray-500"> (should be {rule.threshold})</span>
                              )}
                            </div>
                          ))}
                          {failedExclusionRules.length > 2 && (
                            <div className="text-gray-400 text-xs">
                              +{failedExclusionRules.length - 2} more...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-green-600 text-xs">✓ All exclusion rules passed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleCompanyExpanded(companyResult.company.id)}
                        className="text-navy-600 hover:text-navy-900 inline-flex items-center"
                      >
                        {isExpanded ? 'Hide' : 'Show'}
                        <svg
                          className={`ml-1 w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700 mb-2">Rule Details:</div>
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Threshold</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actual Value</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Excluded</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {companyResult.ruleResults.map((ruleResult) => (
                              <tr 
                                key={ruleResult.ruleId}
                                className={!ruleResult.passed && ruleResult.severity === 'exclude' ? 'bg-red-50' : ''}
                              >
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {ruleResult.ruleName}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-600 font-mono">
                                  {ruleResult.threshold || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm font-mono">
                                  {ruleResult.actualValue !== undefined ? (
                                    <span className={ruleResult.passed ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                                      {String(ruleResult.actualValue)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">N/A</span>
                                  )}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {ruleResult.passed ? (
                                    <span className="inline-flex items-center text-green-600 text-xs">
                                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      Passed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-red-600 text-xs">
                                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                      Failed
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-xs">
                                  {/* Show exclusion status: Yes if rule failed AND severity is exclude */}
                                  {!ruleResult.passed && ruleResult.severity === 'exclude' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">Yes</span>
                                  ) : ruleResult.severity === 'exclude' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">No</span>
                                  ) : (
                                    <span className="text-gray-400">N/A ({ruleResult.severity})</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
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
                  <button
                    key={result.id}
                    onClick={() => viewHistoricalDetail(result.id)}
                    className="w-full px-6 py-4 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
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
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
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
                onClick={handleRunScreening}
                disabled={!selectedPortfolioId || !selectedCriteriaSetId || screening}
                className="w-full md:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {screening ? (
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
    </div>
  );
};

export default RunScreeningPage;
