import React, { useState, useEffect } from 'react';
import { apiService } from '../api/apiService';

/**
 * Supported comparison operators for rule building
 */
type ComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>=';

/**
 * Interface for a parameter from the API
 */
interface Parameter {
  id: string;
  name: string;
  dataType: 'number' | 'boolean' | 'string';
  unit?: string;
  description?: string;
}

/**
 * Interface for a single rule condition
 */
interface RuleCondition {
  parameter: string;
  operator: ComparisonOperator;
  value: number | string | boolean;
}

/**
 * Props for the RuleBuilder component
 */
interface RuleBuilderProps {
  /** Callback when a valid rule expression is built */
  onExpressionChange: (expression: { type: 'comparison'; parameter: string; operator: ComparisonOperator; value: number | string | boolean } | null) => void;
  /** Optional initial condition to populate the builder */
  initialCondition?: RuleCondition;
  /** Optional class name for styling */
  className?: string;
}

/**
 * Operator options with display labels
 */
const OPERATORS: { value: ComparisonOperator; label: string; description: string }[] = [
  { value: '>', label: '>', description: 'Greater than' },
  { value: '>=', label: '>=', description: 'Greater than or equal' },
  { value: '<', label: '<', description: 'Less than' },
  { value: '<=', label: '<=', description: 'Less than or equal' },
  { value: '==', label: '==', description: 'Equal to' },
  { value: '!=', label: '!=', description: 'Not equal to' },
];

/**
 * RuleBuilder Component
 * 
 * A visual interface for building ESG screening rules.
 * Allows users to select a parameter, operator, and value to create
 * rule conditions without typing expressions manually.
 */
const RuleBuilder: React.FC<RuleBuilderProps> = ({
  onExpressionChange,
  initialCondition,
  className = '',
}) => {
  // State for available parameters from API
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loadingParameters, setLoadingParameters] = useState(true);
  const [parameterError, setParameterError] = useState<string | null>(null);

  // State for the current rule being built
  const [selectedParameter, setSelectedParameter] = useState<string>(initialCondition?.parameter || '');
  const [selectedOperator, setSelectedOperator] = useState<ComparisonOperator>(initialCondition?.operator || '>');
  const [value, setValue] = useState<string>(initialCondition?.value?.toString() || '');
  const [valueType, setValueType] = useState<'number' | 'boolean' | 'string'>('number');

  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Fetch available parameters from the API on component mount
   */
  useEffect(() => {
    const fetchParameters = async () => {
      try {
        setLoadingParameters(true);
        const data = await apiService.getParameters();
        setParameters(data);
        setParameterError(null);
      } catch (err) {
        setParameterError('Failed to load parameters');
        console.error('Error fetching parameters:', err);
      } finally {
        setLoadingParameters(false);
      }
    };

    fetchParameters();
  }, []);

  /**
   * Update value type when parameter selection changes
   */
  useEffect(() => {
    if (selectedParameter) {
      const param = parameters.find(p => p.name === selectedParameter);
      if (param) {
        setValueType(param.dataType);
        // Reset value when parameter changes
        if (param.dataType === 'boolean') {
          setValue('true');
        } else {
          setValue('');
        }
      }
    }
  }, [selectedParameter, parameters]);

  /**
   * Build and validate the expression whenever inputs change
   */
  useEffect(() => {
    // Validate and build expression
    if (!selectedParameter) {
      setValidationError(null);
      onExpressionChange(null);
      return;
    }

    if (!value && valueType !== 'boolean') {
      setValidationError('Please enter a value');
      onExpressionChange(null);
      return;
    }

    // Parse the value based on type
    let parsedValue: number | string | boolean;
    
    if (valueType === 'boolean') {
      parsedValue = value.toLowerCase() === 'true';
    } else if (valueType === 'number') {
      // Remove % suffix if present
      const numStr = value.endsWith('%') ? value.slice(0, -1) : value;
      parsedValue = parseFloat(numStr);
      
      if (isNaN(parsedValue)) {
        setValidationError('Please enter a valid number');
        onExpressionChange(null);
        return;
      }
    } else {
      parsedValue = value;
    }

    // Clear validation error and emit the expression
    setValidationError(null);
    onExpressionChange({
      type: 'comparison',
      parameter: selectedParameter,
      operator: selectedOperator,
      value: parsedValue,
    });
  }, [selectedParameter, selectedOperator, value, valueType, onExpressionChange]);

  /**
   * Get the selected parameter's details
   */
  const selectedParamDetails = parameters.find(p => p.name === selectedParameter);

  /**
   * Format the expression preview
   */
  const getExpressionPreview = (): string => {
    if (!selectedParameter || (!value && valueType !== 'boolean')) {
      return 'Select a parameter and enter a value...';
    }
    
    let displayValue = value;
    if (valueType === 'boolean') {
      displayValue = value.toLowerCase() === 'true' ? 'true' : 'false';
    }
    
    return `${selectedParameter} ${selectedOperator} ${displayValue}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Parameter Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ESG Parameter
        </label>
        {loadingParameters ? (
          <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
        ) : parameterError ? (
          <div className="text-red-600 text-sm">{parameterError}</div>
        ) : (
          <select
            value={selectedParameter}
            onChange={(e) => setSelectedParameter(e.target.value)}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
          >
            <option value="">Select a parameter...</option>
            {parameters.map((param) => (
              <option key={param.id} value={param.name}>
                {param.name} {param.unit ? `(${param.unit})` : ''} - {param.dataType}
              </option>
            ))}
          </select>
        )}
        {selectedParamDetails?.description && (
          <p className="mt-1 text-xs text-gray-500">{selectedParamDetails.description}</p>
        )}
      </div>

      {/* Operator and Value Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Operator Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operator
          </label>
          <select
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value as ComparisonOperator)}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
          >
            {OPERATORS.map((op) => (
              <option key={op.value} value={op.value} title={op.description}>
                {op.label} ({op.description})
              </option>
            ))}
          </select>
        </div>

        {/* Value Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value
            {valueType === 'number' && selectedParamDetails?.unit && (
              <span className="text-gray-500 font-normal"> ({selectedParamDetails.unit})</span>
            )}
          </label>
          
          {valueType === 'boolean' ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
            >
              <option value="true">true (Yes)</option>
              <option value="false">false (No)</option>
            </select>
          ) : (
            <input
              type={valueType === 'number' ? 'text' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={valueType === 'number' ? 'e.g., 100 or 50%' : 'Enter value...'}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-navy-500 focus:border-navy-500 sm:text-sm"
            />
          )}
        </div>
      </div>

      {/* Expression Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="text-xs text-gray-500 mb-1">Expression Preview:</div>
        <div className={`font-mono text-sm ${validationError ? 'text-red-600' : 'text-gray-900'}`}>
          {validationError || getExpressionPreview()}
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="text-red-600 text-sm flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationError}
        </div>
      )}
    </div>
  );
};

export default RuleBuilder;
