// Cleanup servers - keep only MyServer
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/mcp_studio'
    }
  }
});

async function cleanup() {
  const keepServerId = '59c147f5-62bb-493f-b853-d238407c3519'; // MyServer

  // Get all servers except MyServer
  const serversToDelete = await prisma.serverConfiguration.findMany({
    where: { id: { not: keepServerId } }
  });

  console.log('Servers to delete:', serversToDelete.map(s => s.name));

  for (const server of serversToDelete) {
    console.log(`\nDeleting ${server.name}...`);

    // Delete in order: TaskExecutions -> Tasks -> AgentToolPermissions -> Agents -> ServerTools -> Server
    // First get task IDs for this server's agents
    const taskIds = await prisma.task.findMany({
      where: { agent: { serverId: server.id } },
      select: { id: true }
    });

    const executions = await prisma.taskExecution.deleteMany({
      where: { taskId: { in: taskIds.map(t => t.id) } }
    });
    console.log(`  - ${executions.count} task executions deleted`);

    const tasks = await prisma.task.deleteMany({
      where: { agent: { serverId: server.id } }
    });
    console.log(`  - ${tasks.count} tasks deleted`);

    const perms = await prisma.agentToolPermission.deleteMany({
      where: { agent: { serverId: server.id } }
    });
    console.log(`  - ${perms.count} permissions deleted`);

    const agents = await prisma.agent.deleteMany({
      where: { serverId: server.id }
    });
    console.log(`  - ${agents.count} agents deleted`);

    const tools = await prisma.serverTool.deleteMany({
      where: { serverId: server.id }
    });
    console.log(`  - ${tools.count} server tools deleted`);

    await prisma.serverConfiguration.delete({
      where: { id: server.id }
    });
    console.log(`  - Server deleted`);
  }

  // Verify
  const remaining = await prisma.serverConfiguration.findMany();
  console.log('\n=== Remaining servers ===');
  remaining.forEach(s => console.log(`  - ${s.name} (${s.url})`));

  await prisma.$disconnect();
}

cleanup().catch(console.error);
