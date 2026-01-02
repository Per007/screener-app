const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const db = new Database(dbPath, { readonly: true });

console.log('Database Verification Report');
console.log('============================\n');

// Count records in each table
const tables = [
  'User', 'Client', 'Company', 'Parameter', 'Portfolio',
  'PortfolioHolding', 'CompanyParameterValue', 'CriteriaSet', 'Rule'
];

console.log('Record Counts:');
tables.forEach(table => {
  const count = db.prepare(`SELECT COUNT(*) as count FROM "${table}"`).get();
  console.log(`  ${table}: ${count.count}`);
});

console.log('\nSample Data:');

// Show users
console.log('\nUsers:');
const users = db.prepare('SELECT email, name, role FROM "User"').all();
users.forEach(u => console.log(`  - ${u.email} (${u.name}, ${u.role})`));

// Show companies
console.log('\nCompanies:');
const companies = db.prepare('SELECT name, ticker, sector FROM "Company"').all();
companies.forEach(c => console.log(`  - ${c.name} (${c.ticker}) - ${c.sector}`));

// Show parameters
console.log('\nParameters:');
const parameters = db.prepare('SELECT name, dataType, unit FROM "Parameter"').all();
parameters.forEach(p => console.log(`  - ${p.name} (${p.dataType}${p.unit ? ', ' + p.unit : ''})`));

// Show portfolios
console.log('\nPortfolios:');
const portfolios = db.prepare('SELECT name FROM "Portfolio"').all();
portfolios.forEach(p => console.log(`  - ${p.name}`));

// Show criteria sets
console.log('\nCriteria Sets:');
const criteriaSets = db.prepare('SELECT name, version FROM "CriteriaSet"').all();
criteriaSets.forEach(c => console.log(`  - ${c.name} (v${c.version})`));

// Show rules
console.log('\nRules:');
const rules = db.prepare('SELECT name, severity FROM "Rule"').all();
rules.forEach(r => console.log(`  - ${r.name} (${r.severity})`));

db.close();

console.log('\n✅ Database verification complete!');
