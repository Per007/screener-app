import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../api/apiService';
import AddRuleModal from '../components/AddRuleModal';
import { formatRuleExpression } from '../utils/ruleParser';

/**
 * Rule interface for the criteria set
 */
interface Rule {
  id: string;
  name: string;
  description?: string;
  expression: any;
  failureMessage?: string;
  severity: 'exclude' | 'warn' | 'info';
}

/**
 * Detail page for a criteria set
 * Shows all rules and allows adding, editing, and deleting
 */
const CriteriaSetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Data state
  const [criteriaSet, setCriteriaSet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  
  // Edit criteria set details state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editEffectiveDate, setEditEffectiveDate] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  
  // Action states
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);

  /**
   * Fetches the criteria set data
   */
  useEffect(() => {
    if (!id) return;
    
    const fetchCriteriaSet = async () => {
      try {
        setLoading(true);
        const data = await apiService.getCriteriaSet(id);
        setCriteriaSet(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch criteria set');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCriteriaSet();
  }, [id]);

  /**
   * Opens the modal for adding a new rule
   */
  const handleAddRuleClick = () => {
    setEditingRule(null);
    setShowRuleModal(true);
  };

  /**
   * Opens the modal for editing an existing rule
   */
  const handleEditRuleClick = (rule: Rule) => {
    setEditingRule(rule);
    setShowRuleModal(true);
  };

  /**
   * Handles adding a new rule
   */
  const handleAddRule = async (rule: {
    name: string;
    description?: string;
    expression: any;
    failureMessage?: string;
    severity: 'exclude' | 'warn' | 'info';
  }) => {
    if (!id) return;
    
    try {
      setSavingRule(true);
      await apiService.addRuleToCriteriaSet(id, rule);
      
      // Refresh criteria set data
      const data = await apiService.getCriteriaSet(id);
      setCriteriaSet(data);
      
      setShowRuleModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add rule');
    } finally {
      setSavingRule(false);
    }
  };

  /**
   * Handles editing an existing rule
   */
  const handleEditRule = async (ruleId: string, ruleData: {
    name?: string;
    description?: string;
    expression?: any;
    failureMessage?: string;
    severity?: 'exclude' | 'warn' | 'info';
  }) => {
    if (!id) return;
    
    try {
      setSavingRule(true);
      await apiService.updateRule(id, ruleId, ruleData);
      
      // Refresh criteria set data
      const data = await apiService.getCriteriaSet(id);
      setCriteriaSet(data);
      
      setShowRuleModal(false);
      setEditingRule(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update rule');
    } finally {
      setSavingRule(false);
    }
  };

  /**
   * Handles deleting a rule
   */
  const handleDeleteRule = async (ruleId: string) => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }
    
    try {
      setDeletingRuleId(ruleId);
      await apiService.deleteRule(id, ruleId);
      
      // Refresh criteria set data
      const data = await apiService.getCriteriaSet(id);
      setCriteriaSet(data);
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule');
    } finally {
      setDeletingRuleId(null);
    }
  };

  /**
   * Starts editing criteria set details
   */
  const handleStartEditDetails = () => {
    if (criteriaSet) {
      setEditName(criteriaSet.name);
      setEditVersion(criteriaSet.version);
      // Format date for input
      const date = new Date(criteriaSet.effectiveDate);
      setEditEffectiveDate(date.toISOString().split('T')[0]);
      setIsEditingDetails(true);
    }
  };

  /**
   * Cancels editing criteria set details
   */
  const handleCancelEditDetails = () => {
    setIsEditingDetails(false);
    setEditName('');
    setEditVersion('');
    setEditEffectiveDate('');
  };

  /**
   * Saves criteria set details
   */
  const handleSaveDetails = async () => {
    if (!id) return;
    
    try {
      setSavingDetails(true);
      await apiService.updateCriteriaSet(id, {
        name: editName,
        version: editVersion,
        effectiveDate: new Date(editEffectiveDate).toISOString()
      });
      
      // Refresh criteria set data
      const data = await apiService.getCriteriaSet(id);
      setCriteriaSet(data);
      
      setIsEditingDetails(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update criteria set');
    } finally {
      setSavingDetails(false);
    }
  };

  /**
   * Formats the expression for display
   */
  const formatExpression = (expression: any): string => {
    if (expression.type === 'comparison') {
      return formatRuleExpression(expression);
    } else if (expression.type === 'AND' || expression.type === 'OR' || expression.type === 'NOT') {
      const conditions = expression.conditions.map((c: any) => {
        if (c.type === 'comparison') {
          return formatRuleExpression(c);
        }
        return JSON.stringify(c);
      }).join(` ${expression.type} `);
      return `(${conditions})`;
    }
    return JSON.stringify(expression);
  };

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
        <Link to="/criteria-sets" className="mt-2 text-sm text-red-600 hover:text-red-800">
          ← Back to Criteria Sets
        </Link>
      </div>
    );
  }

  if (!criteriaSet) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-yellow-700">Criteria set not found</p>
        <Link to="/criteria-sets" className="mt-2 text-sm text-yellow-600 hover:text-yellow-800">
          ← Back to Criteria Sets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Link to="/criteria-sets" className="text-navy-600 hover:text-navy-800 text-sm">
            ← Criteria Sets
          </Link>
          
          {isEditingDetails ? (
            /* Edit mode for details */
            <div className="mt-2 space-y-3 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <input
                    type="text"
                    value={editVersion}
                    onChange={(e) => setEditVersion(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                  <input
                    type="date"
                    value={editEffectiveDate}
                    onChange={(e) => setEditEffectiveDate(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50"
                >
                  {savingDetails ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEditDetails}
                  disabled={savingDetails}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* View mode for details */
            <div className="mt-2">
              <h1 className="text-2xl font-semibold text-gray-900">
                {criteriaSet.name}
              </h1>
              <p className="text-gray-600">
                {criteriaSet.isGlobal ? 'Global' : `Client: ${criteriaSet.client?.name || 'N/A'}`} • 
                {criteriaSet.rules?.length || 0} rules • 
                Effective: {new Date(criteriaSet.effectiveDate).toLocaleDateString()} • 
                Version {criteriaSet.version}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {!isEditingDetails && (
            <button
              onClick={handleStartEditDetails}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Details
            </button>
          )}
          <button
            onClick={() => navigate('/criteria-sets')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>

      {/* Rules Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Rules ({criteriaSet.rules?.length || 0})
            </h2>
            <button
              onClick={handleAddRuleClick}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rule
            </button>
          </div>

          {criteriaSet.rules && criteriaSet.rules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expression
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {criteriaSet.rules.map((rule: Rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {rule.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">
                        {formatExpression(rule.expression)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {rule.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rule.severity === 'exclude' ? 'bg-red-100 text-red-800' :
                          rule.severity === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleEditRuleClick(rule)}
                          className="text-navy-600 hover:text-navy-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          disabled={deletingRuleId === rule.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingRuleId === rule.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No rules defined yet.</p>
              <button
                onClick={handleAddRuleClick}
                className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700"
              >
                Add Your First Rule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Rule Modal */}
      <AddRuleModal
        isOpen={showRuleModal}
        onClose={() => {
          setShowRuleModal(false);
          setEditingRule(null);
        }}
        onAdd={handleAddRule}
        onEdit={handleEditRule}
        editingRule={editingRule}
      />
    </div>
  );
};

export default CriteriaSetDetailPage;
