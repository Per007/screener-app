const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const db = new Database(dbPath);

console.log('Fixing Environmental Policy Required rule...\n');

// Get the rule
const rule = db.prepare('SELECT * FROM "Rule" WHERE name = ?').get('Environmental Policy Required');

if (!rule) {
  console.log('Rule not found!');
  db.close();
  process.exit(1);
}

console.log('Current rule expression:', rule.expression);

// Parse and fix the expression
const expr = JSON.parse(rule.expression);
console.log('Current parameter name:', expr.parameter);

// Fix the parameter name to lowercase
expr.parameter = 'has_environmental_policy';

console.log('New parameter name:', expr.parameter);

// Update the rule
const newExpression = JSON.stringify(expr);
db.prepare('UPDATE "Rule" SET expression = ? WHERE id = ?').run(newExpression, rule.id);

console.log('\n✅ Rule updated successfully!');
console.log('New expression:', newExpression);

db.close();
