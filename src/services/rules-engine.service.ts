import { RuleExpression, ComparisonCondition, LogicalCondition, ComparisonOperator } from '../models/types';

type ParameterValues = Map<string, number | boolean | string>;

export function evaluateExpression(expression: RuleExpression, paramValues: ParameterValues): boolean {
  if (expression.type === 'comparison') {
    return evaluateComparison(expression, paramValues);
  } else {
    return evaluateLogical(expression, paramValues);
  }
}

function evaluateComparison(condition: ComparisonCondition, paramValues: ParameterValues): boolean {
  const actualValue = paramValues.get(condition.parameter);

  // If parameter value is missing, the condition fails
  if (actualValue === undefined) {
    return false;
  }

  const expectedValue = condition.value;

  switch (condition.operator) {
    case '==':
      return actualValue === expectedValue;
    case '!=':
      return actualValue !== expectedValue;
    case '<':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue < expectedValue;
    case '<=':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue <= expectedValue;
    case '>':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue > expectedValue;
    case '>=':
      return typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue >= expectedValue;
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue as any);
    case 'not_in':
      return Array.isArray(expectedValue) && !expectedValue.includes(actualValue as any);
    case 'contains':
      return typeof actualValue === 'string' && typeof expectedValue === 'string' && actualValue.includes(expectedValue);
    default:
      return false;
  }
}

function evaluateLogical(condition: LogicalCondition, paramValues: ParameterValues): boolean {
  switch (condition.type) {
    case 'AND':
      return condition.conditions.every((c) => evaluateExpression(c, paramValues));
    case 'OR':
      return condition.conditions.some((c) => evaluateExpression(c, paramValues));
    case 'NOT':
      return condition.conditions.length > 0 && !evaluateExpression(condition.conditions[0], paramValues);
    default:
      return false;
  }
}

export function validateExpression(expression: any): { valid: boolean; error?: string } {
  try {
    if (!expression || typeof expression !== 'object') {
      return { valid: false, error: 'Expression must be an object' };
    }

    if (!expression.type) {
      return { valid: false, error: 'Expression must have a type' };
    }

    if (expression.type === 'comparison') {
      if (!expression.parameter || typeof expression.parameter !== 'string') {
        return { valid: false, error: 'Comparison must have a parameter name' };
      }
      if (!expression.operator || !isValidOperator(expression.operator)) {
        return { valid: false, error: 'Comparison must have a valid operator' };
      }
      if (expression.value === undefined) {
        return { valid: false, error: 'Comparison must have a value' };
      }
      return { valid: true };
    }

    if (['AND', 'OR', 'NOT'].includes(expression.type)) {
      if (!Array.isArray(expression.conditions)) {
        return { valid: false, error: 'Logical expression must have conditions array' };
      }
      for (const cond of expression.conditions) {
        const result = validateExpression(cond);
        if (!result.valid) {
          return result;
        }
      }
      return { valid: true };
    }

    return { valid: false, error: `Unknown expression type: ${expression.type}` };
  } catch (err) {
    return { valid: false, error: 'Invalid expression format' };
  }
}

function isValidOperator(op: string): op is ComparisonOperator {
  return ['==', '!=', '<', '<=', '>', '>=', 'in', 'not_in', 'contains'].includes(op);
}

export function getFailureReason(
  condition: ComparisonCondition,
  paramValues: ParameterValues,
  failureMessage?: string
): string {
  if (failureMessage) {
    return failureMessage;
  }

  const actualValue = paramValues.get(condition.parameter);
  if (actualValue === undefined) {
    return `Missing value for parameter: ${condition.parameter}`;
  }

  const opDescriptions: Record<ComparisonOperator, string> = {
    '==': 'equal to',
    '!=': 'not equal to',
    '<': 'less than',
    '<=': 'at most',
    '>': 'greater than',
    '>=': 'at least',
    'in': 'one of',
    'not_in': 'not one of',
    'contains': 'containing'
  };

  return `${condition.parameter} (${actualValue}) should be ${opDescriptions[condition.operator]} ${JSON.stringify(condition.value)}`;
}

/**
 * Extract the actual value from a rule expression for a given company's parameter values.
 * For comparison conditions, returns the parameter value.
 * For logical conditions, returns undefined (complex rules don't have a single value).
 */
export function getActualValue(
  expression: RuleExpression,
  paramValues: ParameterValues
): { actualValue?: string | number | boolean; threshold?: string } {
  if (expression.type === 'comparison') {
    const actualValue = paramValues.get(expression.parameter);
    const threshold = formatThreshold(expression.operator, expression.value);
    return {
      actualValue: actualValue !== undefined ? actualValue : undefined,
      threshold
    };
  }
  // For logical conditions, we don't return a single value
  return {};
}

/**
 * Format the threshold/expected value for display
 */
function formatThreshold(
  operator: ComparisonOperator,
  value: number | string | boolean | (number | string)[]
): string {
  const opSymbols: Record<ComparisonOperator, string> = {
    '==': '=',
    '!=': '≠',
    '<': '<',
    '<=': '≤',
    '>': '>',
    '>=': '≥',
    'in': 'in',
    'not_in': 'not in',
    'contains': 'contains'
  };
  
  const formattedValue = Array.isArray(value) ? `[${value.join(', ')}]` : String(value);
  return `${opSymbols[operator]} ${formattedValue}`;
}
