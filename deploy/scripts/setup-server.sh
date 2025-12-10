#!/bin/bash
# MCP Agent Studio - Server Setup Script
# Run this script on a fresh Ubuntu 22.04 server

set -e

echo "=== MCP Agent Studio - Server Setup ==="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

# Update system
echo "Updating system..."
apt update && apt upgrade -y

# Install required packages
echo "Installing required packages..."
apt install -y \
  curl \
  git \
  ufw \
  fail2ban \
  unattended-upgrades \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
echo "Installing Docker Compose..."
apt install -y docker-compose-plugin

# Create deploy user
echo "Creating deploy user..."
if ! id "deploy" &>/dev/null; then
  useradd -m -s /bin/bash deploy
  usermod -aG docker deploy
  mkdir -p /home/deploy/.ssh
  cp /root/.ssh/authorized_keys /home/deploy/.ssh/ 2>/dev/null || true
  chown -R deploy:deploy /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chmod 600 /home/deploy/.ssh/authorized_keys
fi

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/mcp-agent-studio
chown deploy:deploy /opt/mcp-agent-studio

# Configure firewall
echo "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# Configure fail2ban
echo "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# Configure automatic security updates
echo "Configuring automatic updates..."
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Setup complete
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Clone the repository to /opt/mcp-agent-studio"
echo "2. Copy deploy/.env.example to deploy/.env and configure"
echo "3. Run: cd /opt/mcp-agent-studio && docker compose -f deploy/docker-compose.prod.yml up -d"
echo ""
echo "Server is ready!"
