import { PrismaClient, ToolCategory } from '@prisma/client';
import { hashPassword } from '../src/utils/password.js';

const prisma = new PrismaClient();

const toolDefinitions = [
  // VERSION CONTROL
  {
    name: 'git',
    displayName: 'Git',
    description: 'Distributed version control system',
    category: ToolCategory.VERSION_CONTROL,
    installCommand: 'apt-get install -y git',
    uninstallCommand: 'apt-get remove -y git',
    versionCommand: 'git --version',
    versionRegex: 'git version ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://git-scm.com',
    documentation: 'https://git-scm.com/doc',
    icon: 'git',
    tags: ['vcs', 'scm', 'source-control'],
  },
  {
    name: 'gh',
    displayName: 'GitHub CLI',
    description: 'GitHub official command line tool',
    category: ToolCategory.VERSION_CONTROL,
    installCommand: 'curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && sudo apt update && sudo apt install gh -y',
    versionCommand: 'gh --version',
    versionRegex: 'gh version ([\\d.]+)',
    dependencies: ['git'],
    requiresSudo: true,
    website: 'https://cli.github.com',
    documentation: 'https://cli.github.com/manual',
    icon: 'github',
    tags: ['github', 'cli', 'git'],
  },

  // CONTAINERS
  {
    name: 'docker',
    displayName: 'Docker',
    description: 'Container runtime and management',
    category: ToolCategory.CONTAINER,
    installCommand: 'curl -fsSL https://get.docker.com | sh',
    uninstallCommand: 'apt-get remove -y docker-ce docker-ce-cli containerd.io',
    versionCommand: 'docker --version',
    versionRegex: 'Docker version ([\\d.]+)',
    dependencies: [],
    minDiskSpace: 2000,
    requiresSudo: true,
    website: 'https://docker.com',
    documentation: 'https://docs.docker.com',
    icon: 'docker',
    tags: ['container', 'virtualization', 'devops'],
  },
  {
    name: 'docker-compose',
    displayName: 'Docker Compose',
    description: 'Multi-container Docker applications',
    category: ToolCategory.CONTAINER,
    installCommand: 'apt-get install -y docker-compose-plugin',
    versionCommand: 'docker compose version',
    versionRegex: 'Docker Compose version v([\\d.]+)',
    dependencies: ['docker'],
    requiresSudo: true,
    website: 'https://docs.docker.com/compose',
    icon: 'docker',
    tags: ['container', 'orchestration', 'docker'],
  },
  {
    name: 'podman',
    displayName: 'Podman',
    description: 'Daemonless container engine',
    category: ToolCategory.CONTAINER,
    installCommand: 'apt-get install -y podman',
    versionCommand: 'podman --version',
    versionRegex: 'podman version ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://podman.io',
    icon: 'podman',
    tags: ['container', 'rootless', 'oci'],
  },

  // KUBERNETES
  {
    name: 'kubectl',
    displayName: 'kubectl',
    description: 'Kubernetes command-line tool',
    category: ToolCategory.KUBERNETES,
    installCommand: 'curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && chmod +x kubectl && mv kubectl /usr/local/bin/',
    versionCommand: 'kubectl version --client --short 2>/dev/null || kubectl version --client',
    versionRegex: 'Client Version: v([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://kubernetes.io/docs/reference/kubectl',
    icon: 'kubernetes',
    tags: ['kubernetes', 'k8s', 'orchestration'],
  },
  {
    name: 'helm',
    displayName: 'Helm',
    description: 'Kubernetes package manager',
    category: ToolCategory.KUBERNETES,
    installCommand: 'curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash',
    versionCommand: 'helm version --short',
    versionRegex: 'v([\\d.]+)',
    dependencies: ['kubectl'],
    requiresSudo: true,
    website: 'https://helm.sh',
    icon: 'helm',
    tags: ['kubernetes', 'package-manager', 'charts'],
  },
  {
    name: 'k9s',
    displayName: 'K9s',
    description: 'Kubernetes CLI dashboard',
    category: ToolCategory.KUBERNETES,
    installCommand: 'curl -sS https://webinstall.dev/k9s | bash',
    versionCommand: 'k9s version --short',
    versionRegex: 'Version\\s+v([\\d.]+)',
    dependencies: ['kubectl'],
    requiresSudo: false,
    website: 'https://k9scli.io',
    icon: 'k9s',
    tags: ['kubernetes', 'tui', 'dashboard'],
  },

  // CLOUD CLI
  {
    name: 'aws-cli',
    displayName: 'AWS CLI',
    description: 'Amazon Web Services command line interface',
    category: ToolCategory.CLOUD_CLI,
    installCommand: 'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && unzip awscliv2.zip && sudo ./aws/install',
    versionCommand: 'aws --version',
    versionRegex: 'aws-cli/([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://aws.amazon.com/cli',
    icon: 'aws',
    tags: ['cloud', 'aws', 'amazon'],
  },
  {
    name: 'gcloud',
    displayName: 'Google Cloud CLI',
    description: 'Google Cloud Platform command line interface',
    category: ToolCategory.CLOUD_CLI,
    installCommand: 'curl https://sdk.cloud.google.com | bash',
    versionCommand: 'gcloud --version',
    versionRegex: 'Google Cloud SDK ([\\d.]+)',
    dependencies: [],
    requiresSudo: false,
    website: 'https://cloud.google.com/sdk',
    icon: 'gcp',
    tags: ['cloud', 'gcp', 'google'],
  },
  {
    name: 'az',
    displayName: 'Azure CLI',
    description: 'Microsoft Azure command line interface',
    category: ToolCategory.CLOUD_CLI,
    installCommand: 'curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash',
    versionCommand: 'az --version',
    versionRegex: 'azure-cli\\s+([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://docs.microsoft.com/cli/azure',
    icon: 'azure',
    tags: ['cloud', 'azure', 'microsoft'],
  },

  // LANGUAGE RUNTIMES
  {
    name: 'nodejs',
    displayName: 'Node.js',
    description: 'JavaScript runtime built on V8',
    category: ToolCategory.LANGUAGE_RUNTIME,
    installCommand: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs',
    uninstallCommand: 'apt-get remove -y nodejs',
    versionCommand: 'node --version',
    versionRegex: 'v([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://nodejs.org',
    icon: 'nodejs',
    tags: ['javascript', 'runtime', 'v8'],
  },
  {
    name: 'python3',
    displayName: 'Python 3',
    description: 'Python programming language',
    category: ToolCategory.LANGUAGE_RUNTIME,
    installCommand: 'apt-get install -y python3 python3-pip python3-venv',
    versionCommand: 'python3 --version',
    versionRegex: 'Python ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://python.org',
    icon: 'python',
    tags: ['python', 'runtime', 'scripting'],
  },
  {
    name: 'go',
    displayName: 'Go',
    description: 'Go programming language',
    category: ToolCategory.LANGUAGE_RUNTIME,
    installCommand: 'wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz && sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz',
    versionCommand: 'go version',
    versionRegex: 'go([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://go.dev',
    icon: 'go',
    tags: ['golang', 'runtime', 'compiled'],
  },
  {
    name: 'rust',
    displayName: 'Rust',
    description: 'Rust programming language via rustup',
    category: ToolCategory.LANGUAGE_RUNTIME,
    installCommand: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
    versionCommand: 'rustc --version',
    versionRegex: 'rustc ([\\d.]+)',
    dependencies: [],
    requiresSudo: false,
    website: 'https://rust-lang.org',
    icon: 'rust',
    tags: ['rust', 'runtime', 'systems'],
  },
  {
    name: 'deno',
    displayName: 'Deno',
    description: 'Secure TypeScript runtime',
    category: ToolCategory.LANGUAGE_RUNTIME,
    installCommand: 'curl -fsSL https://deno.land/install.sh | sh',
    versionCommand: 'deno --version',
    versionRegex: 'deno ([\\d.]+)',
    dependencies: [],
    requiresSudo: false,
    website: 'https://deno.land',
    icon: 'deno',
    tags: ['typescript', 'javascript', 'runtime'],
  },
  {
    name: 'bun',
    displayName: 'Bun',
    description: 'Fast JavaScript runtime and toolkit',
    category: ToolCategory.LANGUAGE_RUNTIME,
    installCommand: 'curl -fsSL https://bun.sh/install | bash',
    versionCommand: 'bun --version',
    versionRegex: '([\\d.]+)',
    dependencies: [],
    requiresSudo: false,
    website: 'https://bun.sh',
    icon: 'bun',
    tags: ['javascript', 'typescript', 'bundler'],
  },

  // PACKAGE MANAGERS
  {
    name: 'pnpm',
    displayName: 'pnpm',
    description: 'Fast, disk space efficient package manager',
    category: ToolCategory.PACKAGE_MANAGER,
    installCommand: 'npm install -g pnpm',
    versionCommand: 'pnpm --version',
    versionRegex: '([\\d.]+)',
    dependencies: ['nodejs'],
    requiresSudo: false,
    website: 'https://pnpm.io',
    icon: 'pnpm',
    tags: ['nodejs', 'package-manager', 'npm'],
  },
  {
    name: 'yarn',
    displayName: 'Yarn',
    description: 'Fast, reliable dependency management',
    category: ToolCategory.PACKAGE_MANAGER,
    installCommand: 'npm install -g yarn',
    versionCommand: 'yarn --version',
    versionRegex: '([\\d.]+)',
    dependencies: ['nodejs'],
    requiresSudo: false,
    website: 'https://yarnpkg.com',
    icon: 'yarn',
    tags: ['nodejs', 'package-manager', 'npm'],
  },
  {
    name: 'pip',
    displayName: 'pip',
    description: 'Python package installer',
    category: ToolCategory.PACKAGE_MANAGER,
    installCommand: 'apt-get install -y python3-pip',
    versionCommand: 'pip3 --version',
    versionRegex: 'pip ([\\d.]+)',
    dependencies: ['python3'],
    requiresSudo: true,
    website: 'https://pip.pypa.io',
    icon: 'python',
    tags: ['python', 'package-manager'],
  },

  // DATABASE CLIENTS
  {
    name: 'psql',
    displayName: 'PostgreSQL Client',
    description: 'PostgreSQL interactive terminal',
    category: ToolCategory.DATABASE_CLIENT,
    installCommand: 'apt-get install -y postgresql-client',
    versionCommand: 'psql --version',
    versionRegex: 'psql \\(PostgreSQL\\) ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://postgresql.org',
    icon: 'postgresql',
    tags: ['database', 'postgresql', 'sql'],
  },
  {
    name: 'mysql-client',
    displayName: 'MySQL Client',
    description: 'MySQL command-line client',
    category: ToolCategory.DATABASE_CLIENT,
    installCommand: 'apt-get install -y mysql-client',
    versionCommand: 'mysql --version',
    versionRegex: 'mysql\\s+Ver\\s+([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://mysql.com',
    icon: 'mysql',
    tags: ['database', 'mysql', 'sql'],
  },
  {
    name: 'redis-cli',
    displayName: 'Redis CLI',
    description: 'Redis command line interface',
    category: ToolCategory.DATABASE_CLIENT,
    installCommand: 'apt-get install -y redis-tools',
    versionCommand: 'redis-cli --version',
    versionRegex: 'redis-cli ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://redis.io',
    icon: 'redis',
    tags: ['database', 'redis', 'cache'],
  },
  {
    name: 'mongosh',
    displayName: 'MongoDB Shell',
    description: 'MongoDB interactive shell',
    category: ToolCategory.DATABASE_CLIENT,
    installCommand: 'wget -qO- https://www.mongodb.org/static/pgp/server-7.0.asc | sudo tee /etc/apt/trusted.gpg.d/server-7.0.asc && echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list && sudo apt-get update && sudo apt-get install -y mongodb-mongosh',
    versionCommand: 'mongosh --version',
    versionRegex: '([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://mongodb.com/docs/mongodb-shell',
    icon: 'mongodb',
    tags: ['database', 'mongodb', 'nosql'],
  },

  // DEVOPS
  {
    name: 'terraform',
    displayName: 'Terraform',
    description: 'Infrastructure as Code tool',
    category: ToolCategory.DEVOPS,
    installCommand: 'wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list && sudo apt update && sudo apt install terraform',
    versionCommand: 'terraform --version',
    versionRegex: 'Terraform v([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://terraform.io',
    icon: 'terraform',
    tags: ['iac', 'infrastructure', 'hashicorp'],
  },
  {
    name: 'ansible',
    displayName: 'Ansible',
    description: 'IT automation platform',
    category: ToolCategory.DEVOPS,
    installCommand: 'pip3 install ansible',
    versionCommand: 'ansible --version',
    versionRegex: 'ansible \\[core ([\\d.]+)\\]',
    dependencies: ['python3', 'pip'],
    requiresSudo: false,
    website: 'https://ansible.com',
    icon: 'ansible',
    tags: ['automation', 'configuration', 'devops'],
  },

  // UTILITIES
  {
    name: 'jq',
    displayName: 'jq',
    description: 'Lightweight JSON processor',
    category: ToolCategory.UTILITY,
    installCommand: 'apt-get install -y jq',
    versionCommand: 'jq --version',
    versionRegex: 'jq-([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://stedolan.github.io/jq',
    icon: 'json',
    tags: ['json', 'cli', 'parser'],
  },
  {
    name: 'yq',
    displayName: 'yq',
    description: 'YAML processor (like jq for YAML)',
    category: ToolCategory.UTILITY,
    installCommand: 'wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/bin/yq && chmod +x /usr/bin/yq',
    versionCommand: 'yq --version',
    versionRegex: 'yq .* version v([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://mikefarah.gitbook.io/yq',
    icon: 'yaml',
    tags: ['yaml', 'cli', 'parser'],
  },
  {
    name: 'curl',
    displayName: 'curl',
    description: 'Command line tool for transferring data',
    category: ToolCategory.UTILITY,
    installCommand: 'apt-get install -y curl',
    versionCommand: 'curl --version',
    versionRegex: 'curl ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://curl.se',
    icon: 'curl',
    tags: ['http', 'transfer', 'network'],
  },
  {
    name: 'wget',
    displayName: 'wget',
    description: 'Network downloader',
    category: ToolCategory.UTILITY,
    installCommand: 'apt-get install -y wget',
    versionCommand: 'wget --version',
    versionRegex: 'GNU Wget ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://gnu.org/software/wget',
    icon: 'download',
    tags: ['http', 'download', 'network'],
  },
  {
    name: 'htop',
    displayName: 'htop',
    description: 'Interactive process viewer',
    category: ToolCategory.UTILITY,
    installCommand: 'apt-get install -y htop',
    versionCommand: 'htop --version',
    versionRegex: 'htop ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://htop.dev',
    icon: 'monitor',
    tags: ['monitoring', 'process', 'system'],
  },
  {
    name: 'tmux',
    displayName: 'tmux',
    description: 'Terminal multiplexer',
    category: ToolCategory.UTILITY,
    installCommand: 'apt-get install -y tmux',
    versionCommand: 'tmux -V',
    versionRegex: 'tmux ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://github.com/tmux/tmux',
    icon: 'terminal',
    tags: ['terminal', 'multiplexer', 'session'],
  },
  {
    name: 'ripgrep',
    displayName: 'ripgrep',
    description: 'Fast recursive search tool',
    category: ToolCategory.UTILITY,
    installCommand: 'apt-get install -y ripgrep',
    versionCommand: 'rg --version',
    versionRegex: 'ripgrep ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://github.com/BurntSushi/ripgrep',
    icon: 'search',
    tags: ['search', 'grep', 'fast'],
  },
  {
    name: 'fzf',
    displayName: 'fzf',
    description: 'Command-line fuzzy finder',
    category: ToolCategory.UTILITY,
    installCommand: 'apt-get install -y fzf',
    versionCommand: 'fzf --version',
    versionRegex: '([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://github.com/junegunn/fzf',
    icon: 'search',
    tags: ['search', 'fuzzy', 'interactive'],
  },

  // SECURITY
  {
    name: 'openssl',
    displayName: 'OpenSSL',
    description: 'SSL/TLS toolkit',
    category: ToolCategory.SECURITY,
    installCommand: 'apt-get install -y openssl',
    versionCommand: 'openssl version',
    versionRegex: 'OpenSSL ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://openssl.org',
    icon: 'lock',
    tags: ['ssl', 'tls', 'crypto'],
  },
  {
    name: 'gnupg',
    displayName: 'GnuPG',
    description: 'GNU Privacy Guard',
    category: ToolCategory.SECURITY,
    installCommand: 'apt-get install -y gnupg',
    versionCommand: 'gpg --version',
    versionRegex: 'gpg \\(GnuPG\\) ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://gnupg.org',
    icon: 'key',
    tags: ['gpg', 'encryption', 'signing'],
  },

  // EDITORS
  {
    name: 'vim',
    displayName: 'Vim',
    description: 'Highly configurable text editor',
    category: ToolCategory.EDITOR,
    installCommand: 'apt-get install -y vim',
    versionCommand: 'vim --version',
    versionRegex: 'VIM - Vi IMproved ([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://vim.org',
    icon: 'vim',
    tags: ['editor', 'terminal', 'modal'],
  },
  {
    name: 'neovim',
    displayName: 'Neovim',
    description: 'Hyperextensible Vim-based text editor',
    category: ToolCategory.EDITOR,
    installCommand: 'apt-get install -y neovim',
    versionCommand: 'nvim --version',
    versionRegex: 'NVIM v([\\d.]+)',
    dependencies: [],
    requiresSudo: true,
    website: 'https://neovim.io',
    icon: 'neovim',
    tags: ['editor', 'terminal', 'lua'],
  },
];

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ==================== ORGANIZATIONS ====================
  console.log('📦 Seeding organizations...');

  const testOrg = await prisma.organization.upsert({
    where: { slug: 'test-org' },
    update: {},
    create: {
      name: 'Test Organization',
      slug: 'test-org',
      plan: 'FREE',
      maxUsers: 5,
      maxServers: 2,
      maxAgents: 10,
      maxTasksPerMonth: 1000,
    },
  });
  console.log(`  ✅ Organization: ${testOrg.name} (${testOrg.slug})`);

  // ==================== USERS ====================
  console.log('\n👤 Seeding users...');

  // Test user for E2E tests
  const hashedPassword = await hashPassword('password123');
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
      name: 'Test User',
      role: 'USER',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      organizationId: testOrg.id,
    },
  });
  console.log(`  ✅ Test User: ${testUser.email}`);

  // Admin user
  const hashedAdminPassword = await hashPassword('password123');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: hashedAdminPassword,
    },
    create: {
      email: 'admin@example.com',
      passwordHash: hashedAdminPassword,
      name: 'Test Admin',
      role: 'ADMIN',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      organizationId: testOrg.id,
    },
  });
  console.log(`  ✅ Admin User: ${adminUser.email}`);

  // ==================== TOOLS ====================
  console.log('\n🔧 Seeding tool definitions...');

  for (const tool of toolDefinitions) {
    await prisma.toolDefinition.upsert({
      where: { name: tool.name },
      update: tool,
      create: tool,
    });
    console.log(`  ✅ ${tool.displayName}`);
  }

  // ==================== SUMMARY ====================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Database seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`  • Organizations: 1`);
  console.log(`  • Users: 2`);
  console.log(`  • Tool Definitions: ${toolDefinitions.length}`);
  console.log('\n🔐 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST USER:');
  console.log('    Email:    test@example.com');
  console.log('    Password: password123');
  console.log('    Role:     USER');
  console.log('');
  console.log('  ADMIN USER:');
  console.log('    Email:    admin@example.com');
  console.log('    Password: password123');
  console.log('    Role:     ADMIN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
