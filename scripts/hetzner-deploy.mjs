#!/usr/bin/env node
/**
 * Hetzner Auto-Provisioning Script for mcp-agent-server
 *
 * @author AGT-HETZNER
 * @version 1.0.0
 *
 * Usage:
 *   HETZNER_API_TOKEN=xxx node scripts/hetzner-deploy.mjs
 *
 * Environment Variables:
 *   HETZNER_API_TOKEN (required) - Hetzner Cloud API token
 *   SERVER_TYPE (optional) - Server type (default: cax11 - ARM)
 *   LOCATION (optional) - Datacenter (default: fsn1)
 *   SERVER_NAME (optional) - Custom server name
 *   MASTER_URL (optional) - Master dashboard URL for registration
 *   MASTER_API_KEY (optional) - API key for master registration
 *   MCP_REPO_URL (optional) - Repository URL (default: auto-detect from git)
 *
 * Output:
 *   mcp-<SERVER_ID>.creds - Credentials file
 */

import https from 'https';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import { execSync } from 'child_process';

// Configuration
const CONFIG = {
  apiToken: process.env.HETZNER_API_TOKEN,
  serverType: process.env.SERVER_TYPE || 'cax11',
  location: process.env.LOCATION || 'fsn1',
  serverName: process.env.SERVER_NAME || `mcp-server-${Date.now()}`,
  image: 'ubuntu-22.04',
  masterUrl: process.env.MASTER_URL,
  masterApiKey: process.env.MASTER_API_KEY,
  repoUrl: process.env.MCP_REPO_URL || detectGitRepo(),
  healthCheckInterval: 5000, // 5 seconds
  healthCheckTimeout: 600000, // 10 minutes
};

// ANSI Colors
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging
function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function logStep(step, total, message) {
  log(`[${step}/${total}] ${message}`, COLORS.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, COLORS.green);
}

function logError(message) {
  log(`✗ ${message}`, COLORS.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, COLORS.yellow);
}

// Detect Git Repository
function detectGitRepo() {
  try {
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    // Convert SSH to HTTPS
    if (remote.startsWith('git@github.com:')) {
      return remote.replace('git@github.com:', 'https://github.com/').replace('.git', '');
    }

    return remote.replace('.git', '');
  } catch (error) {
    logWarning('Could not detect git repository. Using default.');
    return 'https://github.com/yourusername/mcp-agent-server';
  }
}

// Generate secure random string
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// Generate random password
function generatePassword(length = 24) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const values = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length];
  }

  return password;
}

// Generate credentials
function generateCredentials() {
  return {
    rootPassword: generatePassword(32),
    dbPassword: generatePassword(32),
    redisPassword: generatePassword(32),
    apiKey: generateSecureToken(64),
    jwtSecret: generateSecureToken(64),
  };
}

// Generate Cloud-Init YAML
function generateCloudInit(credentials) {
  const cloudInit = `#cloud-config

# Hetzner Cloud-Init for mcp-agent-server
# Generated: ${new Date().toISOString()}

users:
  - name: root
    shell: /bin/bash
    lock_passwd: false

chpasswd:
  expire: false
  list: |
    root:${credentials.rootPassword}

package_update: true
package_upgrade: true

packages:
  - curl
  - git
  - ufw
  - ca-certificates
  - gnupg
  - lsb-release
  - docker.io
  - docker-compose

runcmd:
  # Step 1: Configure UFW Firewall
  - echo "Step 1/9: Configuring firewall..."
  - ufw default deny incoming
  - ufw default allow outgoing
  - ufw allow 22/tcp
  - ufw allow 3000/tcp
  - ufw --force enable

  # Step 2: Enable Docker
  - echo "Step 2/9: Enabling Docker..."
  - systemctl enable docker
  - systemctl start docker
  - usermod -aG docker root

  # Step 3: Install Node.js 20
  - echo "Step 3/9: Installing Node.js 20..."
  - curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  - apt-get install -y nodejs
  - node --version
  - npm --version

  # Step 4: Clone repository
  - echo "Step 4/9: Cloning mcp-agent-server..."
  - cd /opt
  - git clone ${CONFIG.repoUrl} mcp-agent-server
  - cd mcp-agent-server

  # Step 5: Install dependencies
  - echo "Step 5/9: Installing dependencies..."
  - npm ci
  - npm run build || true

  # Step 6: Start PostgreSQL & Redis
  - echo "Step 6/9: Starting PostgreSQL & Redis..."
  - |
    cat > /opt/mcp-agent-server/docker-compose.yml <<EOF
    version: '3.8'
    services:
      postgres:
        image: postgres:15-alpine
        container_name: mcp-postgres
        restart: always
        environment:
          POSTGRES_DB: mcp_agent_db
          POSTGRES_USER: mcp_user
          POSTGRES_PASSWORD: ${credentials.dbPassword}
        ports:
          - "5432:5432"
        volumes:
          - postgres_data:/var/lib/postgresql/data
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U mcp_user"]
          interval: 10s
          timeout: 5s
          retries: 5

      redis:
        image: redis:7-alpine
        container_name: mcp-redis
        restart: always
        command: redis-server --requirepass ${credentials.redisPassword}
        ports:
          - "6379:6379"
        volumes:
          - redis_data:/data
        healthcheck:
          test: ["CMD", "redis-cli", "-a", "${credentials.redisPassword}", "ping"]
          interval: 10s
          timeout: 5s
          retries: 5

    volumes:
      postgres_data:
      redis_data:
    EOF
  - cd /opt/mcp-agent-server
  - docker-compose up -d
  - sleep 10

  # Step 7: Configure environment
  - echo "Step 7/9: Configuring environment..."
  - |
    cat > /opt/mcp-agent-server/.env <<EOF
    # Database
    DATABASE_URL=postgresql://mcp_user:${credentials.dbPassword}@localhost:5432/mcp_agent_db

    # Redis
    REDIS_URL=redis://:${credentials.redisPassword}@localhost:6379

    # Server
    PORT=3000
    NODE_ENV=production

    # Security
    JWT_SECRET=${credentials.jwtSecret}
    API_KEY=${credentials.apiKey}

    # Logging
    LOG_LEVEL=info
    EOF

  # Step 8: Initialize database
  - echo "Step 8/9: Initializing database..."
  - cd /opt/mcp-agent-server
  - npm run db:migrate || npx prisma migrate deploy || echo "No migrations found"
  - npm run db:seed || echo "No seed data"

  # Step 9: Create systemd service
  - echo "Step 9/9: Creating systemd service..."
  - |
    cat > /etc/systemd/system/mcp-agent-server.service <<EOF
    [Unit]
    Description=MCP Agent Server
    After=network.target docker.service
    Requires=docker.service

    [Service]
    Type=simple
    User=root
    WorkingDirectory=/opt/mcp-agent-server
    ExecStart=/usr/bin/npm start
    Restart=always
    RestartSec=10
    Environment=NODE_ENV=production

    [Install]
    WantedBy=multi-user.target
    EOF
  - systemctl daemon-reload
  - systemctl enable mcp-agent-server
  - systemctl start mcp-agent-server

  # Create ready marker
  - echo "Server provisioned successfully at $(date)" > /opt/.ready
  - echo "All steps completed!"

final_message: "MCP Agent Server provisioning complete!"
`;

  return cloudInit;
}

// Make HTTPS request
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.error?.message || body}`));
          }
        } catch (error) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ body });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Create Hetzner server
async function createServer(credentials) {
  log('\n' + '='.repeat(60), COLORS.bright);
  log('Creating Hetzner Cloud Server', COLORS.bright);
  log('='.repeat(60) + '\n', COLORS.bright);

  logStep(1, 4, 'Generating cloud-init configuration...');
  const cloudInit = generateCloudInit(credentials);

  logStep(2, 4, 'Sending server creation request...');
  const options = {
    hostname: 'api.hetzner.cloud',
    path: '/v1/servers',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.apiToken}`,
      'Content-Type': 'application/json',
    },
  };

  const requestData = {
    name: CONFIG.serverName,
    server_type: CONFIG.serverType,
    location: CONFIG.location,
    image: CONFIG.image,
    user_data: cloudInit,
    start_after_create: true,
    labels: {
      type: 'mcp-agent-server',
      created_by: 'auto-provisioning',
      created_at: new Date().toISOString(),
    },
  };

  try {
    const response = await httpsRequest(options, requestData);

    logSuccess('Server created successfully!');

    const server = response.server;
    const ipv4 = server.public_net.ipv4.ip;

    log('\n' + '-'.repeat(60), COLORS.blue);
    log('Server Information:', COLORS.bright);
    log('-'.repeat(60), COLORS.blue);
    log(`  Name:     ${server.name}`);
    log(`  ID:       ${server.id}`);
    log(`  Type:     ${server.server_type.name} (${server.server_type.cores} CPU, ${server.server_type.memory}GB RAM)`);
    log(`  Location: ${server.datacenter.location.name}`);
    log(`  IPv4:     ${ipv4}`);
    log(`  Status:   ${server.status}`);
    log('-'.repeat(60) + '\n', COLORS.blue);

    return {
      id: server.id,
      name: server.name,
      ip: ipv4,
      status: server.status,
    };
  } catch (error) {
    logError(`Failed to create server: ${error.message}`);
    throw error;
  }
}

// Poll health endpoint
async function pollHealth(ip) {
  log('\n' + '='.repeat(60), COLORS.bright);
  log('Waiting for Server to be Ready', COLORS.bright);
  log('='.repeat(60) + '\n', COLORS.bright);

  const startTime = Date.now();
  const maxAttempts = Math.floor(CONFIG.healthCheckTimeout / CONFIG.healthCheckInterval);
  let attempt = 0;

  log(`Health check URL: http://${ip}:3000/health`);
  log(`Timeout: ${CONFIG.healthCheckTimeout / 1000}s (${maxAttempts} attempts)\n`);

  return new Promise((resolve, reject) => {
    const checkHealth = () => {
      attempt++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      process.stdout.write(`\r${COLORS.yellow}[${attempt}/${maxAttempts}] Checking health... (${elapsed}s elapsed)${COLORS.reset}`);

      const options = {
        hostname: ip,
        port: 3000,
        path: '/health',
        method: 'GET',
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(''); // New line
            logSuccess(`Server is ready! (took ${elapsed}s)`);
            resolve(true);
          } else {
            scheduleNext();
          }
        });
      });

      req.on('error', () => {
        scheduleNext();
      });

      req.on('timeout', () => {
        req.destroy();
        scheduleNext();
      });

      req.end();
    };

    const scheduleNext = () => {
      if (attempt >= maxAttempts) {
        console.log(''); // New line
        logError('Health check timeout! Server may still be provisioning.');
        logWarning('You can check manually: ssh root@' + ip);
        reject(new Error('Health check timeout'));
      } else {
        setTimeout(checkHealth, CONFIG.healthCheckInterval);
      }
    };

    // Initial delay to allow server to boot
    log('Waiting 30s for server to boot...\n');
    setTimeout(checkHealth, 30000);
  });
}

// Write credentials file
function writeCredentialsFile(serverInfo, credentials) {
  const filename = `mcp-${serverInfo.id}.creds`;
  const content = `# MCP Agent Server Credentials
# Generated: ${new Date().toISOString()}
# Server: ${serverInfo.name}

# Connection
IP=${serverInfo.ip}
ID=${serverInfo.id}
SSH_USER=root

# Passwords
ROOT_PASSWORD=${credentials.rootPassword}
DB_PASSWORD=${credentials.dbPassword}
REDIS_PASSWORD=${credentials.redisPassword}

# API Access
API_KEY=${credentials.apiKey}
API_URL=http://${serverInfo.ip}:3000

# Security
JWT_SECRET=${credentials.jwtSecret}

# Database
DATABASE_URL=postgresql://mcp_user:${credentials.dbPassword}@${serverInfo.ip}:5432/mcp_agent_db

# Redis
REDIS_URL=redis://:${credentials.redisPassword}@${serverInfo.ip}:6379

# Quick SSH
# ssh root@${serverInfo.ip}
# Password: ${credentials.rootPassword}
`;

  fs.writeFileSync(filename, content, 'utf8');
  logSuccess(`Credentials saved to: ${filename}`);

  return filename;
}

// Register with master dashboard
async function registerWithMaster(serverInfo, credentials) {
  if (!CONFIG.masterUrl || !CONFIG.masterApiKey) {
    logWarning('Skipping master registration (no MASTER_URL or MASTER_API_KEY)');
    return;
  }

  log('\n' + '='.repeat(60), COLORS.bright);
  log('Registering with Master Dashboard', COLORS.bright);
  log('='.repeat(60) + '\n', COLORS.bright);

  try {
    const url = new URL('/api/servers/register', CONFIG.masterUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.masterApiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const requestData = {
      server_id: serverInfo.id,
      name: serverInfo.name,
      ip: serverInfo.ip,
      api_key: credentials.apiKey,
      api_url: `http://${serverInfo.ip}:3000`,
      metadata: {
        location: CONFIG.location,
        server_type: CONFIG.serverType,
        created_at: new Date().toISOString(),
      },
    };

    const protocol = url.protocol === 'https:' ? https : http;

    await new Promise((resolve, reject) => {
      const req = protocol.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(requestData));
      req.end();
    });

    logSuccess('Server registered with master dashboard!');
    log(`  Dashboard URL: ${CONFIG.masterUrl}`);
  } catch (error) {
    logWarning(`Failed to register with master: ${error.message}`);
  }
}

// Main execution
async function main() {
  try {
    // Validate configuration
    if (!CONFIG.apiToken) {
      logError('HETZNER_API_TOKEN environment variable is required!');
      process.exit(1);
    }

    log('\n' + '█'.repeat(60), COLORS.magenta);
    log('  HETZNER AUTO-PROVISIONING - MCP AGENT SERVER', COLORS.bright);
    log('█'.repeat(60) + '\n', COLORS.magenta);

    log('Configuration:', COLORS.bright);
    log(`  Server Type: ${CONFIG.serverType}`);
    log(`  Location:    ${CONFIG.location}`);
    log(`  Server Name: ${CONFIG.serverName}`);
    log(`  Image:       ${CONFIG.image}`);
    log(`  Repository:  ${CONFIG.repoUrl}\n`);

    // Step 1: Generate credentials
    logStep(1, 5, 'Generating secure credentials...');
    const credentials = generateCredentials();
    logSuccess('Credentials generated');

    // Step 2: Create server
    logStep(2, 5, 'Creating Hetzner server...');
    const serverInfo = await createServer(credentials);

    // Step 3: Wait for health check
    logStep(3, 5, 'Waiting for server to be ready...');
    try {
      await pollHealth(serverInfo.ip);
    } catch (error) {
      logWarning('Health check failed, but server may still be provisioning');
      logWarning('Check status with: ssh root@' + serverInfo.ip);
    }

    // Step 4: Write credentials
    logStep(4, 5, 'Saving credentials...');
    const credFile = writeCredentialsFile(serverInfo, credentials);

    // Step 5: Register with master
    logStep(5, 5, 'Registering with master dashboard...');
    await registerWithMaster(serverInfo, credentials);

    // Summary
    log('\n' + '█'.repeat(60), COLORS.green);
    log('  DEPLOYMENT SUCCESSFUL!', COLORS.bright);
    log('█'.repeat(60) + '\n', COLORS.green);

    log('Next Steps:', COLORS.bright);
    log(`  1. SSH into server:  ssh root@${serverInfo.ip}`);
    log(`  2. Check logs:       journalctl -u mcp-agent-server -f`);
    log(`  3. Access API:       http://${serverInfo.ip}:3000`);
    log(`  4. Health check:     curl http://${serverInfo.ip}:3000/health`);
    log(`  5. Credentials:      cat ${credFile}\n`);

    log('Important:', COLORS.yellow);
    log(`  - Save ${credFile} securely!`);
    log(`  - Root password: ${credentials.rootPassword}`);
    log(`  - API Key: ${credentials.apiKey}\n`);

  } catch (error) {
    logError(`\nDeployment failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Execute
main();
