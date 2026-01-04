import React, { useState, useEffect } from 'react';
import { parseRuleExpression, formatRuleExpression } from '../utils/ruleParser';

/**
 * Rule data structure for add/edit operations
 */
interface RuleData {
  name: string;
  description?: string;
  expression: any;
  failureMessage?: string;
  severity: 'exclude' | 'warn' | 'info';
}

/**
 * Existing rule structure (for edit mode)
 */
interface ExistingRule extends RuleData {
  id: string;
}

interface AddRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (rule: RuleData) => void;
  onEdit?: (ruleId: string, rule: Partial<RuleData>) => void;
  editingRule?: ExistingRule | null;  // If provided, modal is in edit mode
}

/**
 * Safely formats an expression to a string for display in the form
 */
const safeFormatExpression = (expression: any): string => {
  if (!expression) {
    return '';
  }
  
  try {
    // Only format simple comparison expressions
    if (expression.type === 'comparison' && expression.parameter && expression.operator) {
      return formatRuleExpression(expression);
    }
    // For complex expressions (AND, OR, NOT), return JSON
    return JSON.stringify(expression);
  } catch (err) {
    console.error('Error formatting expression:', err);
    return JSON.stringify(expression);
  }
};

/**
 * Modal component for adding or editing a rule in a criteria set
 * - Add mode: when editingRule is not provided
 * - Edit mode: when editingRule is provided
 */
const AddRuleModal: React.FC<AddRuleModalProps> = ({ 
  isOpen, 
  onClose, 
  onAdd, 
  onEdit,
  editingRule 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expressionString, setExpressionString] = useState('');
  const [failureMessage, setFailureMessage] = useState('');
  const [severity, setSeverity] = useState<'exclude' | 'warn' | 'info'>('exclude');
  const [error, setError] = useState<string | null>(null);
  const [, setInitialized] = useState(false);

  // Determine if we're in edit mode
  const isEditMode = !!editingRule;

  /**
   * Initialize/reset form when modal opens or editingRule changes
   */
  useEffect(() => {
    if (isOpen) {
      if (editingRule) {
        // Edit mode - populate with rule data
        setName(editingRule.name || '');
        setDescription(editingRule.description || '');
        setExpressionString(safeFormatExpression(editingRule.expression));
        setFailureMessage(editingRule.failureMessage || '');
        setSeverity(editingRule.severity || 'exclude');
      } else {
        // Add mode - reset form
        setName('');
        setDescription('');
        setExpressionString('');
        setFailureMessage('');
        setSeverity('exclude');
      }
      setError(null);
      setInitialized(true);
    } else {
      // When modal closes, reset initialized flag
      setInitialized(false);
    }
  }, [isOpen, editingRule]);

  /**
   * Resets all form fields
   */
  const resetForm = () => {
    setName('');
    setDescription('');
    setExpressionString('');
    setFailureMessage('');
    setSeverity('exclude');
    setError(null);
  };

  /**
   * Handles form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!name.trim()) {
      setError('Rule name is required');
      return;
    }

    if (!expressionString.trim()) {
      setError('Rule expression is required');
      return;
    }

    // Parse expression
    const expression = parseRuleExpression(expressionString.trim());
    if (!expression) {
      setError('Invalid expression format. Use format: PARAMETER OPERATOR VALUE (e.g., carbon_emissions >= 500)');
      return;
    }

    const ruleData: RuleData = {
      name: name.trim(),
      description: description.trim() || undefined,
      expression: expression,
      failureMessage: failureMessage.trim() || undefined,
      severity: severity
    };

    if (isEditMode && onEdit && editingRule) {
      // Edit mode - call onEdit with rule ID and updated data
      onEdit(editingRule.id, ruleData);
    } else if (onAdd) {
      // Add mode - call onAdd with new rule data
      onAdd(ruleData);
    }

    // Reset form and close
    resetForm();
  };

  /**
   * Handles modal close
   */
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Don't render until initialized or if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40"
          onClick={handleClose}
        ></div>

        {/* Modal panel - needs higher z-index than overlay */}
        <div className="relative z-50 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditMode ? 'Edit Rule' : 'Add New Rule'}
                </h3>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm text-gray-900"
                    placeholder="e.g., Carbon Emissions Limit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expression *
                  </label>
                  <input
                    type="text"
                    value={expressionString}
                    onChange={(e) => setExpressionString(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm font-mono text-gray-900"
                    placeholder="e.g., carbon_emissions >= 500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Expression should describe the <strong>violation condition</strong> (what triggers the severity).
                    <br />
                    Examples: carbon_emissions &gt;= 500 (exclude if high), board_diversity_pct &lt; 30 (exclude if low)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                    value={failureMessage}
                    onChange={(e) => setFailureMessage(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                    placeholder="e.g., Carbon emissions exceed acceptable limit"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Severity *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as 'exclude' | 'warn' | 'info')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
                  >
                    <option value="exclude">Exclude (Hard Fail - company will be excluded)</option>
                    <option value="warn">Warn (Warning Only - flag but don't exclude)</option>
                    <option value="info">Info (Information Only - no action)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-navy-600 text-base font-medium text-white hover:bg-navy-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {isEditMode ? 'Save Changes' : 'Add Rule'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddRuleModal;
