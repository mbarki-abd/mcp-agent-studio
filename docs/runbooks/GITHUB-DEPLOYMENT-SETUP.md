# Configuration GitHub pour le Déploiement Automatique

> **Document généré par DEPLOY-CONFIG-AGENT**
>
> Date: 13 décembre 2024

---

## État Actuel

✅ **Environnement `production` créé sur GitHub**
- ID: 10624068838
- URL: https://github.com/mbarki-abd/mcp-agent-studio/deployments/activity_log?environments_filter=production

❌ **Secrets de déploiement manquants** (nécessitent une action manuelle)
❌ **Serveur Hetzner non provisionné** (prérequis)

---

## Prérequis: Provisionner le Serveur Hetzner

Avant de configurer les secrets GitHub, vous devez d'abord créer le serveur de production.

### Étape 1: Créer le serveur sur Hetzner Cloud

1. Se connecter à https://console.hetzner.cloud
2. Créer un nouveau projet "MCP Agent Studio"
3. Créer un serveur avec les specs suivantes:
   - **Type**: CX21 (2 vCPU, 4GB RAM, 40GB SSD)
   - **Image**: Ubuntu 22.04 LTS
   - **Location**: Nuremberg (nbg1) ou Falkenstein (fsn1)
   - **SSH Key**: Ajouter votre clé publique existante ou créer une nouvelle
   - **Name**: `mcp-studio-prod`

4. **NOTER L'ADRESSE IP DU SERVEUR** → Vous en aurez besoin pour les secrets GitHub

### Étape 2: Configurer le serveur

Connexion SSH:
```bash
ssh root@<IP_DU_SERVEUR>
```

Option A: Script automatique (recommandé):
```bash
curl -sSL https://raw.githubusercontent.com/mbarki-abd/mcp-agent-studio/main/deploy/scripts/setup-server.sh | bash
```

Option B: Configuration manuelle (voir `docs/runbooks/deployment.md` section 1.2)

---

## Configuration des Secrets GitHub

Une fois le serveur provisionné, configurez les secrets pour GitHub Actions.

### Accès aux Secrets GitHub

1. Aller sur: https://github.com/mbarki-abd/mcp-agent-studio/settings/secrets/actions
2. Cliquer sur "New repository secret"

### Secrets Obligatoires

| Secret Name | Valeur à Configurer | Description |
|-------------|---------------------|-------------|
| `DEPLOY_HOST` | **L'IP de votre serveur Hetzner** | Ex: `78.46.123.45` |
| `DEPLOY_USER` | `deploy` | Utilisateur SSH créé par setup-server.sh |
| `DEPLOY_SSH_KEY` | **Votre clé privée SSH** | Contenu du fichier `~/.ssh/mcp_deploy` |
| `DOMAIN` | `mcp-studio.ilinqsoft.com` | Domaine de production (optionnel, valeur par défaut existe) |

### Comment Obtenir la Clé SSH

#### Option 1: Générer une Nouvelle Clé (Recommandé)

```bash
# Générer une clé dédiée pour le déploiement
ssh-keygen -t ed25519 -C "deploy@mcp-studio" -f ~/.ssh/mcp_deploy

# Afficher la clé publique (à ajouter au serveur)
cat ~/.ssh/mcp_deploy.pub

# Afficher la clé privée (à ajouter dans GitHub Secrets)
cat ~/.ssh/mcp_deploy
```

**Important**: Copiez **TOUTE** la sortie de `cat ~/.ssh/mcp_deploy` (y compris `-----BEGIN OPENSSH PRIVATE KEY-----` et `-----END OPENSSH PRIVATE KEY-----`)

#### Option 2: Utiliser une Clé Existante

Si vous avez déjà ajouté votre clé publique au serveur Hetzner lors de la création:

```bash
# Afficher votre clé privée par défaut
cat ~/.ssh/id_ed25519
# OU
cat ~/.ssh/id_rsa
```

### Ajouter la Clé Publique au Serveur

La clé publique doit être présente sur le serveur dans `/home/deploy/.ssh/authorized_keys`.

Si vous utilisez une nouvelle clé `mcp_deploy`:

```bash
# Depuis votre machine locale
ssh-copy-id -i ~/.ssh/mcp_deploy.pub deploy@<IP_DU_SERVEUR>

# OU manuellement
cat ~/.ssh/mcp_deploy.pub | ssh root@<IP_DU_SERVEUR> \
  "mkdir -p /home/deploy/.ssh && cat >> /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh"
```

Tester la connexion:
```bash
ssh -i ~/.ssh/mcp_deploy deploy@<IP_DU_SERVEUR>
```

Si la connexion réussit sans demander de mot de passe, c'est bon !

---

## Commandes pour Ajouter les Secrets

Une fois que vous avez toutes les valeurs, vous pouvez les ajouter via CLI:

```bash
# DEPLOY_HOST
gh secret set DEPLOY_HOST --body "78.46.123.45"  # REMPLACER par votre IP

# DEPLOY_USER
gh secret set DEPLOY_USER --body "deploy"

# DEPLOY_SSH_KEY
gh secret set DEPLOY_SSH_KEY < ~/.ssh/mcp_deploy  # Ou votre clé

# DOMAIN (optionnel)
gh secret set DOMAIN --body "mcp-studio.ilinqsoft.com"
```

Ou via l'interface web GitHub (plus simple pour les clés multi-lignes):
1. Allez sur https://github.com/mbarki-abd/mcp-agent-studio/settings/secrets/actions
2. Cliquez "New repository secret"
3. Name: `DEPLOY_SSH_KEY`
4. Secret: Collez le contenu complet de `cat ~/.ssh/mcp_deploy`
5. Cliquez "Add secret"

---

## Vérification de la Configuration

### 1. Vérifier que l'environnement existe
```bash
gh api repos/mbarki-abd/mcp-agent-studio/environments
```

Devrait afficher l'environnement "production".

### 2. Vérifier que les secrets sont configurés
```bash
gh secret list
```

Devrait afficher:
```
DEPLOY_HOST     Updated 2024-12-13
DEPLOY_SSH_KEY  Updated 2024-12-13
DEPLOY_USER     Updated 2024-12-13
DOMAIN          Updated 2024-12-13
```

### 3. Tester la connexion SSH depuis GitHub Actions

Créez un test rapide:

```bash
# Déclencher un workflow manuellement
gh workflow run deploy.yml
```

Vérifiez les logs:
```bash
gh run list --workflow=deploy.yml --limit 1
gh run view <RUN_ID> --log
```

---

## Configuration DNS

Avant le premier déploiement, configurez les enregistrements DNS (type A):

| Sous-domaine | Type | Valeur |
|--------------|------|--------|
| `mcp-studio.ilinqsoft.com` | A | `<IP_SERVEUR>` |
| `api.mcp-studio.ilinqsoft.com` | A | `<IP_SERVEUR>` |
| `grafana.mcp-studio.ilinqsoft.com` | A | `<IP_SERVEUR>` |
| `prometheus.mcp-studio.ilinqsoft.com` | A | `<IP_SERVEUR>` |

**Important**: Attendez 5-30 minutes pour la propagation DNS avant le premier déploiement (pour que Let's Encrypt puisse générer les certificats SSL).

---

## Premier Déploiement

Une fois tout configuré:

### Option 1: Push sur main (automatique)
```bash
git add .
git commit -m "feat: configure deployment secrets"
git push origin main
```

Le workflow GitHub Actions se déclenche automatiquement et déploie sur le serveur.

### Option 2: Workflow manuel
```bash
gh workflow run deploy.yml
```

### Vérifier le Déploiement

```bash
# Status du workflow
gh run list --workflow=deploy.yml --limit 1

# Voir les logs
gh run view --log

# Test health check (après 2-3 minutes)
curl -sf https://api.mcp-studio.ilinqsoft.com/health
```

---

## Troubleshooting

### Erreur: "Permission denied (publickey)"

**Cause**: La clé SSH n'est pas correctement configurée.

**Solution**:
1. Vérifier que `DEPLOY_SSH_KEY` contient toute la clé (incluant BEGIN/END)
2. Vérifier que la clé publique est dans `/home/deploy/.ssh/authorized_keys`
3. Tester manuellement: `ssh -i ~/.ssh/mcp_deploy deploy@<IP>`

### Erreur: "Host key verification failed"

**Cause**: Le serveur n'est pas dans les known_hosts.

**Solution**: Le workflow GitHub Actions utilise `StrictHostKeyChecking=accept-new`, donc cela ne devrait pas arriver. Si oui, vérifier le fichier `.github/workflows/deploy.yml`.

### Erreur: "No such environment: production"

**Cause**: L'environnement n'a pas été créé.

**Solution**:
```bash
gh api repos/mbarki-abd/mcp-agent-studio/environments/production -X PUT
```

### Le certificat SSL ne se génère pas

**Causes possibles**:
1. DNS pas encore propagé → Attendre 30 minutes
2. Ports 80/443 bloqués → Vérifier `ufw status`
3. Traefik logs: `docker logs traefik`

**Solution**:
```bash
ssh deploy@<IP_SERVEUR>
docker logs traefik | grep -i "certificate"
```

---

## Checklist de Configuration

Avant le premier déploiement:

- [ ] Serveur Hetzner CX21 créé (Ubuntu 22.04)
- [ ] Adresse IP notée
- [ ] Script `setup-server.sh` exécuté sur le serveur
- [ ] Utilisateur `deploy` créé avec accès Docker
- [ ] Clé SSH générée (`~/.ssh/mcp_deploy`)
- [ ] Clé publique ajoutée au serveur (`ssh-copy-id`)
- [ ] Connexion SSH testée (`ssh deploy@<IP>`)
- [ ] Environnement GitHub "production" créé
- [ ] Secret `DEPLOY_HOST` configuré (IP du serveur)
- [ ] Secret `DEPLOY_USER` configuré (`deploy`)
- [ ] Secret `DEPLOY_SSH_KEY` configuré (clé privée complète)
- [ ] DNS configuré (A records)
- [ ] DNS propagé (vérifiable avec `nslookup mcp-studio.ilinqsoft.com`)

Une fois tout coché, lancer le déploiement:
```bash
git push origin main
```

---

## Ressources

- **Documentation complète**: `docs/runbooks/deployment.md`
- **Infos environnements**: `docs/DEPLOYMENT-INFO.md`
- **Workflow GitHub**: `.github/workflows/deploy.yml`
- **Console Hetzner**: https://console.hetzner.cloud
- **Secrets GitHub**: https://github.com/mbarki-abd/mcp-agent-studio/settings/secrets/actions
- **Deployments**: https://github.com/mbarki-abd/mcp-agent-studio/deployments

---

## Contact Support

En cas de problème:
1. Vérifier les logs GitHub Actions: `gh run view --log`
2. Vérifier les logs serveur: `ssh deploy@<IP> && docker logs mcp-server`
3. Consulter `docs/runbooks/troubleshooting.md` (si existe)

**Maintainer**: mbarki@ilinqsoft.com
