// Check API response format
const API_URL = 'http://localhost:3000';

async function checkApiFormat() {
  // Login
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mbarki@ilinqsoft.com', password: 'P@55lin@' })
  });
  const loginData = await loginRes.json();
  console.log('Login response:', JSON.stringify(loginData, null, 2));

  const token = loginData.token;

  // Check servers
  const serversRes = await fetch(`${API_URL}/api/servers`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const serversData = await serversRes.json();
  console.log('\nServers response:', JSON.stringify(serversData, null, 2));
  console.log('Type of serversData:', typeof serversData);
  console.log('Is array:', Array.isArray(serversData));
  console.log('Has items:', !!serversData.items);

  // Check agents
  const agentsRes = await fetch(`${API_URL}/api/agents`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const agentsData = await agentsRes.json();
  console.log('\nAgents response:', JSON.stringify(agentsData, null, 2));
}

checkApiFormat();
