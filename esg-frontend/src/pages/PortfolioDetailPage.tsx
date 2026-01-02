import React from 'react';
import { useParams, Link } from 'react-router-dom';

const PortfolioDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/portfolios" className="text-navy-600 hover:text-navy-800 text-sm">
            ← Portfolios
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            Portfolio Detail: {id}
          </h1>
          <p className="text-gray-600">Client • 145 holdings • Last screened: 2024-01-15</p>
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Screen
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <div className="h-6 w-6 text-red-600">🔴</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Overall Status</dt>
                <dd className="text-2xl font-semibold text-gray-900">FAILED</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <div className="h-6 w-6 text-green-600">🟢</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Holdings Passed</dt>
                <dd className="text-2xl font-semibold text-gray-900">127</dd>
                <dd className="text-sm text-gray-600">(87.6%)</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <div className="h-6 w-6 text-red-600">🔴</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Holdings Failed</dt>
                <dd className="text-2xl font-semibold text-gray-900">18</dd>
                <dd className="text-sm text-gray-600">(12.4%)</dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <div className="h-6 w-6 text-blue-600">📋</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">Criteria Set</dt>
                <dd className="text-lg font-semibold text-gray-900">Standard ESG</dd>
                <dd className="text-sm text-gray-600">Screen v2.1</dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Failed Holdings (18)</h2>
          <button className="mt-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Export Failed
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">All Holdings (145)</h2>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex space-x-4">
              <select className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md">
                <option>Status: All</option>
                <option>Status: Passed</option>
                <option>Status: Failed</option>
              </select>
              <select className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm rounded-md">
                <option>Sector: All</option>
              </select>
            </div>
            <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Export All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDetailPage;
