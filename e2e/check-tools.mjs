// Check tools count
const API_URL = 'http://localhost:3000';

async function checkTools() {
  // Login
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'mbarki@ilinqsoft.com',
      password: 'P@55lin@'
    })
  });
  const { token } = await loginRes.json();

  // Get tools
  const toolsRes = await fetch(`${API_URL}/api/tools/definitions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { tools } = await toolsRes.json();

  console.log(`\n✅ Tools in database: ${tools.length}`);

  // Group by category
  const byCategory = {};
  tools.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });

  console.log('\nBy category:');
  Object.entries(byCategory).sort().forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
}

checkTools().catch(console.error);
