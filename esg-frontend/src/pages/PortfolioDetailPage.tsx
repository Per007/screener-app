import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../api/apiService';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { 
  exportFailedHoldings, 
  exportAllHoldings, 
  exportScreeningHistory,
  exportDetailedScreeningResult,
  exportHoldingsWithParameters
} from '../utils/exportUtils';

type TabType = 'failed' | 'all' | 'history' | 'info' | 'overview';

interface Portfolio {
  id: string;
  name: string;
  client?: {
    id: string;
    name: string;
  };
  holdings: Array<{
    id: string;
    company: {
      id: string;
      name: string;
      sector?: string;
    };
    weight?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ScreeningResult {
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
    id: string;
    name: string;
    version: string;
  };
  results: Array<{
    company: {
      id: string;
      name: string;
    };
    passed: boolean;
    ruleResults: Array<{
      ruleId: string;
      ruleName: string;
      passed: boolean;
      severity: 'exclude' | 'warn';
      failureReason?: string;
    }>;
  }>;
}

const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [latestScreening, setLatestScreening] = useState<ScreeningResult | null>(null);
  const [screeningHistory, setScreeningHistory] = useState<ScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('failed');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [criteriaSets, setCriteriaSets] = useState<any[]>([]);
  const [selectedCriteriaSet, setSelectedCriteriaSet] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [screeningInProgress, setScreeningInProgress] = useState(false);
  const [openExportMenu, setOpenExportMenu] = useState<string | null>(null);
  const [showAddHoldingModal, setShowAddHoldingModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [holdingWeight, setHoldingWeight] = useState('');
  const [addingHolding, setAddingHolding] = useState(false);
  const [deletingScreeningId, setDeletingScreeningId] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [screeningToDelete, setScreeningToDelete] = useState<string | null>(null);
  const [normalizingWeights, setNormalizingWeights] = useState(false);
  const [holdingsWithParameters, setHoldingsWithParameters] = useState<any>(null);
  const [loadingHoldingsParams, setLoadingHoldingsParams] = useState(false);
  const [holdingsParamsAsOfDate, setHoldingsParamsAsOfDate] = useState('');
  const [holdingsParamsError, setHoldingsParamsError] = useState<string | null>(null);

  // Fetch companies for add holding modal
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const data = await apiService.getCompanies();
        setCompanies(data);
      } catch (err) {
        console.error('Failed to fetch companies:', err);
      }
    };
    
    if (showAddHoldingModal) {
      fetchCompanies();
    }
  }, [showAddHoldingModal]);

  // Fetch portfolio data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch portfolio
        const portfolioData = await apiService.getPortfolio(id);
        setPortfolio(portfolioData);

        // Fetch latest screening result
        const screeningResults = await apiService.getScreeningResults({ portfolioId: id });
        if (screeningResults && screeningResults.length > 0) {
          const latest = screeningResults[0];
          // Parse the screening result structure
          const parsedResult: ScreeningResult = {
            id: latest.id,
            screenedAt: latest.screenedAt,
            asOfDate: latest.asOfDate,
            summary: typeof latest.summary === 'string' ? JSON.parse(latest.summary) : latest.summary,
            criteriaSet: latest.criteriaSet,
            results: latest.companyResults?.map((cr: any) => ({
              company: cr.company,
              passed: cr.passed,
              ruleResults: typeof cr.ruleResults === 'string' ? JSON.parse(cr.ruleResults) : cr.ruleResults
            })) || []
          };
          setLatestScreening(parsedResult);
          setScreeningHistory(screeningResults.map((r: any) => ({
            id: r.id,
            screenedAt: r.screenedAt,
            asOfDate: r.asOfDate,
            summary: typeof r.summary === 'string' ? JSON.parse(r.summary) : r.summary,
            criteriaSet: r.criteriaSet,
            results: r.companyResults?.map((cr: any) => ({
              company: cr.company,
              passed: cr.passed,
              ruleResults: typeof cr.ruleResults === 'string' ? JSON.parse(cr.ruleResults) : cr.ruleResults
            })) || []
          })));
        }

        // Fetch criteria sets for screening modal
        const criteriaSetsData = await apiService.getCriteriaSets();
        setCriteriaSets(criteriaSetsData);
        if (criteriaSetsData.length > 0) {
          setSelectedCriteriaSet(criteriaSetsData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch portfolio data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Determine default tab based on screening results
  useEffect(() => {
    if (latestScreening) {
      if (latestScreening.summary.failed > 0) {
        setActiveTab('failed');
      } else {
        setActiveTab('all');
      }
    }
  }, [latestScreening]);

  // Fetch holdings with parameters when overview tab is active
  useEffect(() => {
    const fetchHoldingsWithParameters = async () => {
      if (!id || activeTab !== 'overview') return;
      
      try {
        setLoadingHoldingsParams(true);
        setHoldingsParamsError(null);
        const data = await apiService.getPortfolioHoldingsWithParameters(
          id,
          holdingsParamsAsOfDate || undefined
        );
        setHoldingsWithParameters(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch holdings with parameters';
        setHoldingsParamsError(errorMessage);
        console.error('Error fetching holdings with parameters:', err);
      } finally {
        setLoadingHoldingsParams(false);
      }
    };

    fetchHoldingsWithParameters();
  }, [id, activeTab, holdingsParamsAsOfDate]);

  // Close export menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.export-menu-container')) {
        setOpenExportMenu(null);
      }
    };

    if (openExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openExportMenu]);

  const handleScreenPortfolio = async () => {
    if (!id || !selectedCriteriaSet) return;

    try {
      setScreeningInProgress(true);
      const result = await apiService.screenPortfolioDirect({
        portfolioId: id,
        criteriaSetId: selectedCriteriaSet,
        asOfDate: asOfDate || undefined
      });

      // Parse and set the new screening result
      const parsedResult: ScreeningResult = {
        id: result.id,
        screenedAt: result.screenedAt,
        asOfDate: result.asOfDate,
        summary: result.summary,
        criteriaSet: result.criteriaSet,
        results: result.results
      };

      setLatestScreening(parsedResult);
      setScreeningHistory([parsedResult, ...screeningHistory]);
      setShowScreenModal(false);
      setActiveTab('failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to screen portfolio');
    } finally {
      setScreeningInProgress(false);
    }
  };

  const toggleCompanyExpansion = (companyId: string) => {
    const newExpanded = new Set(expandedCompanies);
    if (newExpanded.has(companyId)) {
      newExpanded.delete(companyId);
    } else {
      newExpanded.add(companyId);
    }
    setExpandedCompanies(newExpanded);
  };

  const handleAddHolding = async () => {
    if (!id || !selectedCompanyId || !holdingWeight) {
      setError('Please fill in all required fields');
      return;
    }

    const weight = parseFloat(holdingWeight);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      setError('Weight must be a number between 0 and 100');
      return;
    }

    try {
      setAddingHolding(true);
      setError(null);

      const updatedPortfolio = await apiService.addHoldingToPortfolio(id, {
        companyId: selectedCompanyId,
        weight
      });

      setPortfolio(updatedPortfolio);
      setShowAddHoldingModal(false);
      // Reset form
      setSelectedCompanyId('');
      setHoldingWeight('');
      setCompanySearchTerm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add holding');
    } finally {
      setAddingHolding(false);
    }
  };

  // Handle delete screening result
  const handleDeleteScreening = async () => {
    if (!screeningToDelete) return;

    try {
      setDeletingScreeningId(screeningToDelete);
      await apiService.deleteScreeningResult(screeningToDelete);

      // Remove the deleted screening from history
      const updatedHistory = screeningHistory.filter(s => s.id !== screeningToDelete);
      setScreeningHistory(updatedHistory);

      // If we deleted the latest screening, update it
      if (latestScreening?.id === screeningToDelete) {
        setLatestScreening(updatedHistory.length > 0 ? updatedHistory[0] : null);
      }

      setShowDeleteConfirmModal(false);
      setScreeningToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete screening result');
    } finally {
      setDeletingScreeningId(null);
    }
  };

  // Handle normalize weights
  const handleNormalizeWeights = async () => {
    if (!id) return;

    try {
      setNormalizingWeights(true);
      setError(null);
      
      const result = await apiService.normalizePortfolioWeights(id);
      
      // Update the portfolio with normalized weights
      setPortfolio(result.portfolio);
      
      // Show success message (optional: could use a toast notification)
      alert(`✓ ${result.message}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to normalize weights');
    } finally {
      setNormalizingWeights(false);
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company => {
    if (!companySearchTerm) return true;
    const searchLower = companySearchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchLower) ||
      (company.ticker && company.ticker.toLowerCase().includes(searchLower))
    );
  });

  const failedHoldings = latestScreening?.results.filter(r => !r.passed) || [];
  const allHoldings = latestScreening?.results || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  if (error && !portfolio) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-red-700">{error}</p>
            <Link to="/portfolios" className="text-red-600 hover:text-red-800 text-sm mt-2 inline-block">
              ← Back to Portfolios
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const holdingsCount = portfolio.holdings?.length || 0;
  const summary = latestScreening?.summary || {
    totalHoldings: holdingsCount,
    passed: 0,
    failed: 0,
    passRate: 0
  };

  // Calculate sum of weights excluded (for failed holdings)
  const sumOfWeightsExcluded = latestScreening
    ? latestScreening.results
        .filter(r => !r.passed)
        .reduce((sum, result) => {
          const holding = portfolio.holdings?.find(h => h.company.id === result.company.id);
          return sum + (holding?.weight || 0);
        }, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/portfolios" className="text-navy-600 hover:text-navy-800 text-sm">
            ← Portfolios
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            {portfolio.name}
          </h1>
          <p className="text-gray-600">
            {portfolio.client?.name || 'No client'} • {holdingsCount} holdings
            {latestScreening && ` • Last screened: ${new Date(latestScreening.screenedAt).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddHoldingModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            + Add Holding
          </button>
          <button
            onClick={() => setShowScreenModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Screen
          </button>
          <div className="relative export-menu-container">
            <button
              onClick={() => setOpenExportMenu(openExportMenu === 'main' ? null : 'main')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
            >
              Export
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </button>
            {openExportMenu === 'main' && latestScreening && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="py-1">
                  <button
                    onClick={() => {
                      exportDetailedScreeningResult(latestScreening, 'excel', portfolio.name);
                      setOpenExportMenu(null);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Export to Excel
                  </button>
                  <button
                    onClick={() => {
                      exportDetailedScreeningResult(latestScreening, 'csv', portfolio.name);
                      setOpenExportMenu(null);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Export to CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <div className="h-6 w-6"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Holdings Passed</dt>
                <dd className="text-2xl font-semibold text-gray-900">{summary.passed}</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <div className="h-6 w-6"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Holdings Failed</dt>
                <dd className="text-2xl font-semibold text-gray-900">{summary.failed}</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                <div className="h-6 w-6"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Sum of Weights Excluded</dt>
                <dd className="text-2xl font-semibold text-gray-900">{sumOfWeightsExcluded.toFixed(2)}%</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <div className="h-6 w-6"></div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Criteria Set</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {latestScreening?.criteriaSet.name || 'Not screened'}
                </dd>
                {latestScreening?.criteriaSet.version && (
                  <dd className="text-sm text-gray-600">{latestScreening.criteriaSet.version}</dd>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('failed')}
              className={`${
                activeTab === 'failed'
                  ? 'border-navy-500 text-navy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Failed Holdings {failedHoldings.length > 0 && `(${failedHoldings.length})`}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`${
                activeTab === 'all'
                  ? 'border-navy-500 text-navy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              All Holdings {allHoldings.length > 0 && `(${allHoldings.length})`}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`${
                activeTab === 'history'
                  ? 'border-navy-500 text-navy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Screening History
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-navy-500 text-navy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Holdings Overview
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`${
                activeTab === 'info'
                  ? 'border-navy-500 text-navy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Portfolio Info
            </button>
          </nav>
        </div>

        <div className="px-6 py-5">
          {/* Failed Holdings Tab */}
          {activeTab === 'failed' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Failed Holdings ({failedHoldings.length})
                </h2>
                {failedHoldings.length > 0 && (
                  <div className="relative export-menu-container">
                    <button
                      onClick={() => setOpenExportMenu(openExportMenu === 'failed' ? null : 'failed')}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                    >
                      Export Failed
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </button>
                    {openExportMenu === 'failed' && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              exportFailedHoldings(allHoldings, 'excel', portfolio.name);
                              setOpenExportMenu(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Export to Excel
                          </button>
                          <button
                            onClick={() => {
                              exportFailedHoldings(allHoldings, 'csv', portfolio.name);
                              setOpenExportMenu(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Export to CSV
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {failedHoldings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-gray-600">No failed holdings. All companies passed the screening!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Failed Criteria
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Severity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {failedHoldings.map((result) => {
                        const failedRules = result.ruleResults.filter(r => !r.passed && r.severity === 'exclude');
                        const isExpanded = expandedCompanies.has(result.company.id);
                        return (
                          <React.Fragment key={result.company.id}>
                            <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleCompanyExpansion(result.company.id)}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{result.company.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{failedRules.length} criteria</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  🔴 Exclude
                                </span>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} className="px-6 py-4 bg-gray-50">
                                  <div className="space-y-3">
                                    <div className="text-sm font-medium text-gray-900 mb-2">Failed Criteria:</div>
                                    {failedRules.map((rule) => (
                                      <div key={rule.ruleId} className="bg-white rounded-md p-3 border border-red-200">
                                        <div className="flex items-start">
                                          <span className="text-red-600 mr-2">🔴</span>
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">{rule.ruleName}</div>
                                            {rule.failureReason && (
                                              <div className="text-sm text-gray-600 mt-1">✗ {rule.failureReason}</div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="pt-2">
                                      <Link
                                        to={`/companies/${result.company.id}`}
                                        className="text-sm text-navy-600 hover:text-navy-800"
                                      >
                                        View Full Company Profile →
                                      </Link>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* All Holdings Tab */}
          {activeTab === 'all' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  All Holdings ({allHoldings.length})
                </h2>
                <div className="relative export-menu-container">
                  <button
                    onClick={() => setOpenExportMenu(openExportMenu === 'all' ? null : 'all')}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                  >
                    Export All
                    <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </button>
                  {openExportMenu === 'all' && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            exportAllHoldings(allHoldings, 'excel', portfolio.name);
                            setOpenExportMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Export to Excel
                        </button>
                        <button
                          onClick={() => {
                            exportAllHoldings(allHoldings, 'csv', portfolio.name);
                            setOpenExportMenu(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Export to CSV
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {allHoldings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No screening results available. Run a screening first.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Criteria Passed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allHoldings.map((result) => {
                        const passedRules = result.ruleResults.filter(r => r.passed).length;
                        const totalRules = result.ruleResults.length;
                        return (
                          <tr key={result.company.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                to={`/companies/${result.company.id}`}
                                className="text-sm font-medium text-navy-600 hover:text-navy-800"
                              >
                                {result.company.name}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {result.passed ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  🟢 Passed
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                  🔴 Failed
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{passedRules}/{totalRules}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Screening History Tab */}
          {activeTab === 'history' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Screening History</h2>
                {screeningHistory.length > 0 && (
                  <div className="relative export-menu-container">
                    <button
                      onClick={() => setOpenExportMenu(openExportMenu === 'history' ? null : 'history')}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                    >
                      Export History
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </button>
                    {openExportMenu === 'history' && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              exportScreeningHistory(screeningHistory, 'excel', portfolio.name);
                              setOpenExportMenu(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Export to Excel
                          </button>
                          <button
                            onClick={() => {
                              exportScreeningHistory(screeningHistory, 'csv', portfolio.name);
                              setOpenExportMenu(null);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Export to CSV
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {screeningHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No screening history available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Criteria Set
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Holdings
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Passed
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Failed
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % Passed
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {screeningHistory.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(result.screenedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.criteriaSet.name} {result.criteriaSet.version}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.summary.totalHoldings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.summary.passed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.summary.failed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.summary.passRate}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setLatestScreening(result);
                                setActiveTab('failed');
                              }}
                              className="text-navy-600 hover:text-navy-900 mr-3"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                setScreeningToDelete(result.id);
                                setShowDeleteConfirmModal(true);
                              }}
                              disabled={deletingScreeningId === result.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              {deletingScreeningId === result.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Holdings Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Holdings Overview with Parameters
                </h2>
                <div className="flex items-center space-x-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      As of Date (optional)
                    </label>
                    <input
                      type="date"
                      value={holdingsParamsAsOfDate}
                      onChange={(e) => setHoldingsParamsAsOfDate(e.target.value)}
                      className="text-sm border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-navy-500 focus:border-navy-500"
                    />
                  </div>
                  {holdingsWithParameters && holdingsWithParameters.holdings.length > 0 && (
                    <div className="relative export-menu-container">
                      <button
                        onClick={() => setOpenExportMenu(openExportMenu === 'overview' ? null : 'overview')}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                      >
                        Export
                        <ChevronDownIcon className="ml-2 h-4 w-4" />
                      </button>
                      {openExportMenu === 'overview' && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={() => {
                                if (!holdingsWithParameters) {
                                  alert('No holdings data available. Please wait for data to load.');
                                  return;
                                }
                                console.log('Exporting to Excel:', holdingsWithParameters);
                                exportHoldingsWithParameters(holdingsWithParameters, 'excel', portfolio.name);
                                setOpenExportMenu(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Export to Excel
                            </button>
                            <button
                              onClick={() => {
                                if (!holdingsWithParameters) {
                                  alert('No holdings data available. Please wait for data to load.');
                                  return;
                                }
                                console.log('Exporting to CSV:', holdingsWithParameters);
                                exportHoldingsWithParameters(holdingsWithParameters, 'csv', portfolio.name);
                                setOpenExportMenu(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Export to CSV
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {loadingHoldingsParams ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
                </div>
              ) : holdingsParamsError ? (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-red-700 text-sm">{holdingsParamsError}</p>
                      <button
                        onClick={async () => {
                          if (!id) return;
                          setHoldingsParamsError(null);
                          try {
                            setLoadingHoldingsParams(true);
                            const data = await apiService.getPortfolioHoldingsWithParameters(
                              id,
                              holdingsParamsAsOfDate || undefined
                            );
                            setHoldingsWithParameters(data);
                          } catch (err) {
                            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch holdings with parameters';
                            setHoldingsParamsError(errorMessage);
                            console.error('Error fetching holdings with parameters:', err);
                          } finally {
                            setLoadingHoldingsParams(false);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              ) : holdingsWithParameters && holdingsWithParameters.holdings.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    Showing {holdingsWithParameters.holdings.length} holdings
                    {holdingsParamsAsOfDate && (
                      <span> • As of: {new Date(holdingsParamsAsOfDate).toLocaleDateString()}</span>
                    )}
                    {holdingsWithParameters.asOfDate && (
                      <span> • Portfolio snapshot: {new Date(holdingsWithParameters.asOfDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                  {(() => {
                    // Collect all unique parameter names across all holdings
                    const allParameterNames = new Set<string>();
                    holdingsWithParameters.holdings.forEach((holding: any) => {
                      holding.parameters.forEach((param: any) => {
                        allParameterNames.add(param.parameter.name);
                      });
                    });
                    const parameterNames = Array.from(allParameterNames).sort();

                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                Company
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ticker
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Sector
                              </th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Weight (%)
                              </th>
                              {parameterNames.map((paramName) => (
                                <th 
                                  key={paramName} 
                                  scope="col" 
                                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                                  title={paramName}
                                >
                                  <div className="truncate max-w-[150px]" title={paramName}>
                                    {paramName}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {holdingsWithParameters.holdings.map((holding: any) => {
                              // Create a map of parameter values for quick lookup
                              const paramMap = new Map<string, any>();
                              holding.parameters.forEach((param: any) => {
                                paramMap.set(param.parameter.name, param);
                              });

                              return (
                                <tr key={holding.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                                    <div className="text-sm font-medium text-gray-900">
                                      <Link
                                        to={`/companies/${holding.company.id}`}
                                        className="text-navy-600 hover:text-navy-800"
                                      >
                                        {holding.company.name}
                                      </Link>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {holding.company.ticker || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {holding.company.sector || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {holding.weight?.toFixed(2) || 'N/A'}%
                                  </td>
                                  {parameterNames.map((paramName) => {
                                    const param = paramMap.get(paramName);
                                    if (param) {
                                      // Format the value based on type
                                      let displayValue: string;
                                      if (typeof param.value === 'boolean') {
                                        displayValue = param.value ? 'Yes' : 'No';
                                      } else {
                                        displayValue = String(param.value);
                                      }
                                      
                                      // Add unit if available
                                      const valueWithUnit = param.parameter.unit 
                                        ? `${displayValue} ${param.parameter.unit}`
                                        : displayValue;

                                      return (
                                        <td 
                                          key={paramName} 
                                          className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                                          title={param.parameter.description || paramName}
                                        >
                                          <div className="truncate max-w-[200px]" title={valueWithUnit}>
                                            {valueWithUnit}
                                          </div>
                                          {param.source && param.source !== 'csv-import' && (
                                            <div className="text-xs text-gray-400 mt-0.5" title={`Source: ${param.source}`}>
                                              {param.source}
                                            </div>
                                          )}
                                        </td>
                                      );
                                    } else {
                                      return (
                                        <td 
                                          key={paramName} 
                                          className="px-4 py-3 whitespace-nowrap text-sm text-gray-400"
                                        >
                                          N/A
                                        </td>
                                      );
                                    }
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              ) : holdingsWithParameters && holdingsWithParameters.holdings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No holdings found in this portfolio.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No data available. Please try refreshing the page.</p>
                </div>
              )}
            </div>
          )}

          {/* Portfolio Info Tab */}
          {activeTab === 'info' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Portfolio Information</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowAddHoldingModal(true)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700"
                  >
                    + Add Holding
                  </button>
                </div>
              </div>
              
              {/* Warning: Weights don't sum to 100% */}
              {portfolio.holdings && portfolio.holdings.length > 0 && (() => {
                const totalWeight = portfolio.holdings.reduce((sum, h) => sum + (h.weight || 0), 0);
                const needsNormalization = Math.abs(totalWeight - 100) > 0.01;
                
                if (needsNormalization) {
                  return (
                    <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 p-4">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-amber-800">
                            Weights do not sum to 100%
                          </h3>
                          <p className="mt-1 text-sm text-amber-700">
                            Current total: <strong>{totalWeight.toFixed(2)}%</strong>. 
                            Portfolio weights should sum to 100% for accurate "Sum of Weights Excluded" calculations.
                          </p>
                          <div className="mt-3">
                            <button
                              onClick={handleNormalizeWeights}
                              disabled={normalizingWeights}
                              className="px-3 py-1.5 border border-amber-600 rounded-md text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {normalizingWeights ? 'Normalizing...' : 'Normalize Weights to 100%'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-sm text-gray-900 mt-1">{portfolio.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Client</dt>
                  <dd className="text-sm text-gray-900 mt-1">{portfolio.client?.name || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900 mt-1">{new Date(portfolio.createdAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
                  <dd className="text-sm text-gray-900 mt-1">{new Date(portfolio.updatedAt).toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current Holdings</dt>
                  <dd className="text-sm text-gray-900 mt-1">{holdingsCount} companies</dd>
                </div>
                {latestScreening && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Default Criteria Set</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {latestScreening.criteriaSet.name} {latestScreening.criteriaSet.version}
                    </dd>
                  </div>
                )}
                {/* Display current holdings */}
                {portfolio.holdings && portfolio.holdings.length > 0 && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 mb-2">Holdings</dt>
                    <dd className="mt-1">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Weight (%)</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {portfolio.holdings.map((holding) => (
                              <tr key={holding.id}>
                                <td className="px-4 py-3 text-sm text-gray-900">{holding.company.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{holding.weight?.toFixed(2) || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">Total</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {portfolio.holdings.reduce((sum, h) => sum + (h.weight || 0), 0).toFixed(2)}%
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screen Portfolio Modal */}
      {showScreenModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Screen Portfolio</h3>
              <button
                onClick={() => setShowScreenModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Criteria Set *
                </label>
                <select
                  value={selectedCriteriaSet}
                  onChange={(e) => setSelectedCriteriaSet(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md"
                >
                  {criteriaSets.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.name} {cs.version}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  As of Date (optional)
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowScreenModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScreenPortfolio}
                  disabled={screeningInProgress || !selectedCriteriaSet}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {screeningInProgress ? 'Screening...' : 'Screen Portfolio'}
                </button>
              </div>
            </div>
          </div>
        </div>
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

      {/* Add Holding Modal */}
      {showAddHoldingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Holding</h3>
                <button
                  onClick={() => {
                    setShowAddHoldingModal(false);
                    setSelectedCompanyId('');
                    setHoldingWeight('');
                    setCompanySearchTerm('');
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Company *
                </label>
                <input
                  type="text"
                  placeholder="Search by name or ticker..."
                  value={companySearchTerm}
                  onChange={(e) => setCompanySearchTerm(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md"
                />
                {companySearchTerm && (
                  <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((company) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => {
                            setSelectedCompanyId(company.id);
                            setCompanySearchTerm(company.name + (company.ticker ? ` (${company.ticker})` : ''));
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            selectedCompanyId === company.id ? 'bg-navy-50 text-navy-900' : 'text-gray-900'
                          }`}
                        >
                          {company.name}
                          {company.ticker && <span className="text-gray-500 ml-2">({company.ticker})</span>}
                          {company.sector && <span className="text-gray-400 ml-2">• {company.sector}</span>}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">No companies found</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  value={holdingWeight}
                  onChange={(e) => setHoldingWeight(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">Enter the portfolio weight as a percentage (0-100)</p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddHoldingModal(false);
                    setSelectedCompanyId('');
                    setHoldingWeight('');
                    setCompanySearchTerm('');
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHolding}
                  disabled={addingHolding || !selectedCompanyId || !holdingWeight}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingHolding ? 'Adding...' : 'Add Holding'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDetailPage;
