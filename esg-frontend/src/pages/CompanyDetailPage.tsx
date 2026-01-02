import React from 'react';
import { useParams, Link } from 'react-router-dom';

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/companies" className="text-navy-600 hover:text-navy-800 text-sm">
            ← Companies
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            Company Detail: {id}
          </h1>
          <p className="text-gray-600">Energy • ISIN: US9876543210 • United States</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Edit
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Company Details</h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900 mt-1">OilCo Industries</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ISIN</dt>
                <dd className="text-sm text-gray-900 mt-1">US9876543210</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sector</dt>
                <dd className="text-sm text-gray-900 mt-1">Energy</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Region</dt>
                <dd className="text-sm text-gray-900 mt-1">United States</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Market Cap</dt>
                <dd className="text-sm text-gray-900 mt-1">$45.2B</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-sm text-gray-900 mt-1">Global energy producer with operations in oil, gas, and renewable energy sectors.</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ESG Parameters</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Carbon Emissions:</span>
                <span className="text-sm font-medium text-gray-900">5,000 tons/year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Board Diversity:</span>
                <span className="text-sm font-medium text-gray-900">15%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Environmental Policy:</span>
                <span className="text-sm font-medium text-gray-900">No</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Controversy Level:</span>
                <span className="text-sm font-medium text-red-600">High</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Renewable Energy:</span>
                <span className="text-sm font-medium text-gray-900">5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Waste Reduction:</span>
                <span className="text-sm font-medium text-gray-900">12%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Screening Results</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criteria Set</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed Rules</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2024-01-15</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Tech Fund 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Standard ESG v2.1</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      🔴 Failed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">4 rules</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2024-01-14</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Energy Portfolio</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Standard ESG v2.1</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      🔴 Failed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">4 rules</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
