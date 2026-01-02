const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

// Delete existing database if it exists
if (fs.existsSync(dbPath)) {
  console.log('Deleting existing database...');
  fs.unlinkSync(dbPath);
}

console.log('Creating new database...');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('Creating tables...');

// Create tables based on Prisma schema
db.exec(`
  CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT DEFAULT 'analyst' NOT NULL,
    "clientId" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  );

  CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "Portfolio" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "sector" TEXT
  );

  CREATE TABLE IF NOT EXISTS "Parameter" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT UNIQUE NOT NULL,
    "dataType" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "isGlobal" INTEGER DEFAULT 1 NOT NULL,
    "clientId" TEXT,
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "CompanyParameterValue" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "companyId" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "asOfDate" DATETIME NOT NULL,
    "source" TEXT,
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
    FOREIGN KEY ("parameterId") REFERENCES "Parameter"("id") ON DELETE CASCADE,
    UNIQUE("companyId", "parameterId", "asOfDate")
  );

  CREATE TABLE IF NOT EXISTS "PortfolioHolding" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE,
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE,
    UNIQUE("portfolioId", "companyId")
  );

  CREATE TABLE IF NOT EXISTS "CriteriaSet" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isGlobal" INTEGER DEFAULT 1 NOT NULL,
    "clientId" TEXT,
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "Rule" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "criteriaSetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expression" TEXT NOT NULL,
    "failureMessage" TEXT,
    "severity" TEXT DEFAULT 'exclude' NOT NULL,
    FOREIGN KEY ("criteriaSetId") REFERENCES "CriteriaSet"("id") ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "ScreeningResult" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "criteriaSetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screenedAt" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "asOfDate" DATETIME NOT NULL,
    "summary" TEXT NOT NULL,
    FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE,
    FOREIGN KEY ("criteriaSetId") REFERENCES "CriteriaSet"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "User"("id")
  );

  CREATE TABLE IF NOT EXISTS "ScreeningCompanyResult" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "screeningResultId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "passed" INTEGER NOT NULL,
    "ruleResults" TEXT NOT NULL,
    FOREIGN KEY ("screeningResultId") REFERENCES "ScreeningResult"("id") ON DELETE CASCADE,
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "ClientParameter" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "clientId" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "thresholdType" TEXT,
    "thresholdValue" TEXT,
    "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE,
    FOREIGN KEY ("parameterId") REFERENCES "Parameter"("id") ON DELETE CASCADE,
    UNIQUE("clientId", "parameterId")
  );
`);

console.log('Tables created successfully!');
console.log('Seeding database with mock data...');

// Helper to generate ISO datetime string
const now = new Date().toISOString();
const asOfDate = new Date('2024-01-01').toISOString();
const effectiveDate = new Date('2024-01-01').toISOString();

// Insert Users
const adminId = randomUUID();
const analystId = randomUUID();
const adminPassword = bcrypt.hashSync('admin123', 10);
const analystPassword = bcrypt.hashSync('analyst123', 10);

db.prepare('INSERT INTO "User" (id, email, passwordHash, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
  adminId, 'admin@example.com', adminPassword, 'Admin User', 'admin', now
);
db.prepare('INSERT INTO "User" (id, email, passwordHash, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
  analystId, 'analyst@example.com', analystPassword, 'Analyst User', 'analyst', now
);
console.log('Created users: admin@example.com, analyst@example.com');

// Insert Client
const clientId = randomUUID();
db.prepare('INSERT INTO "Client" (id, name, createdAt) VALUES (?, ?, ?)').run(
  clientId, 'Demo Investment Fund', now
);
console.log('Created client: Demo Investment Fund');

// Insert Parameters
const parameters = [
  { id: randomUUID(), name: 'carbon_emissions', dataType: 'number', unit: 'tons CO2/year', description: 'Annual carbon emissions' },
  { id: randomUUID(), name: 'board_diversity_pct', dataType: 'number', unit: '%', description: 'Percentage of board members from underrepresented groups' },
  { id: randomUUID(), name: 'has_environmental_policy', dataType: 'boolean', unit: null, description: 'Company has formal environmental policy' },
  { id: randomUUID(), name: 'controversy_level', dataType: 'string', unit: null, description: 'Level of ESG controversies (none, low, medium, high)' },
  { id: randomUUID(), name: 'renewable_energy_pct', dataType: 'number', unit: '%', description: 'Percentage of energy from renewable sources' }
];

const insertParam = db.prepare('INSERT INTO "Parameter" (id, name, dataType, unit, description, isGlobal) VALUES (?, ?, ?, ?, ?, ?)');
parameters.forEach(p => {
  insertParam.run(p.id, p.name, p.dataType, p.unit, p.description, 1);
});
console.log('Created', parameters.length, 'parameters');

// Insert Companies
const companies = [
  { id: randomUUID(), name: 'GreenTech Corp', ticker: 'GTC', sector: 'Technology' },
  { id: randomUUID(), name: 'OilCo Industries', ticker: 'OCI', sector: 'Energy' },
  { id: randomUUID(), name: 'CleanEnergy Inc', ticker: 'CEI', sector: 'Utilities' },
  { id: randomUUID(), name: 'FastFashion Ltd', ticker: 'FFL', sector: 'Consumer' },
  { id: randomUUID(), name: 'SustainableGoods Co', ticker: 'SGC', sector: 'Consumer' }
];

const insertCompany = db.prepare('INSERT INTO "Company" (id, name, ticker, sector) VALUES (?, ?, ?, ?)');
companies.forEach(c => {
  insertCompany.run(c.id, c.name, c.ticker, c.sector);
});
console.log('Created', companies.length, 'companies');

// Insert Company Parameter Values
const companyValues = [
  // GreenTech Corp - Good ESG
  { companyId: companies[0].id, parameterId: parameters[0].id, value: '50' },
  { companyId: companies[0].id, parameterId: parameters[1].id, value: '40' },
  { companyId: companies[0].id, parameterId: parameters[2].id, value: 'true' },
  { companyId: companies[0].id, parameterId: parameters[3].id, value: '"none"' },
  { companyId: companies[0].id, parameterId: parameters[4].id, value: '80' },

  // OilCo Industries - Poor ESG
  { companyId: companies[1].id, parameterId: parameters[0].id, value: '5000' },
  { companyId: companies[1].id, parameterId: parameters[1].id, value: '15' },
  { companyId: companies[1].id, parameterId: parameters[2].id, value: 'false' },
  { companyId: companies[1].id, parameterId: parameters[3].id, value: '"high"' },
  { companyId: companies[1].id, parameterId: parameters[4].id, value: '5' },

  // CleanEnergy Inc - Good ESG
  { companyId: companies[2].id, parameterId: parameters[0].id, value: '20' },
  { companyId: companies[2].id, parameterId: parameters[1].id, value: '50' },
  { companyId: companies[2].id, parameterId: parameters[2].id, value: 'true' },
  { companyId: companies[2].id, parameterId: parameters[3].id, value: '"none"' },
  { companyId: companies[2].id, parameterId: parameters[4].id, value: '95' },

  // FastFashion Ltd - Mixed ESG
  { companyId: companies[3].id, parameterId: parameters[0].id, value: '200' },
  { companyId: companies[3].id, parameterId: parameters[1].id, value: '25' },
  { companyId: companies[3].id, parameterId: parameters[2].id, value: 'true' },
  { companyId: companies[3].id, parameterId: parameters[3].id, value: '"medium"' },
  { companyId: companies[3].id, parameterId: parameters[4].id, value: '30' },

  // SustainableGoods Co - Good ESG
  { companyId: companies[4].id, parameterId: parameters[0].id, value: '30' },
  { companyId: companies[4].id, parameterId: parameters[1].id, value: '45' },
  { companyId: companies[4].id, parameterId: parameters[2].id, value: 'true' },
  { companyId: companies[4].id, parameterId: parameters[3].id, value: '"low"' },
  { companyId: companies[4].id, parameterId: parameters[4].id, value: '70' }
];

const insertValue = db.prepare('INSERT INTO "CompanyParameterValue" (id, companyId, parameterId, value, asOfDate) VALUES (?, ?, ?, ?, ?)');
companyValues.forEach(v => {
  insertValue.run(randomUUID(), v.companyId, v.parameterId, v.value, asOfDate);
});
console.log('Added parameter values for all companies');

// Insert Portfolio
const portfolioId = randomUUID();
db.prepare('INSERT INTO "Portfolio" (id, clientId, name, createdAt) VALUES (?, ?, ?, ?)').run(
  portfolioId, clientId, 'Main Portfolio', now
);
console.log('Created portfolio: Main Portfolio');

// Insert Portfolio Holdings
const insertHolding = db.prepare('INSERT INTO "PortfolioHolding" (id, portfolioId, companyId, weight) VALUES (?, ?, ?, ?)');
companies.forEach(c => {
  insertHolding.run(randomUUID(), portfolioId, c.id, 20.0); // Equal weight for simplicity
});
console.log('Added', companies.length, 'holdings to portfolio');

// Insert Criteria Set
const criteriaSetId = randomUUID();
db.prepare('INSERT INTO "CriteriaSet" (id, name, version, effectiveDate, createdAt, isGlobal) VALUES (?, ?, ?, ?, ?, ?)').run(
  criteriaSetId, 'Standard ESG Screen', '1.0', effectiveDate, now, 1
);
console.log('Created criteria set: Standard ESG Screen');

// Insert Rules
const rules = [
  {
    name: 'Carbon Emissions Limit',
    description: 'Companies must have carbon emissions below 500 tons/year',
    expression: JSON.stringify({ type: 'comparison', parameter: 'carbon_emissions', operator: '<', value: 500 }),
    failureMessage: 'Carbon emissions exceed acceptable limit',
    severity: 'exclude'
  },
  {
    name: 'Board Diversity Minimum',
    description: 'Companies must have at least 30% board diversity',
    expression: JSON.stringify({ type: 'comparison', parameter: 'board_diversity_pct', operator: '>=', value: 30 }),
    failureMessage: 'Board diversity below minimum threshold',
    severity: 'exclude'
  },
  {
    name: 'Environmental Policy Required',
    description: 'Companies must have an environmental policy',
    expression: JSON.stringify({ type: 'comparison', parameter: 'has_environmental_policy', operator: '==', value: true }),
    failureMessage: 'No environmental policy in place',
    severity: 'warn'
  },
  {
    name: 'No High Controversies',
    description: 'Companies must not have high-level controversies',
    expression: JSON.stringify({ type: 'comparison', parameter: 'controversy_level', operator: '!=', value: 'high' }),
    failureMessage: 'Company has high-level ESG controversies',
    severity: 'exclude'
  }
];

const insertRule = db.prepare('INSERT INTO "Rule" (id, criteriaSetId, name, description, expression, failureMessage, severity) VALUES (?, ?, ?, ?, ?, ?, ?)');
rules.forEach(r => {
  insertRule.run(randomUUID(), criteriaSetId, r.name, r.description, r.expression, r.failureMessage, r.severity);
});
console.log('Created', rules.length, 'rules');

db.close();

console.log('\n✅ Database reset and seeded successfully!');
console.log('\nTest credentials:');
console.log('Admin: admin@example.com / admin123');
console.log('Analyst: analyst@example.com / analyst123');
console.log('\nDatabase file created at:', dbPath);
