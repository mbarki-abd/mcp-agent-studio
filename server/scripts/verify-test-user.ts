/**
 * Script to verify test user exists and password is correct
 * Usage: tsx scripts/verify-test-user.ts
 */

import { PrismaClient } from '@prisma/client';
import { verifyPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying test user...\n');

  // Check if test user exists
  const testUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
    include: {
      organization: true,
    },
  });

  if (!testUser) {
    console.error('❌ Test user not found!');
    console.log('\nRun: pnpm db:seed');
    process.exit(1);
  }

  console.log('✅ Test user found:');
  console.log(`   Email: ${testUser.email}`);
  console.log(`   Name: ${testUser.name}`);
  console.log(`   Role: ${testUser.role}`);
  console.log(`   Organization: ${testUser.organization.name}`);
  console.log(`   Email Verified: ${testUser.emailVerified}`);

  // Verify password
  const passwordCorrect = await verifyPassword('password123', testUser.passwordHash);

  if (!passwordCorrect) {
    console.error('\n❌ Password verification failed!');
    process.exit(1);
  }

  console.log('\n✅ Password verified successfully!');

  // Check admin user
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (!adminUser) {
    console.error('\n❌ Admin user not found!');
    process.exit(1);
  }

  const adminPasswordCorrect = await verifyPassword('password123', adminUser.passwordHash);

  console.log('\n✅ Admin user found:');
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Name: ${adminUser.name}`);
  console.log(`   Role: ${adminUser.role}`);
  console.log(`   Password verified: ${adminPasswordCorrect ? '✅' : '❌'}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ All test users are ready for E2E testing!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
