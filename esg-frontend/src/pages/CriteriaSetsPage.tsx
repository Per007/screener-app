import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../api/apiService';
import { MagnifyingGlassIcon as SearchIcon } from '@heroicons/react/24/outline';

const CriteriaSetsPage: React.FC = () => {
  const [criteriaSets, setCriteriaSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCriteriaSets = async () => {
      try {
        const data = await apiService.getCriteriaSets();
        setCriteriaSets(data);
      } catch (err) {
        setError('Failed to fetch criteria sets');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCriteriaSets();
  }, []);

  const filteredCriteriaSets = criteriaSets.filter(cs =>
    cs.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cs.version && cs.version.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4 sm:mb-0">Criteria Sets</h1>
        <div className="flex items-center space-x-4">
          <Link
            to="/criteria-sets/new"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700"
          >
            + New Criteria Set
          </Link>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Search criteria sets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Effective Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCriteriaSets.length > 0 ? (
              filteredCriteriaSets.map((cs) => (
                <tr key={cs.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{cs.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{cs.version || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {cs.effectiveDate ? new Date(cs.effectiveDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/criteria-sets/${cs.id}`}
                      className="text-navy-600 hover:text-navy-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No criteria sets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="text-sm text-gray-600">
        Showing {filteredCriteriaSets.length} of {criteriaSets.length} criteria sets
      </div>
    </div>
  );
};

export default CriteriaSetsPage;
