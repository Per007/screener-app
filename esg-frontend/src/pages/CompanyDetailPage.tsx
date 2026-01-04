import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../api/apiService';

// Type definitions for the company data
interface Parameter {
  id: string;
  name: string;
  dataType: string; // 'number' | 'boolean' | 'string'
  unit?: string;
  description?: string;
}

interface ParameterValue {
  id: string;
  companyId: string;
  parameterId: string;
  value: string; // JSON-encoded value
  asOfDate: string;
  source?: string;
  parameter: Parameter;
}

interface Company {
  id: string;
  name: string;
  ticker?: string;
  sector?: string;
  parameterValues: ParameterValue[];
}

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // State for company data, loading, and error handling
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch company data when component mounts or id changes
  useEffect(() => {
    const fetchCompany = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await apiService.getCompany(id);
        setCompany(data);
      } catch (err) {
        console.error('Failed to fetch company:', err);
        setError(err instanceof Error ? err.message : 'Failed to load company details');
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [id]);

  /**
   * Parse the JSON-encoded value and format it for display
   * The value is stored as a JSON string in the database, so we need to parse it
   * and then format it based on the parameter's data type
   */
  const formatParameterValue = (paramValue: ParameterValue): string => {
    try {
      // Parse the JSON-encoded value
      const parsedValue = JSON.parse(paramValue.value);
      const { dataType, unit } = paramValue.parameter;

      // Format based on the data type
      if (dataType === 'boolean') {
        // Display boolean as Yes/No for better readability
        return parsedValue ? 'Yes' : 'No';
      } else if (dataType === 'number') {
        // Format numbers with the unit if available
        // Use toLocaleString for nice number formatting (e.g., 1,000 instead of 1000)
        const formattedNumber = typeof parsedValue === 'number' 
          ? parsedValue.toLocaleString() 
          : parsedValue;
        return unit ? `${formattedNumber} ${unit}` : String(formattedNumber);
      } else {
        // String values - display as-is
        return String(parsedValue);
      }
    } catch (e) {
      // If JSON parsing fails, return the raw value
      console.warn('Failed to parse parameter value:', paramValue.value);
      return paramValue.value;
    }
  };

  /**
   * Get the most recent value for each parameter
   * Since a parameter can have multiple values over time (different asOfDate),
   * we group by parameter and take the most recent one
   */
  const getLatestParameterValues = (): ParameterValue[] => {
    if (!company?.parameterValues?.length) return [];

    // Group parameter values by parameterId
    const grouped = company.parameterValues.reduce((acc, pv) => {
      const key = pv.parameterId;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(pv);
      return acc;
    }, {} as Record<string, ParameterValue[]>);

    // For each parameter, get the most recent value (backend already orders by asOfDate desc)
    // but we'll sort again just to be safe
    return Object.values(grouped).map(values => {
      return values.sort((a, b) => 
        new Date(b.asOfDate).getTime() - new Date(a.asOfDate).getTime()
      )[0];
    });
  };

  /**
   * Get appropriate text color class based on parameter value
   * This adds visual emphasis to certain values (e.g., red for concerning values)
   */
  const getValueColorClass = (paramValue: ParameterValue): string => {
    try {
      const parsedValue = JSON.parse(paramValue.value);
      const paramName = paramValue.parameter.name.toLowerCase();

      // Add red coloring for high-concern values
      // You can customize these rules based on your business logic
      if (paramName.includes('controversy') && 
          (parsedValue === 'High' || parsedValue === 'Severe')) {
        return 'text-red-600';
      }
      
      // Boolean parameters that are false might be concerning
      // (e.g., "Has Environmental Policy: No")
      if (paramValue.parameter.dataType === 'boolean' && !parsedValue) {
        if (paramName.includes('policy') || 
            paramName.includes('compliance') ||
            paramName.includes('certified')) {
          return 'text-amber-600';
        }
      }

      return 'text-gray-900';
    } catch {
      return 'text-gray-900';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <Link to="/companies" className="text-navy-600 hover:text-navy-800 text-sm">
          ← Companies
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  // Show not found state
  if (!company) {
    return (
      <div className="space-y-6">
        <Link to="/companies" className="text-navy-600 hover:text-navy-800 text-sm">
          ← Companies
        </Link>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-gray-600">Company not found</p>
        </div>
      </div>
    );
  }

  // Get the latest parameter values to display
  const latestParameters = getLatestParameterValues();

  return (
    <div className="space-y-6">
      {/* Header section with breadcrumb and company name */}
      <div className="flex justify-between items-center">
        <div>
          <Link to="/companies" className="text-navy-600 hover:text-navy-800 text-sm">
            ← Companies
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-2">
            {company.name}
          </h1>
          <p className="text-gray-600">
            {company.sector || 'No sector'} 
            {company.ticker && ` • Ticker: ${company.ticker}`}
          </p>
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

      {/* Two-column layout for company details and ESG parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Details Card */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Company Details</h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900 mt-1">{company.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Ticker</dt>
                <dd className="text-sm text-gray-900 mt-1">{company.ticker || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Sector</dt>
                <dd className="text-sm text-gray-900 mt-1">{company.sector || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total ESG Parameters</dt>
                <dd className="text-sm text-gray-900 mt-1">{latestParameters.length}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* ESG Parameters Card - Now showing ACTUAL values from the database */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">ESG Parameters</h2>
            
            {latestParameters.length === 0 ? (
              // No parameters available for this company
              <p className="text-gray-500 text-sm">No ESG parameters available for this company.</p>
            ) : (
              // Display each parameter with its value
              <div className="space-y-3">
                {latestParameters.map((paramValue) => (
                  <div key={paramValue.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="text-sm text-gray-600">
                        {paramValue.parameter.name}:
                      </span>
                      {/* Show parameter description as a tooltip hint */}
                      {paramValue.parameter.description && (
                        <span 
                          className="ml-1 text-gray-400 cursor-help" 
                          title={paramValue.parameter.description}
                        >
                          ℹ️
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-medium ${getValueColorClass(paramValue)}`}>
                      {formatParameterValue(paramValue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parameter History Table - Shows when data was recorded */}
      {latestParameters.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Parameter Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parameter
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      As Of Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {latestParameters.map((paramValue) => (
                    <tr key={paramValue.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {paramValue.parameter.name}
                        </div>
                        {paramValue.parameter.description && (
                          <div className="text-xs text-gray-500">
                            {paramValue.parameter.description}
                          </div>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getValueColorClass(paramValue)}`}>
                        {formatParameterValue(paramValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {paramValue.parameter.dataType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(paramValue.asOfDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {paramValue.source || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent Screening Results section - placeholder for future implementation */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900">Recent Screening Results</h2>
          <p className="text-gray-500 text-sm mt-2">
            Screening history for this company will be displayed here once available.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
