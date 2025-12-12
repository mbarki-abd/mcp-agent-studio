/**
 * Seed Audit Log Data
 *
 * Creates sample audit log entries for testing the audit dashboard.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Valid AuditAction enum values from Prisma schema
const ACTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'TOKEN_REFRESH',
  'CREATE', 'READ', 'UPDATE', 'DELETE',
  'SERVER_CONNECT', 'SERVER_DISCONNECT', 'HEALTH_CHECK',
  'AGENT_VALIDATE'
];
// Valid AuditStatus enum values from Prisma schema
const STATUSES = ['SUCCESS', 'FAILURE', 'PARTIAL'];
const RESOURCES = ['auth', 'servers', 'agents', 'tasks', 'tools', 'chat'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateIP() {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'curl/7.64.1',
  'PostmanRuntime/7.32.0',
];

async function seedAuditLogs() {
  console.log('Seeding audit logs...');

  // Get existing users
  const users = await prisma.user.findMany({ take: 5 });

  if (users.length === 0) {
    console.log('No users found. Creating a sample user...');
    const user = await prisma.user.create({
      data: {
        email: 'audit-test@example.com',
        name: 'Audit Test User',
        passwordHash: '$2b$10$sample',
        role: 'ADMIN',
      },
    });
    users.push(user);
  }

  const auditLogs = [];
  const now = new Date();

  // Generate 100 audit log entries over the last 7 days
  for (let i = 0; i < 100; i++) {
    const action = randomChoice(ACTIONS);
    const status = randomChoice(STATUSES);
    const resource = randomChoice(RESOURCES);
    const user = randomChoice(users);

    // Time spread over last 7 days
    const hoursAgo = randomInt(0, 168);
    const timestamp = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    const entry = {
      action,
      resource,
      resourceId: !['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'TOKEN_REFRESH'].includes(action) ? crypto.randomUUID() : null,
      userId: user.id,
      userEmail: user.email,
      ipAddress: generateIP(),
      userAgent: randomChoice(userAgents),
      status,
      duration: status === 'SUCCESS' ? randomInt(10, 500) : randomInt(100, 5000),
      errorMessage: status === 'FAILURE' ? `Error: ${randomChoice(['Unauthorized', 'Not found', 'Validation failed', 'Timeout'])}` : null,
      metadata: action === 'LOGIN' ? { browser: 'Chrome', os: 'Windows' } : null,
      timestamp,
    };

    // Add old/new values for UPDATE actions
    if (action === 'UPDATE') {
      entry.oldValue = { name: 'Old Name', status: 'INACTIVE' };
      entry.newValue = { name: 'New Name', status: 'ACTIVE' };
    }

    // Add new value for CREATE actions
    if (action === 'CREATE') {
      entry.newValue = { name: `New ${resource}`, createdBy: user.email };
    }

    auditLogs.push(entry);
  }

  // Add some specific failure scenarios
  auditLogs.push({
    action: 'LOGIN',
    resource: 'auth',
    userId: null,
    userEmail: 'hacker@evil.com',
    ipAddress: '185.220.101.42',
    userAgent: 'curl/7.64.1',
    status: 'FAILURE',
    errorMessage: 'User not found',
    duration: 45,
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  });

  auditLogs.push({
    action: 'LOGIN',
    resource: 'auth',
    userId: null,
    userEmail: 'admin@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0',
    status: 'FAILURE',
    errorMessage: 'Invalid password',
    duration: 120,
    timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
  });

  // Bulk create
  const result = await prisma.auditLog.createMany({
    data: auditLogs,
  });

  console.log(`Created ${result.count} audit log entries`);

  // Show summary
  const stats = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: true,
  });

  console.log('\nAudit log summary by action:');
  stats.forEach(s => console.log(`  ${s.action}: ${s._count}`));

  const statusStats = await prisma.auditLog.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('\nAudit log summary by status:');
  statusStats.forEach(s => console.log(`  ${s.status}: ${s._count}`));
}

async function main() {
  try {
    await seedAuditLogs();
  } catch (error) {
    console.error('Error seeding audit logs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
