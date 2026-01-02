/**
 * Script to add parameter values for companies
 * Usage: npx ts-node scripts/add-parameter-values.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding parameter values for companies...\n');

  // Get all parameters
  const parameters = await prisma.parameter.findMany();
  const paramMap = new Map();
  parameters.forEach(p => paramMap.set(p.name, p));

  console.log('Available parameters:');
  paramMap.forEach((p, name) => {
    console.log(`  - ${name} (${p.id})`);
  });
  console.log('');

  // Get companies
  const companies = await prisma.company.findMany();
  console.log(`Found ${companies.length} companies\n`);

  // Sample data for companies
  const companyData: Record<string, Record<string, number | boolean | string>> = {
    'Microsoft Corp': {
      carbon_emissions: 5000,
      board_diversity_pct: 15,
      has_environmental_policy: false,
      controversy_level: 'high',
      renewable_energy_pct: 5
    },
    'Microsoft': {
      carbon_emissions: 5000,
      board_diversity_pct: 15,
      has_environmental_policy: false,
      controversy_level: 'high',
      renewable_energy_pct: 5
    },
    'ExxonMobil': {
      carbon_emissions: 12000,
      board_diversity_pct: 20,
      has_environmental_policy: true,
      controversy_level: 'high',
      renewable_energy_pct: 2
    },
    'Johnson & Johnson': {
      carbon_emissions: 3000,
      board_diversity_pct: 35,
      has_environmental_policy: true,
      controversy_level: 'medium',
      renewable_energy_pct: 15
    },
    'Alphabet Inc': {
      carbon_emissions: 2000,
      board_diversity_pct: 25,
      has_environmental_policy: true,
      controversy_level: 'low',
      renewable_energy_pct: 50
    },
    'JPMorgan Chase': {
      carbon_emissions: 1500,
      board_diversity_pct: 30,
      has_environmental_policy: true,
      controversy_level: 'medium',
      renewable_energy_pct: 10
    },
    'Bank of America': {
      carbon_emissions: 1800,
      board_diversity_pct: 28,
      has_environmental_policy: true,
      controversy_level: 'low',
      renewable_energy_pct: 12
    }
  };

  const asOfDate = new Date('2024-01-01');
  let added = 0;
  let skipped = 0;

  for (const company of companies) {
    const data = companyData[company.name];
    if (!data) {
      console.log(`⚠️  No data defined for: ${company.name}`);
      continue;
    }

    console.log(`Processing: ${company.name}...`);

    for (const [paramName, value] of Object.entries(data)) {
      const parameter = paramMap.get(paramName);
      if (!parameter) {
        console.log(`  ⚠️  Parameter not found: ${paramName}`);
        continue;
      }

      // Check if value already exists
      const existing = await prisma.companyParameterValue.findFirst({
        where: {
          companyId: company.id,
          parameterId: parameter.id,
          asOfDate
        }
      });

      if (existing) {
        console.log(`  ⏭️  ${paramName}: ${value} (already exists)`);
        skipped++;
        continue;
      }

      // Create parameter value
      await prisma.companyParameterValue.create({
        data: {
          companyId: company.id,
          parameterId: parameter.id,
          value: JSON.stringify(value),
          asOfDate,
          source: 'manual'
        }
      });

      console.log(`  ✓ ${paramName}: ${value}`);
      added++;
    }
    console.log('');
  }

  console.log(`\n✅ Complete! Added ${added} values, skipped ${skipped} existing values.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
