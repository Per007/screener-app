import React from 'react';

const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Create custom reports or use pre-built templates</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500">
          + New Report Builder
        </button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-2">
                  <div className="h-5 w-5 text-blue-600">📊</div>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Compliance Report</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Full screening results with failed holdings</p>
              <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700">
                Generate
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-2">
                  <div className="h-5 w-5 text-green-600">📈</div>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Executive Summary</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">High-level overview for executives</p>
              <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700">
                Generate
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-2">
                  <div className="h-5 w-5 text-purple-600">🔍</div>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Audit Report</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Complete audit trail with history</p>
              <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700">
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
