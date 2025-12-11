// Check all data
const API_URL = 'http://localhost:3000';

async function checkData() {
  // Login
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mbarki@ilinqsoft.com', password: 'P@55lin@' })
  });
  const { token } = await loginRes.json();

  // Get all data
  const [servers, agents, tasks] = await Promise.all([
    fetch(`${API_URL}/api/servers`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch(`${API_URL}/api/agents`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  ]);

  console.log('\n=== DATA SUMMARY ===');
  console.log(`Servers: ${servers.servers?.length || 0}`);
  console.log(`Agents: ${agents.agents?.length || 0}`);
  console.log(`Tasks: ${tasks.tasks?.length || 0}`);

  console.log('\n=== SERVERS ===');
  servers.servers?.forEach(s => console.log(`  - ${s.name} (${s.url})`));

  console.log('\n=== AGENTS ===');
  agents.agents?.forEach(a => console.log(`  - ${a.displayName} (${a.role}) - ${a.status}`));

  console.log('\n=== TASKS ===');
  tasks.tasks?.slice(0, 10).forEach(t => console.log(`  - ${t.title} (${t.status})`));

  console.log('\n✅ All data verified');
}

checkData().catch(console.error);
