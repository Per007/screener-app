import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../api/apiService';
import RuleBuilder from '../components/RuleBuilder';

/**
 * Interface for a rule expression from the RuleBuilder
 */
interface RuleExpression {
  type: 'comparison';
  parameter: string;
  operator: string;
  value: number | string | boolean;
}

/**
 * Interface for a rule in the list
 */
interface Rule {
  name: string;
  description: string;
  expression: RuleExpression | null;
  expressionPreview: string;
  failureMessage: string;
  severity: 'exclude' | 'warn' | 'info';
}

/**
 * AddCriteriaSetPage Component
 * 
 * Page for creating a new criteria set with rules.
 * Features a visual rule builder instead of text-based expression input.
 */
const AddCriteriaSetPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Form state for criteria set
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [clientId, setClientId] = useState('');
  
  // Rules state
  const [rules, setRules] = useState<Rule[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  
  // New rule form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [newRuleExpression, setNewRuleExpression] = useState<RuleExpression | null>(null);
  const [newRuleFailureMessage, setNewRuleFailureMessage] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'exclude' | 'warn' | 'info'>('exclude');
  const [ruleError, setRuleError] = useState<string | null>(null);

  /**
   * Handle expression change from RuleBuilder
   */
  const handleExpressionChange = (expression: RuleExpression | null) => {
    setNewRuleExpression(expression);
    setRuleError(null);
  };

  /**
   * Get expression preview string
   */
  const getExpressionPreview = (expression: RuleExpression | null): string => {
    if (!expression) return '';
    let valueStr: string;
    if (typeof expression.value === 'boolean') {
      valueStr = expression.value.toString();
    } else if (typeof expression.value === 'string') {
      valueStr = `'${expression.value}'`;
    } else {
      valueStr = expression.value.toString();
    }
    return `${expression.parameter} ${expression.operator} ${valueStr}`;
  };

  /**
   * Validates and adds a new rule to the list
   */
  const handleAddRule = () => {
    setRuleError(null);
    
    // Validate rule name
    if (!newRuleName.trim()) {
      setRuleError('Rule name is required');
      return;
    }
    
    // Validate expression
    if (!newRuleExpression) {
      setRuleError('Please build a valid rule expression using the visual builder');
      return;
    }
    
    // Add rule to list
    setRules([...rules, {
      name: newRuleName.trim(),
      description: newRuleDescription.trim(),
      expression: newRuleExpression,
      expressionPreview: getExpressionPreview(newRuleExpression),
      failureMessage: newRuleFailureMessage.trim(),
      severity: newRuleSeverity
    }]);
    
    // Reset form
    resetNewRuleForm();
    setShowAddRule(false);
  };

  /**
   * Reset the new rule form
   */
  const resetNewRuleForm = () => {
    setNewRuleName('');
    setNewRuleDescription('');
    setNewRuleExpression(null);
    setNewRuleFailureMessage('');
    setNewRuleSeverity('exclude');
    setRuleError(null);
  };

  /**
   * Removes a rule from the list
   */
  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  /**
   * Submits the form to create the criteria set
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Validate required fields
      if (!name.trim()) {
        throw new Error('Criteria set name is required');
      }
      if (!version.trim()) {
        throw new Error('Version is required');
      }
      if (!effectiveDate) {
        throw new Error('Effective date is required');
      }
      
      // Convert rules to API format
      const rulesData = rules.map(rule => {
        if (!rule.expression) {
          throw new Error(`Invalid expression for rule "${rule.name}"`);
        }
        
        return {
          name: rule.name,
          description: rule.description || undefined,
          expression: rule.expression,
          failureMessage: rule.failureMessage || undefined,
          severity: rule.severity
        };
      });
      
      // Create criteria set
      const result = await apiService.createCriteriaSet({
        name: name.trim(),
        version: version.trim(),
        effectiveDate: new Date(effectiveDate).toISOString(),
        clientId: clientId || undefined,
        rules: rulesData.length > 0 ? rulesData : undefined
      });
      
      // Navigate to the new criteria set detail page
      navigate(`/criteria-sets/${result.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create criteria set');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Create New Criteria Set</h1>
        <button
          onClick={() => navigate('/criteria-sets')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Criteria Set Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Criteria Set Information</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                placeholder="e.g., Standard ESG Screen"
              />
            </div>

            <div>
              <label htmlFor="version" className="block text-sm font-medium text-gray-700">
                Version *
              </label>
              <input
                type="text"
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                placeholder="e.g., 1.0"
              />
            </div>

            <div>
              <label htmlFor="effectiveDate" className="block text-sm font-medium text-gray-700">
                Effective Date *
              </label>
              <input
                type="date"
                id="effectiveDate"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                Client ID (Optional)
              </label>
              <input
                type="text"
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                placeholder="Leave empty for global criteria set"
              />
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to create a global criteria set available to all clients
              </p>
            </div>
          </div>
        </div>

        {/* Rules Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              Rules ({rules.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowAddRule(true)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700"
            >
              + Add Rule
            </button>
          </div>

          {/* Add Rule Form */}
          {showAddRule && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-md font-medium text-gray-900 mb-4">New Rule</h3>
              
              {ruleError && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3">
                  <p className="text-sm text-red-700">{ruleError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                    placeholder="e.g., Carbon Emissions Limit"
                  />
                </div>

                {/* Visual Rule Builder */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Condition *
                  </label>
                  <div className="bg-white p-4 border border-gray-200 rounded-md">
                    <RuleBuilder onExpressionChange={handleExpressionChange} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newRuleDescription}
                    onChange={(e) => setNewRuleDescription(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                    placeholder="Describe what this rule checks..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Failure Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRuleFailureMessage}
                    onChange={(e) => setNewRuleFailureMessage(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                    placeholder="e.g., Carbon emissions exceed the allowed threshold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Severity *
                  </label>
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as 'exclude' | 'warn' | 'info')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                  >
                    <option value="exclude">Exclude (Hard Fail)</option>
                    <option value="warn">Warn (Warning Only)</option>
                    <option value="info">Info (Information Only)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    "Exclude" rules will cause companies to fail screening. "Warn" and "Info" rules are informational only.
                  </p>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700"
                  >
                    Add Rule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRule(false);
                      resetNewRuleForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rules List */}
          {rules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rule Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Condition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rules.map((rule, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                        {rule.description && (
                          <div className="text-sm text-gray-500">{rule.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {rule.expressionPreview}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                No rules added yet. Click "Add Rule" to create your first screening rule.
              </p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/criteria-sets')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Criteria Set'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCriteriaSetPage;
