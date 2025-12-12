# Guide de Déploiement - MCP Agent Studio

## Vue d'Ensemble

Ce guide documente le processus de déploiement de MCP Agent Studio sur un serveur Hetzner CX21.

### Architecture Cible

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HETZNER CX21                                     │
│                     (2 vCPU, 4GB RAM)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                        │
│  │   Traefik    │ :80, :443                                             │
│  │   (proxy)    │ SSL via Let's Encrypt                                 │
│  └──────┬───────┘                                                        │
│         │                                                                │
│    ┌────┴────┬──────────┬──────────┐                                    │
│    │         │          │          │                                     │
│    ▼         ▼          ▼          ▼                                     │
│ ┌──────┐ ┌──────┐ ┌──────────┐ ┌───────┐                               │
│ │Server│ │Dash  │ │PostgreSQL│ │ Redis │                               │
│ │:3000 │ │:80   │ │  :5432   │ │ :6379 │                               │
│ └──────┘ └──────┘ └──────────┘ └───────┘                               │
│                                                                          │
│  Volumes: postgres_data, redis_data, traefik_certs                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### URLs de Production

| Service | URL |
|---------|-----|
| Dashboard | https://mcp-studio.ilinqsoft.com |
| API | https://api.mcp-studio.ilinqsoft.com |
| API Docs | https://api.mcp-studio.ilinqsoft.com/docs |
| Grafana | https://grafana.mcp-studio.ilinqsoft.com |
| Prometheus | https://prometheus.mcp-studio.ilinqsoft.com |

---

## Prérequis

### 1. Serveur Hetzner

- **Type**: CX21 (2 vCPU, 4GB RAM, 40GB SSD)
- **OS**: Ubuntu 22.04 LTS
- **Localisation**: Nuremberg (nbg1) ou Falkenstein (fsn1)

### 2. Domaine DNS

Configurer les enregistrements DNS suivants (type A):

```
mcp-studio.ilinqsoft.com     → <IP_SERVEUR>
api.mcp-studio.ilinqsoft.com → <IP_SERVEUR>
grafana.mcp-studio.ilinqsoft.com → <IP_SERVEUR>
prometheus.mcp-studio.ilinqsoft.com → <IP_SERVEUR>
```

### 3. Clés SSH

Générer une clé SSH pour le déploiement:

```bash
ssh-keygen -t ed25519 -C "deploy@mcp-studio" -f ~/.ssh/mcp_deploy
```

---

## Phase 1: Provisioning du Serveur

### 1.1 Créer le Serveur Hetzner

1. Se connecter à https://console.hetzner.cloud
2. Créer un nouveau projet "MCP Agent Studio"
3. Créer un serveur:
   - **Location**: Nuremberg (nbg1)
   - **Image**: Ubuntu 22.04
   - **Type**: CX21
   - **SSH Key**: Ajouter votre clé publique
   - **Name**: mcp-studio-prod

### 1.2 Configuration Initiale

Connexion au serveur:

```bash
ssh root@<IP_SERVEUR>
```

Exécuter le script de setup:

```bash
# Télécharger et exécuter le script
curl -sSL https://raw.githubusercontent.com/mbark/mcp-agent-studio/main/deploy/scripts/setup-server.sh | bash
```

Ou manuellement:

```bash
# Mise à jour système
apt update && apt upgrade -y

# Installer les paquets requis
apt install -y curl git ufw fail2ban unattended-upgrades \
  apt-transport-https ca-certificates gnupg lsb-release

# Installer Docker
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# Créer l'utilisateur deploy
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Créer le répertoire de l'application
mkdir -p /opt/mcp-agent-studio
chown deploy:deploy /opt/mcp-agent-studio

# Configurer le firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Activer Docker
systemctl enable docker
systemctl start docker
```

---

## Phase 2: Configuration des Secrets

### 2.1 Générer les Secrets

Sur votre machine locale, générer les secrets:

```bash
# JWT Secret
openssl rand -base64 32
# Exemple: K7xH2pQrMnBvCxZa9uYt4wE6sD8fGhJkLmNoPqRsTuVw=

# Encryption Key
openssl rand -hex 32
# Exemple: a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Mots de passe PostgreSQL et Redis
openssl rand -base64 24
# Exemple: dXnE7kP9mQwR3tYu2oI5aS8zF1vB4xC6

# Traefik Auth (htpasswd)
htpasswd -nb admin <votre_password>
# Exemple: admin:$apr1$xyz123..../abcdefg
```

### 2.2 Créer le fichier .env sur le serveur

```bash
ssh deploy@<IP_SERVEUR>
cd /opt/mcp-agent-studio
mkdir -p deploy
cat > deploy/.env << 'EOF'
# Domain
DOMAIN=mcp-studio.ilinqsoft.com

# PostgreSQL
POSTGRES_USER=mcp
POSTGRES_PASSWORD=<POSTGRES_PASSWORD_GENERE>
POSTGRES_DB=mcp_agent_studio

# Redis
REDIS_PASSWORD=<REDIS_PASSWORD_GENERE>

# JWT
JWT_SECRET=<JWT_SECRET_GENERE>

# Encryption
ENCRYPTION_KEY=<ENCRYPTION_KEY_GENERE>

# Traefik
TRAEFIK_AUTH=<HTPASSWD_GENERE>

# GitHub Container Registry
GITHUB_REPOSITORY=mbark/mcp-agent-studio
VERSION=latest

# Grafana (optionnel - monitoring)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<GRAFANA_PASSWORD>
EOF
chmod 600 deploy/.env
```

### 2.3 Configurer les Secrets GitHub Actions

Dans GitHub → Settings → Secrets and variables → Actions, ajouter:

| Secret | Description |
|--------|-------------|
| `DEPLOY_HOST` | IP du serveur Hetzner |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | Contenu de `~/.ssh/mcp_deploy` (clé privée) |
| `DOMAIN` | `mcp-studio.ilinqsoft.com` |

---

## Phase 3: Premier Déploiement

### 3.1 Cloner le Repository

```bash
ssh deploy@<IP_SERVEUR>
cd /opt/mcp-agent-studio
git clone https://github.com/mbark/mcp-agent-studio.git .
```

### 3.2 Configuration Traefik

Créer le fichier acme.json pour les certificats SSL:

```bash
mkdir -p deploy/traefik
touch deploy/traefik/acme.json
chmod 600 deploy/traefik/acme.json
```

### 3.3 Créer le réseau Docker

```bash
docker network create mcp-network
```

### 3.4 Démarrer les Services

```bash
# Charger l'environnement
source deploy/.env

# Pull des images
docker compose -f deploy/docker-compose.prod.yml pull

# Démarrer
docker compose -f deploy/docker-compose.prod.yml up -d

# Vérifier les logs
docker compose -f deploy/docker-compose.prod.yml logs -f
```

### 3.5 Exécuter les Migrations

```bash
docker compose -f deploy/docker-compose.prod.yml run --rm server npx prisma migrate deploy
```

### 3.6 Vérifier le Déploiement

```bash
# Health check API
curl -sf https://api.mcp-studio.ilinqsoft.com/health

# Dashboard
curl -sf https://mcp-studio.ilinqsoft.com
```

---

## Phase 4: Monitoring (Optionnel)

### 4.1 Déployer la Stack de Monitoring

```bash
# Démarrer avec la stack monitoring
docker compose -f deploy/docker-compose.prod.yml \
               -f deploy/docker-compose.monitoring.yml up -d
```

### 4.2 Configurer les Dashboards Grafana

1. Accéder à https://grafana.mcp-studio.ilinqsoft.com
2. Se connecter avec admin / <GRAFANA_PASSWORD>
3. Les datasources et dashboards sont auto-provisionnés

---

## Opérations Courantes

### Mise à jour (Déploiement)

Via GitHub Actions (automatique):
- Push sur `main` → déploiement automatique

Manuel:
```bash
ssh deploy@<IP_SERVEUR>
cd /opt/mcp-agent-studio
./deploy/scripts/deploy.sh
```

### Voir les Logs

```bash
# Tous les services
docker compose -f deploy/docker-compose.prod.yml logs -f

# Service spécifique
docker compose -f deploy/docker-compose.prod.yml logs -f server

# Dernières 100 lignes
docker compose -f deploy/docker-compose.prod.yml logs --tail=100 server
```

### Redémarrer un Service

```bash
docker compose -f deploy/docker-compose.prod.yml restart server
```

### Backup Manuel de la Base

```bash
docker compose -f deploy/docker-compose.prod.yml exec postgres \
  pg_dump -U mcp mcp_agent_studio > backup_$(date +%Y%m%d).sql
```

### Restauration

```bash
docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
  psql -U mcp mcp_agent_studio < backup_20241212.sql
```

---

## Troubleshooting

### Le certificat SSL ne fonctionne pas

1. Vérifier les DNS (propagation peut prendre jusqu'à 24h)
2. Vérifier les logs Traefik:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml logs traefik
   ```
3. Supprimer acme.json et redémarrer:
   ```bash
   rm deploy/traefik/acme.json
   touch deploy/traefik/acme.json
   chmod 600 deploy/traefik/acme.json
   docker compose -f deploy/docker-compose.prod.yml restart traefik
   ```

### Le serveur API ne répond pas

1. Vérifier les logs:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml logs server
   ```
2. Vérifier la connexion PostgreSQL:
   ```bash
   docker compose -f deploy/docker-compose.prod.yml exec postgres \
     psql -U mcp -c "SELECT 1"
   ```

### Espace disque insuffisant

```bash
# Nettoyer les images Docker non utilisées
docker image prune -af

# Nettoyer les volumes non utilisés
docker volume prune -f

# Vérifier l'espace disque
df -h
```

### Mémoire insuffisante

```bash
# Vérifier l'utilisation mémoire
free -h

# Redémarrer un service gourmand
docker compose -f deploy/docker-compose.prod.yml restart server
```

---

## Checklist de Déploiement

### Pré-déploiement

- [ ] DNS configuré et propagé
- [ ] Secrets générés
- [ ] Fichier `.env` créé sur le serveur
- [ ] Secrets GitHub Actions configurés
- [ ] Serveur provisionné avec `setup-server.sh`

### Premier Déploiement

- [ ] Repository cloné
- [ ] Réseau Docker créé
- [ ] `acme.json` créé avec permissions 600
- [ ] Services démarrés
- [ ] Migrations exécutées
- [ ] Health checks OK
- [ ] SSL fonctionnel

### Post-déploiement

- [ ] Tester le login
- [ ] Créer le premier utilisateur admin
- [ ] Configurer le monitoring (optionnel)
- [ ] Tester les backups automatiques

---

## Sécurité

### Rotation des Secrets

Tous les 90 jours:
1. Générer de nouveaux secrets
2. Mettre à jour `deploy/.env`
3. Mettre à jour GitHub Actions secrets
4. Redémarrer les services

### Mises à jour de Sécurité

Les mises à jour automatiques sont activées via `unattended-upgrades`.

Pour vérifier manuellement:
```bash
sudo apt update && sudo apt upgrade -y
```

### Audit des Accès

```bash
# Voir les connexions fail2ban
sudo fail2ban-client status sshd

# Voir les logs d'authentification
sudo tail -100 /var/log/auth.log
```
