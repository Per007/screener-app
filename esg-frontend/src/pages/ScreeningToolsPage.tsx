import React from 'react';
import { Link } from 'react-router-dom';

const ScreeningToolsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Screening Tools</h1>
        <p className="text-gray-600 mt-1">Run ad-hoc screenings for analysis and testing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <div className="h-6 w-6 text-blue-600">🏢</div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Individual Company Screen</h3>
                <p className="text-sm text-gray-600">Screen a single company against criteria set</p>
              </div>
            </div>
            <Link
              to="/screening-tools/individual-company"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              Launch Tool
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <div className="h-6 w-6 text-blue-600">🏢🏢</div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Multiple Companies Comparison</h3>
                <p className="text-sm text-gray-600">Compare multiple companies side-by-side</p>
              </div>
            </div>
            <Link
              to="/screening-tools/multiple-companies"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              Launch Tool
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <div className="h-6 w-6 text-blue-600">🏭</div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Sector Analysis</h3>
                <p className="text-sm text-gray-600">Screen all companies in a sector</p>
              </div>
            </div>
            <Link
              to="/screening-tools/sector"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              Launch Tool
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <div className="h-6 w-6 text-blue-600">🌍</div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Region Analysis</h3>
                <p className="text-sm text-gray-600">Screen companies by geographic region</p>
              </div>
            </div>
            <Link
              to="/screening-tools/region"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              Launch Tool
            </Link>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <div className="h-6 w-6 text-blue-600">⚙️</div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Custom Screening</h3>
                <p className="text-sm text-gray-600">Screen all companies with custom criteria</p>
              </div>
            </div>
            <Link
              to="/screening-tools/custom"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500"
            >
              Launch Tool
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreeningToolsPage;
