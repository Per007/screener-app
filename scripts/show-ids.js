const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const db = new Database(dbPath, { readonly: true });

console.log('Database IDs for API Testing');
console.log('=============================\n');

// Get User IDs
console.log('USERS:');
const users = db.prepare('SELECT id, email, name, role FROM "User"').all();
users.forEach(u => {
  console.log(`  ${u.email} (${u.role})`);
  console.log(`    ID: ${u.id}\n`);
});

// Get Client IDs
console.log('CLIENTS:');
const clients = db.prepare('SELECT id, name FROM "Client"').all();
clients.forEach(c => {
  console.log(`  ${c.name}`);
  console.log(`    ID: ${c.id}\n`);
});

// Get Company IDs
console.log('COMPANIES:');
const companies = db.prepare('SELECT id, name, ticker FROM "Company"').all();
companies.forEach(c => {
  console.log(`  ${c.name} (${c.ticker})`);
  console.log(`    ID: ${c.id}\n`);
});

// Get Portfolio IDs
console.log('PORTFOLIOS:');
const portfolios = db.prepare('SELECT id, name, clientId FROM "Portfolio"').all();
portfolios.forEach(p => {
  console.log(`  ${p.name}`);
  console.log(`    ID: ${p.id}`);
  console.log(`    Client ID: ${p.clientId}\n`);
});

// Get Criteria Set IDs
console.log('CRITERIA SETS:');
const criteriaSets = db.prepare('SELECT id, name, version FROM "CriteriaSet"').all();
criteriaSets.forEach(cs => {
  console.log(`  ${cs.name} (v${cs.version})`);
  console.log(`    ID: ${cs.id}\n`);
});

// Get Parameter IDs
console.log('PARAMETERS:');
const parameters = db.prepare('SELECT id, name FROM "Parameter"').all();
parameters.forEach(p => {
  console.log(`  ${p.name}`);
  console.log(`    ID: ${p.id}\n`);
});

db.close();

console.log('\n=============================');
console.log('Use these IDs in your API requests!');
