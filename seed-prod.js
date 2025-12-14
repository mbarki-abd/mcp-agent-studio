const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create test organization
  const org = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: { name: 'Test Organization', slug: 'test-org' }
  });

  // Create test user
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: hashedPassword,
      role: 'VIEWER',
      organizationId: org.id
    }
  });

  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Test Admin',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      organizationId: org.id
    }
  });

  console.log('Test users created');
  await prisma.$disconnect();
}
seed().catch(e => { console.error(e); process.exit(1); });
