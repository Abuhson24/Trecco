import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const cooperative = await prisma.cooperative.upsert({
    where: { id: 'seed-coop-1' },
    update: {},
    create: {
      id: 'seed-coop-1',
      name: 'Trecco Demo Cooperative',
      country: 'Nigeria',
      focusArea: 'Agribusiness',
      loanRatePolicy: 5.0,
      loanCapPercent: 30.0,
      committeeSize: 5,
    },
  });

  await prisma.cooperativeAccount.upsert({
    where: { cooperativeId: cooperative.id },
    update: {},
    create: {
      cooperativeId: cooperative.id,
      providusAccountNumber: 'SEED-COOP-0000000001',
      balance: 1_000_000,
    },
  });

  const adminPasswordHash = await bcrypt.hash('Admin12345', 10);
  const admin = await prisma.member.upsert({
    where: { email: 'admin@trecco.test' },
    update: {},
    create: {
      cooperativeId: cooperative.id,
      role: 'COOP_ADMIN',
      fullName: 'Demo Admin',
      email: 'admin@trecco.test',
      phone: '08000000001',
      passwordHash: adminPasswordHash,
    },
  });
  await prisma.personalAccount.upsert({
    where: { memberId: admin.id },
    update: {},
    create: {
      memberId: admin.id,
      providusAccountNumber: 'SEED-PA-0000000001',
      providusAccountRef: 'seed-ref-admin-1',
      balance: 50_000,
    },
  });

  const memberPasswordHash = await bcrypt.hash('Member1234', 10);
  const member = await prisma.member.upsert({
    where: { email: 'member@trecco.test' },
    update: {},
    create: {
      cooperativeId: cooperative.id,
      role: 'MEMBER',
      fullName: 'Demo Member',
      email: 'member@trecco.test',
      phone: '08000000002',
      passwordHash: memberPasswordHash,
    },
  });
  await prisma.personalAccount.upsert({
    where: { memberId: member.id },
    update: {},
    create: {
      memberId: member.id,
      providusAccountNumber: 'SEED-PA-0000000002',
      providusAccountRef: 'seed-ref-member-1',
      balance: 10_000,
    },
  });

  console.log('Seeded:');
  console.log(`  Cooperative:  ${cooperative.id} (${cooperative.name})`);
  console.log('  Admin login:  admin@trecco.test / Admin12345');
  console.log('  Member login: member@trecco.test / Member1234');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
