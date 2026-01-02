import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'admin'
    }
  });
  console.log('Created admin user:', admin.email);

  // Create analyst user
  const analystPassword = await bcrypt.hash('analyst123', 10);
  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@example.com' },
    update: {},
    create: {
      email: 'analyst@example.com',
      passwordHash: analystPassword,
      name: 'Analyst User',
      role: 'analyst'
    }
  });
  console.log('Created analyst user:', analyst.email);

  // Create client
  const client = await prisma.client.create({
    data: { name: 'Demo Investment Fund' }
  });
  console.log('Created client:', client.name);

  // Create ESG parameters
  const parameters = await Promise.all([
    prisma.parameter.upsert({
      where: { name: 'carbon_emissions' },
      update: {},
      create: {
        name: 'carbon_emissions',
        dataType: 'number',
        unit: 'tons CO2/year',
        description: 'Annual carbon emissions'
      }
    }),
    prisma.parameter.upsert({
      where: { name: 'board_diversity_pct' },
      update: {},
      create: {
        name: 'board_diversity_pct',
        dataType: 'number',
        unit: '%',
        description: 'Percentage of board members from underrepresented groups'
      }
    }),
    prisma.parameter.upsert({
      where: { name: 'has_environmental_policy' },
      update: {},
      create: {
        name: 'has_environmental_policy',
        dataType: 'boolean',
        description: 'Company has formal environmental policy'
      }
    }),
    prisma.parameter.upsert({
      where: { name: 'controversy_level' },
      update: {},
      create: {
        name: 'controversy_level',
        dataType: 'string',
        description: 'Level of ESG controversies (none, low, medium, high)'
      }
    }),
    prisma.parameter.upsert({
      where: { name: 'renewable_energy_pct' },
      update: {},
      create: {
        name: 'renewable_energy_pct',
        dataType: 'number',
        unit: '%',
        description: 'Percentage of energy from renewable sources'
      }
    })
  ]);
  console.log('Created', parameters.length, 'parameters');

  // Create companies
  const companies = [];
  const companyNames = ['GreenTech Corp', 'OilCo Industries', 'CleanEnergy Inc', 'FastFashion Ltd', 'SustainableGoods Co'];
  const companyData = [
    { name: 'GreenTech Corp', ticker: 'GTC', sector: 'Technology' },
    { name: 'OilCo Industries', ticker: 'OCI', sector: 'Energy' },
    { name: 'CleanEnergy Inc', ticker: 'CEI', sector: 'Utilities' },
    { name: 'FastFashion Ltd', ticker: 'FFL', sector: 'Consumer' },
    { name: 'SustainableGoods Co', ticker: 'SGC', sector: 'Consumer' }
  ];

  for (const data of companyData) {
    const existing = await prisma.company.findFirst({ where: { name: data.name } });
    if (existing) {
      companies.push(existing);
    } else {
      const created = await prisma.company.create({ data });
      companies.push(created);
    }
  }
  console.log('Created', companies.length, 'companies');

  // Add parameter values for companies
  const asOfDate = new Date('2024-01-01');

  // Check if parameter values already exist
  const existingValues = await prisma.companyParameterValue.findMany({
    where: { asOfDate }
  });

  if (existingValues.length === 0) {
    // GreenTech Corp - Good ESG
    await prisma.companyParameterValue.createMany({
      data: [
        { companyId: companies[0].id, parameterId: parameters[0].id, value: '50', asOfDate },
        { companyId: companies[0].id, parameterId: parameters[1].id, value: '40', asOfDate },
        { companyId: companies[0].id, parameterId: parameters[2].id, value: 'true', asOfDate },
        { companyId: companies[0].id, parameterId: parameters[3].id, value: '"none"', asOfDate },
        { companyId: companies[0].id, parameterId: parameters[4].id, value: '80', asOfDate }
      ]
    });

    // OilCo Industries - Poor ESG
    await prisma.companyParameterValue.createMany({
      data: [
        { companyId: companies[1].id, parameterId: parameters[0].id, value: '5000', asOfDate },
        { companyId: companies[1].id, parameterId: parameters[1].id, value: '15', asOfDate },
        { companyId: companies[1].id, parameterId: parameters[2].id, value: 'false', asOfDate },
        { companyId: companies[1].id, parameterId: parameters[3].id, value: '"high"', asOfDate },
        { companyId: companies[1].id, parameterId: parameters[4].id, value: '5', asOfDate }
      ]
    });

    // CleanEnergy Inc - Good ESG
    await prisma.companyParameterValue.createMany({
      data: [
        { companyId: companies[2].id, parameterId: parameters[0].id, value: '20', asOfDate },
        { companyId: companies[2].id, parameterId: parameters[1].id, value: '50', asOfDate },
        { companyId: companies[2].id, parameterId: parameters[2].id, value: 'true', asOfDate },
        { companyId: companies[2].id, parameterId: parameters[3].id, value: '"none"', asOfDate },
        { companyId: companies[2].id, parameterId: parameters[4].id, value: '95', asOfDate }
      ]
    });

    // FastFashion Ltd - Mixed ESG
    await prisma.companyParameterValue.createMany({
      data: [
        { companyId: companies[3].id, parameterId: parameters[0].id, value: '200', asOfDate },
        { companyId: companies[3].id, parameterId: parameters[1].id, value: '25', asOfDate },
        { companyId: companies[3].id, parameterId: parameters[2].id, value: 'true', asOfDate },
        { companyId: companies[3].id, parameterId: parameters[3].id, value: '"medium"', asOfDate },
        { companyId: companies[3].id, parameterId: parameters[4].id, value: '30', asOfDate }
      ]
    });

    // SustainableGoods Co - Good ESG
    await prisma.companyParameterValue.createMany({
      data: [
        { companyId: companies[4].id, parameterId: parameters[0].id, value: '30', asOfDate },
        { companyId: companies[4].id, parameterId: parameters[1].id, value: '45', asOfDate },
        { companyId: companies[4].id, parameterId: parameters[2].id, value: 'true', asOfDate },
        { companyId: companies[4].id, parameterId: parameters[3].id, value: '"low"', asOfDate },
        { companyId: companies[4].id, parameterId: parameters[4].id, value: '70', asOfDate }
      ]
    });
  } else {
    console.log('Parameter values already exist, skipping creation');
  }
  console.log('Added parameter values for all companies');

  // Create portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      clientId: client.id,
      name: 'Main Portfolio',
holdings: {
  create: [
    { companyId: companies[0].id, weight: 20.0 },
    { companyId: companies[1].id, weight: 20.0 },
    { companyId: companies[2].id, weight: 20.0 },
    { companyId: companies[3].id, weight: 20.0 },
    { companyId: companies[4].id, weight: 20.0 }
  ]
}
    }
  });
  console.log('Created portfolio:', portfolio.name);

  // Create criteria set with rules
  let criteriaSet = await prisma.criteriaSet.findFirst({ where: { name: 'Standard ESG Screen' } });
  if (!criteriaSet) {
    criteriaSet = await prisma.criteriaSet.create({
      data: {
        name: 'Standard ESG Screen',
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        rules: {
          create: [
            {
              name: 'Carbon Emissions Limit',
              description: 'Companies must have carbon emissions below 500 tons/year',
              expression: JSON.stringify({
                type: 'comparison',
                parameter: 'carbon_emissions',
                operator: '<',
                value: 500
              }),
              failureMessage: 'Carbon emissions exceed acceptable limit',
              severity: 'exclude'
            },
            {
              name: 'Board Diversity Minimum',
              description: 'Companies must have at least 30% board diversity',
              expression: JSON.stringify({
                type: 'comparison',
                parameter: 'board_diversity_pct',
                operator: '>=',
                value: 30
              }),
              failureMessage: 'Board diversity below minimum threshold',
              severity: 'exclude'
            },
            {
              name: 'Environmental Policy Required',
              description: 'Companies must have an environmental policy',
              expression: JSON.stringify({
                type: 'comparison',
                parameter: 'has_environmental_policy',
                operator: '==',
                value: true
              }),
              failureMessage: 'No environmental policy in place',
              severity: 'warn'
            },
            {
              name: 'No High Controversies',
              description: 'Companies must not have high-level controversies',
              expression: JSON.stringify({
                type: 'comparison',
                parameter: 'controversy_level',
                operator: '!=',
                value: 'high'
              }),
              failureMessage: 'Company has high-level ESG controversies',
              severity: 'exclude'
            }
          ]
        }
      }
    });
  }
  console.log('Created criteria set:', criteriaSet.name);

  console.log('\nSeed completed successfully!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@example.com / admin123');
  console.log('Analyst: analyst@example.com / analyst123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
