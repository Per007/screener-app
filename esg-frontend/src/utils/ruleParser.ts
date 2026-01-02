/**
 * Utility functions for parsing and formatting rule expressions
 */

// Type definitions for rule expressions
export type ComparisonOperator = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not_in' | 'contains';

export interface ComparisonCondition {
  type: 'comparison';
  parameter: string;
  operator: ComparisonOperator;
  value: number | string | boolean | (number | string)[];
}

/**
 * Parses a simple rule expression string like "WEAPONS_PRODUCTION > 10%"
 * into a ComparisonCondition object.
 * 
 * Supported formats:
 * - "PARAMETER > 10"
 * - "PARAMETER > 10%"
 * - "PARAMETER >= 5.5"
 * - "PARAMETER < 100"
 * - "PARAMETER <= 50"
 * - "PARAMETER == true"
 * - "PARAMETER != false"
 * - "PARAMETER == 'value'"
 * 
 * @param expressionString - The rule expression as a string (e.g., "WEAPONS_PRODUCTION > 10%")
 * @returns A ComparisonCondition object or null if parsing fails
 */
export function parseRuleExpression(expressionString: string): ComparisonCondition | null {
  // Remove extra whitespace
  const trimmed = expressionString.trim();
  
  // Match pattern: PARAMETER OPERATOR VALUE
  // Operators: >, >=, <, <=, ==, !=
  const pattern = /^([A-Z_][A-Z0-9_]*)\s*(>=|<=|==|!=|>|<)\s*(.+)$/i;
  const match = trimmed.match(pattern);
  
  if (!match) {
    return null;
  }
  
  const [, parameter, operator, valueStr] = match;
  
  // Convert operator string to ComparisonOperator type
  const validOperators: ComparisonOperator[] = ['==', '!=', '<', '<=', '>', '>='];
  if (!validOperators.includes(operator as ComparisonOperator)) {
    return null;
  }
  
  // Parse the value
  let value: number | string | boolean;
  const trimmedValue = valueStr.trim();
  
  // Check for percentage
  if (trimmedValue.endsWith('%')) {
    const numValue = parseFloat(trimmedValue.slice(0, -1));
    if (isNaN(numValue)) {
      return null;
    }
    // Store percentage as a number (10% becomes 10, not 0.10)
    // Adjust if you want it as decimal (0.10) instead
    value = numValue;
  }
  // Check for boolean
  else if (trimmedValue.toLowerCase() === 'true') {
    value = true;
  }
  else if (trimmedValue.toLowerCase() === 'false') {
    value = false;
  }
  // Check for string (quoted)
  else if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
           (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))) {
    value = trimmedValue.slice(1, -1);
  }
  // Try to parse as number
  else {
    const numValue = parseFloat(trimmedValue);
    if (!isNaN(numValue)) {
      value = numValue;
    } else {
      // Treat as string if not a number
      value = trimmedValue;
    }
  }
  
  return {
    type: 'comparison',
    parameter: parameter.toUpperCase(), // Normalize to uppercase
    operator: operator as ComparisonOperator,
    value: value
  };
}

/**
 * Formats a ComparisonCondition back into a readable string format
 * 
 * @param condition - The comparison condition to format
 * @returns A formatted string like "WEAPONS_PRODUCTION > 10"
 */
export function formatRuleExpression(condition: ComparisonCondition): string {
  let valueStr: string;
  
  if (typeof condition.value === 'boolean') {
    valueStr = condition.value.toString();
  } else if (typeof condition.value === 'string') {
    valueStr = `'${condition.value}'`;
  } else {
    valueStr = condition.value.toString();
  }
  
  return `${condition.parameter} ${condition.operator} ${valueStr}`;
}
