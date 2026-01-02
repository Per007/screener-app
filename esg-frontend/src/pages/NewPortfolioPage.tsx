import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { XMarkIcon, DocumentArrowUpIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

/**
 * Interface for CSV preview data
 */
interface CSVPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

/**
 * Interface for validation result
 */
interface ValidationResult {
  isValid: boolean;
  rowCount: number;
  columns: string[];
  errors: Array<{
    rowNumber: number;
    errors: string[];
    warnings: string[];
  }>;
  message?: string;
}

/**
 * Interface for import result
 */
interface ImportResult {
  success: boolean;
  portfolioId?: string;
  portfolioName?: string;
  summary: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    companiesCreated: number;
    companiesUpdated: number;
    parametersCreated: number;
    parameterValuesCreated: number;
    holdingsCreated: number;
  };
  errors: Array<{
    rowNumber: number;
    errors: string[];
  }>;
  warnings: string[];
  message?: string;
}

/**
 * NewPortfolioPage Component
 * 
 * Allows users to create a new portfolio either manually or by uploading a CSV file.
 * Features:
 * - Tab interface for Manual Entry vs CSV Upload
 * - Drag-and-drop file upload
 * - CSV preview before import
 * - Validation feedback
 * - Progress indicator during import
 */
const NewPortfolioPage: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual');
  
  // Common state
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();

  // CSV upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVPreviewData | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  /**
   * Fetch clients on mount (for admin users)
   */
  useEffect(() => {
    if (isAdmin) {
      const fetchClients = async () => {
        try {
          const data = await apiService.getClients();
          setClients(data);
          if (data.length > 0) {
            setClientId(data[0].id);
          }
        } catch (err) {
          setError('Failed to load clients');
        }
      };
      fetchClients();
    } else if (user?.clientId) {
      setClientId(user.clientId);
    }
  }, [isAdmin, user]);

  /**
   * Handle manual portfolio creation
   */
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const portfolioData: any = { name };
      if (isAdmin && clientId) {
        portfolioData.clientId = clientId;
      }

      await apiService.createPortfolio(portfolioData);
      navigate('/portfolios');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create portfolio');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Parse CSV file for preview
   */
  const parseCSVForPreview = (content: string): CSVPreviewData => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { headers: [], rows: [], totalRows: 0 };
    }

    // Parse headers (first line)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Parse data rows (show first 5 for preview)
    const rows = lines.slice(1, 6).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && !inQuotes) {
          inQuotes = true;
        } else if (char === '"' && inQuotes) {
          inQuotes = false;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });

    return {
      headers,
      rows,
      totalRows: lines.length - 1
    };
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setValidationResult(null);
    setImportResult(null);

    // Read and preview CSV
    try {
      const content = await selectedFile.text();
      const preview = parseCSVForPreview(content);
      setCsvPreview(preview);

      // Auto-set portfolio name from filename if not set
      if (!name) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setName(fileName);
      }
    } catch (err) {
      setError('Failed to read file');
    }
  }, [name]);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      handleFileSelect(droppedFile);
    } else {
      setError('Please upload a CSV file');
    }
  }, [handleFileSelect]);

  /**
   * Handle drag events
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * Validate CSV file
   */
  const handleValidate = async () => {
    if (!file) return;

    setValidating(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiService.validateCSV(formData);
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  /**
   * Import CSV file
   */
  const handleImport = async () => {
    if (!file || !name || !clientId) {
      setError('Please fill in all required fields');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('portfolioName', name);
      formData.append('createMissingCompanies', 'true');
      formData.append('createMissingParameters', 'true');
      formData.append('updateExistingValues', 'true');

      const result = await apiService.importPortfolio(clientId, formData);
      setImportResult(result);

      if (result.success && result.portfolioId) {
        // Redirect to portfolio detail page after short delay
        setTimeout(() => {
          navigate(`/portfolios/${result.portfolioId}`);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  /**
   * Download CSV template
   */
  const handleDownloadTemplate = async () => {
    try {
      await apiService.downloadTemplate();
    } catch (err) {
      setError('Failed to download template');
    }
  };

  /**
   * Reset file selection
   */
  const resetFileSelection = () => {
    setFile(null);
    setCsvPreview(null);
    setValidationResult(null);
    setImportResult(null);
    setName('');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Create New Portfolio</h1>
            <button
              onClick={() => navigate('/portfolios')}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manual'
                    ? 'border-navy-500 text-navy-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manual Entry
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'csv'
                    ? 'border-navy-500 text-navy-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                CSV Upload
              </button>
            </nav>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Portfolio Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                  placeholder="Enter portfolio name"
                />
              </div>

              {isAdmin && (
                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                    Client *
                  </label>
                  <select
                    id="clientId"
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/portfolios')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Portfolio'}
                </button>
              </div>
            </form>
          )}

          {/* CSV Upload Tab */}
          {activeTab === 'csv' && (
            <div className="space-y-6">
              {/* Download Template Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download Template
                </button>
              </div>

              {/* File Drop Zone */}
              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-navy-500 bg-navy-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-navy-600 hover:text-navy-500 font-medium"
                    >
                      Click to upload
                      <input
                        id="file-upload"
                        type="file"
                        accept=".csv"
                        className="sr-only"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0];
                          if (selectedFile) handleFileSelect(selectedFile);
                        }}
                      />
                    </label>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">CSV file up to 10MB</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected File Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <DocumentArrowUpIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                          {csvPreview && ` • ${csvPreview.totalRows} rows`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetFileSelection}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* CSV Preview */}
                  {csvPreview && csvPreview.headers.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700">
                          Preview (first {csvPreview.rows.length} rows of {csvPreview.totalRows})
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {csvPreview.headers.map((header, idx) => (
                                <th
                                  key={idx}
                                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvPreview.rows.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <td
                                    key={cellIdx}
                                    className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                                  >
                                    {cell || <span className="text-gray-400">-</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Portfolio Name Input */}
                  <div>
                    <label htmlFor="csv-name" className="block text-sm font-medium text-gray-700">
                      Portfolio Name *
                    </label>
                    <input
                      type="text"
                      id="csv-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                      placeholder="Enter portfolio name"
                    />
                  </div>

                  {/* Client Selection (Admin only) */}
                  {isAdmin && (
                    <div>
                      <label htmlFor="csv-clientId" className="block text-sm font-medium text-gray-700">
                        Client *
                      </label>
                      <select
                        id="csv-clientId"
                        required
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                      >
                        <option value="">Select a client...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Validation Result */}
                  {validationResult && (
                    <div className={`p-4 rounded-lg ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center">
                        {validationResult.isValid ? (
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className={`font-medium ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                          {validationResult.message || (validationResult.isValid ? 'File is valid' : 'File has errors')}
                        </span>
                      </div>
                      {validationResult.errors && validationResult.errors.length > 0 && (
                        <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                          {validationResult.errors.slice(0, 5).map((err, idx) => (
                            <li key={idx}>
                              Row {err.rowNumber}: {err.errors.join(', ')}
                            </li>
                          ))}
                          {validationResult.errors.length > 5 && (
                            <li>... and {validationResult.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Import Result */}
                  {importResult && (
                    <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                      <div className="flex items-center mb-2">
                        {importResult.success ? (
                          <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                          {importResult.message || (importResult.success ? 'Import successful!' : 'Import failed')}
                        </span>
                      </div>
                      {importResult.success && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-green-700">
                          <div>Companies: {importResult.summary.companiesCreated} new</div>
                          <div>Parameters: {importResult.summary.parametersCreated} new</div>
                          <div>Holdings: {importResult.summary.holdingsCreated}</div>
                          <div>Rows: {importResult.summary.successfulRows}/{importResult.summary.totalRows}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => navigate('/portfolios')}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleValidate}
                      disabled={validating || importing}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {validating ? 'Validating...' : 'Validate'}
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={importing || !name || !clientId}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? 'Importing...' : 'Import Portfolio'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewPortfolioPage;
