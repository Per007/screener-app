import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting database...');

  // Delete in correct order to respect foreign key constraints
  console.log('Deleting screening company results...');
  await prisma.screeningCompanyResult.deleteMany();

  console.log('Deleting screening results...');
  await prisma.screeningResult.deleteMany();

  console.log('Deleting rules...');
  await prisma.rule.deleteMany();

  console.log('Deleting criteria sets...');
  await prisma.criteriaSet.deleteMany();

  console.log('Deleting portfolio holdings...');
  await prisma.portfolioHolding.deleteMany();

  console.log('Deleting company parameter values...');
  await prisma.companyParameterValue.deleteMany();

  console.log('Deleting client parameters...');
  await prisma.clientParameter.deleteMany();

  console.log('Deleting portfolios...');
  await prisma.portfolio.deleteMany();

  console.log('Deleting companies...');
  await prisma.company.deleteMany();

  console.log('Deleting parameters...');
  await prisma.parameter.deleteMany();

  console.log('Deleting users...');
  await prisma.user.deleteMany();

  console.log('Deleting clients...');
  await prisma.client.deleteMany();

  console.log('\n✅ Database reset completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
