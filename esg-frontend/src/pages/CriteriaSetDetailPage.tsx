import React from 'react';
import { useParams, Link } from 'react-router-dom';

const CriteriaSetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/criteria-sets" className="text-navy-600 hover:text-navy-800 text-sm">
            ← Criteria Sets
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            Criteria Set Detail: {id}
          </h1>
          <p className="text-gray-600">Global • 12 rules • Last modified: 2024-01-10 • Active</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Clone
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Archive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Version History</h2>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-navy-600 rounded-full mr-3"></div>
                <span className="text-sm text-gray-900">v2.1 (current)</span>
                <span className="text-xs text-gray-500 ml-auto">2024-01-10</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">v2.0</span>
                <span className="text-xs text-gray-500 ml-auto">2023-12-15</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-gray-300 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">v1.5</span>
                <span className="text-xs text-gray-500 ml-auto">2023-11-01</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Rules (12)</h2>
              <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700">
                + Add Rule
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rule Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Carbon Emissions Limit</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Carbon Emissions</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">&lt;</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">500</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Exclude
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Board Diversity Minimum</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Board Diversity</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">≥</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">30%</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Exclude
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Environmental Policy Required</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Environmental Policy</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">=</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Yes</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Warn
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriteriaSetDetailPage;
