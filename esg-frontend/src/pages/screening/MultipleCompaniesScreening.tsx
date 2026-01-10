import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../api/apiService';

interface Company {
  id: string;
  name: string;
}

interface CriteriaSet {
  id: string;
  name: string;
  version: string;
}

const MultipleCompaniesScreening: React.FC = () => {
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [criteriaSetId, setCriteriaSetId] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  // Dynamic data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [criteriaSets, setCriteriaSets] = useState<CriteriaSet[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [companiesData, criteriaSetsData] = await Promise.all([
          apiService.getCompanies(),
          apiService.getCriteriaSets()
        ]);
        setCompanies(companiesData);
        setCriteriaSets(criteriaSetsData);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
        setError('Failed to load form data. Please refresh the page.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleCompanySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setCompanyIds(selectedOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.screenMultipleCompanies({
        companyIds,
        criteriaSetId,
        asOfDate: asOfDate || undefined
      });
      setResults(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Screening failed');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/screening-tools" className="text-navy-600 hover:text-navy-800 text-sm">
          ← Screening Tools
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">Multiple Companies Screening</h1>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="companyIds" className="block text-sm font-medium text-gray-700">
                Select Companies (hold Ctrl/Cmd to select multiple)
              </label>
              <div className="mt-1">
                <select
                  id="companyIds"
                  name="companyIds"
                  multiple
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md h-32"
                  onChange={handleCompanySelect}
                >
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-gray-500">Selected: {companyIds.length} companies</p>
            </div>

            <div>
              <label htmlFor="criteriaSetId" className="block text-sm font-medium text-gray-700">
                Select Criteria Set
              </label>
              <div className="mt-1">
                <select
                  id="criteriaSetId"
                  name="criteriaSetId"
                  required
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md"
                  value={criteriaSetId}
                  onChange={(e) => setCriteriaSetId(e.target.value)}
                >
                  <option value="">Select criteria set...</option>
                  {criteriaSets.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.name} v{cs.version}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="asOfDate" className="block text-sm font-medium text-gray-700">
                As of Date (optional)
              </label>
              <div className="mt-1">
                <input
                  type="date"
                  id="asOfDate"
                  name="asOfDate"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Screening...
                  </span>
                ) : (
                  'Screen Companies'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {results && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Screening Results</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Companies:</span>
                <span className="text-sm text-gray-900">{results.summary.totalHoldings}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Passed:</span>
                <span className="text-sm text-green-600 font-medium">{results.summary.passed} ({results.summary.passRate}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Failed:</span>
                <span className="text-sm text-red-600 font-medium">{results.summary.failed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Criteria Set:</span>
                <span className="text-sm text-gray-900">{results.criteriaSet.name} v{results.criteriaSet.version}</span>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-2">Company Results:</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passed Rules</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed Rules</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.results.map((company: any) => (
                        <tr key={company.companyId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{company.companyName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {company.passed ? '🟢 Passed' : '🔴 Failed'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {company.ruleResults.filter((r: any) => r.passed).length} / {company.ruleResults.length}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {company.ruleResults.filter((r: any) => !r.passed).length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultipleCompaniesScreening;
