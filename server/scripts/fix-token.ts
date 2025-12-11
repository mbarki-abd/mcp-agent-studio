import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/utils/crypto.js';

const prisma = new PrismaClient();

async function fixToken() {
  const server = await prisma.serverConfiguration.findFirst({
    where: { name: 'MyServer' }
  });

  if (!server) {
    console.log('MyServer not found!');
    return;
  }

  console.log('Current masterToken:', server.masterToken?.substring(0, 50) + '...');
  console.log('Token format valid:', server.masterToken?.split(':').length === 3);

  // Re-encrypt with proper format
  const newToken = encrypt('mcp-master-token');

  await prisma.serverConfiguration.update({
    where: { id: server.id },
    data: { masterToken: newToken }
  });

  console.log('\nToken updated successfully!');
  console.log('New token format:', newToken.split(':').length === 3 ? 'Valid (iv:authTag:encrypted)' : 'Invalid');

  await prisma.$disconnect();
}

fixToken().catch(console.error);
