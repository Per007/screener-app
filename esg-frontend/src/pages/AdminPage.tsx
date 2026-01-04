import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../api/apiService';
import {
  TrashIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ServerStackIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

// Interface for database statistics
interface DatabaseStats {
  users: number;
  clients: number;
  portfolios: number;
  companies: number;
  parameters: number;
  companyParameterValues: number;
  portfolioHoldings: number;
  criteriaSets: number;
  rules: number;
  screeningResults: number;
  screeningCompanyResults: number;
  clientParameters: number;
}

// Interface for cleanup action result
interface ActionResult {
  success: boolean;
  message: string;
  deletedCount?: number;
}

// Database table configuration for display
const tableConfig = [
  { 
    key: 'screeningResults', 
    name: 'Screening Results', 
    description: 'Historical screening results and company-level details',
    endpoint: 'screening-results',
    cascade: ['screeningCompanyResults'],
    color: 'bg-blue-50 border-blue-200'
  },
  { 
    key: 'companyParameterValues', 
    name: 'Parameter Values', 
    description: 'ESG parameter values assigned to companies',
    endpoint: 'parameter-values',
    cascade: [],
    color: 'bg-green-50 border-green-200'
  },
  { 
    key: 'portfolios', 
    name: 'Portfolios', 
    description: 'Investment portfolios and their holdings',
    endpoint: 'portfolios',
    cascade: ['portfolioHoldings'],
    color: 'bg-purple-50 border-purple-200'
  },
  { 
    key: 'companies', 
    name: 'Companies', 
    description: 'Company entities in the system',
    endpoint: 'companies',
    cascade: ['companyParameterValues', 'portfolioHoldings', 'screeningCompanyResults'],
    color: 'bg-orange-50 border-orange-200'
  },
  { 
    key: 'criteriaSets', 
    name: 'Criteria Sets', 
    description: 'ESG screening criteria sets and rules',
    endpoint: 'criteria-sets',
    cascade: ['rules'],
    color: 'bg-indigo-50 border-indigo-200'
  },
  { 
    key: 'parameters', 
    name: 'Parameters', 
    description: 'ESG parameter definitions (global and client-specific)',
    endpoint: 'parameters',
    cascade: ['companyParameterValues', 'clientParameters'],
    color: 'bg-teal-50 border-teal-200'
  },
  { 
    key: 'clientParameters', 
    name: 'Client Parameters', 
    description: 'Client-specific parameter thresholds and settings',
    endpoint: 'client-parameters',
    cascade: [],
    color: 'bg-pink-50 border-pink-200'
  },
  { 
    key: 'clients', 
    name: 'Clients', 
    description: 'Client organizations',
    endpoint: 'clients',
    cascade: ['portfolios', 'parameters', 'clientParameters', 'criteriaSets'],
    color: 'bg-yellow-50 border-yellow-200'
  },
  { 
    key: 'users', 
    name: 'Users (Non-Admin)', 
    description: 'User accounts (admin users are preserved)',
    endpoint: 'users',
    cascade: [],
    color: 'bg-red-50 border-red-200'
  },
];

const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Map<string, ActionResult>>(new Map());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    endpoint: string;
    isReset?: boolean;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate('/portfolios');
    }
  }, [isAdmin, navigate]);

  // Fetch database statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch database statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  // Handle delete action for a specific table
  const handleDelete = async (endpoint: string) => {
    setIsProcessing(true);
    try {
      const result = await apiService.adminDeleteData(endpoint);
      setActionResults(prev => new Map(prev).set(endpoint, {
        success: true,
        message: result.message,
        deletedCount: result.deletedCount
      }));
      // Refresh stats after deletion
      await fetchStats();
    } catch (err) {
      setActionResults(prev => new Map(prev).set(endpoint, {
        success: false,
        message: err instanceof Error ? err.message : 'Delete failed'
      }));
    } finally {
      setIsProcessing(false);
      setConfirmDialog(null);
    }
  };

  // Handle full database reset
  const handleReset = async () => {
    setIsProcessing(true);
    try {
      const result = await apiService.adminResetDatabase();
      setActionResults(prev => new Map(prev).set('reset', {
        success: true,
        message: result.message
      }));
      // Refresh stats after reset
      await fetchStats();
    } catch (err) {
      setActionResults(prev => new Map(prev).set('reset', {
        success: false,
        message: err instanceof Error ? err.message : 'Reset failed'
      }));
    } finally {
      setIsProcessing(false);
      setConfirmDialog(null);
    }
  };

  // Show confirmation dialog
  const openConfirmDialog = (
    title: string, 
    message: string, 
    endpoint: string, 
    isReset: boolean = false
  ) => {
    setConfirmDialog({ isOpen: true, title, message, endpoint, isReset });
  };

  // Clear action result message
  const clearActionResult = (key: string) => {
    setActionResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  // Calculate total records
  const getTotalRecords = () => {
    if (!stats) return 0;
    return Object.values(stats).reduce((sum, count) => sum + count, 0);
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ServerStackIcon className="h-8 w-8 text-navy-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Database Administration</h1>
            <p className="text-gray-500 text-sm">Manage and clean up database records</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={isProcessing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <p className="ml-3 text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Database Overview Card */}
      <div className="bg-gradient-to-r from-navy-600 to-navy-800 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold opacity-90">Database Overview</h2>
            <p className="text-4xl font-bold mt-2">{getTotalRecords().toLocaleString()}</p>
            <p className="text-sm opacity-75 mt-1">Total records across all tables</p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{stats?.companies || 0}</p>
              <p className="text-xs opacity-75">Companies</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.portfolios || 0}</p>
              <p className="text-xs opacity-75">Portfolios</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.screeningResults || 0}</p>
              <p className="text-xs opacity-75">Screenings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone - Full Reset */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <ShieldExclamationIcon className="h-8 w-8 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">Danger Zone</h3>
            <p className="text-red-600 text-sm mt-1">
              Reset the entire database. This will delete all data except admin user accounts.
              This action cannot be undone.
            </p>
            {actionResults.get('reset') && (
              <div className={`mt-3 p-3 rounded-md ${actionResults.get('reset')?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center">
                    {actionResults.get('reset')?.success ? (
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 mr-2" />
                    )}
                    {actionResults.get('reset')?.message}
                  </span>
                  <button onClick={() => clearActionResult('reset')} className="text-sm underline">
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => openConfirmDialog(
              'Reset Entire Database',
              'This will permanently delete ALL data in the database except admin user accounts. This action cannot be undone. Are you absolutely sure?',
              'reset',
              true
            )}
            disabled={isProcessing}
            className="flex-shrink-0 inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Reset Database
          </button>
        </div>
      </div>

      {/* Table-by-Table Cleanup */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cleanup by Table</h2>
        <div className="grid gap-4">
          {tableConfig.map((table) => {
            const count = stats?.[table.key as keyof DatabaseStats] || 0;
            const result = actionResults.get(table.endpoint);
            
            return (
              <div 
                key={table.key} 
                className={`border rounded-lg p-4 ${table.color} transition-all hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-gray-900">{table.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {count.toLocaleString()} records
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{table.description}</p>
                    {table.cascade.length > 0 && (
                      <p className="text-xs text-amber-700 mt-1">
                        ⚠️ Cascade deletes: {table.cascade.join(', ')}
                      </p>
                    )}
                    {result && (
                      <div className={`mt-2 p-2 rounded text-sm ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center">
                            {result.success ? (
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                            ) : (
                              <XCircleIcon className="h-4 w-4 mr-1" />
                            )}
                            {result.message}
                            {result.deletedCount !== undefined && ` (${result.deletedCount} deleted)`}
                          </span>
                          <button 
                            onClick={() => clearActionResult(table.endpoint)} 
                            className="text-xs underline ml-2"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openConfirmDialog(
                      `Clear ${table.name}`,
                      `This will permanently delete all ${count} records from ${table.name}.${table.cascade.length > 0 ? ` This will also cascade delete related records in: ${table.cascade.join(', ')}.` : ''} This action cannot be undone.`,
                      table.endpoint
                    )}
                    disabled={isProcessing || count === 0}
                    className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Clear
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Statistics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detailed Statistics</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Table Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Record Count
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stats && Object.entries(stats).map(([key, count]) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => !isProcessing && setConfirmDialog(null)}
            />
            
            {/* Dialog */}
            <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${confirmDialog.isReset ? 'bg-red-100' : 'bg-yellow-100'} sm:mx-0 sm:h-10 sm:w-10`}>
                  <ExclamationTriangleIcon className={`h-6 w-6 ${confirmDialog.isReset ? 'text-red-600' : 'text-yellow-600'}`} />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {confirmDialog.title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {confirmDialog.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => confirmDialog.isReset ? handleReset() : handleDelete(confirmDialog.endpoint)}
                  className={`inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto sm:text-sm disabled:opacity-50 ${confirmDialog.isReset ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'}`}
                >
                  {isProcessing ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-5 w-5 mr-2" />
                      {confirmDialog.isReset ? 'Reset Database' : 'Delete'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setConfirmDialog(null)}
                  className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
