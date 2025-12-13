# Déploiement en Production - Quick Start

> **Guide rapide pour déployer MCP Agent Studio sur Hetzner**

---

## Statut Actuel

✅ Environnement GitHub `production` créé
❌ Secrets de déploiement manquants
❌ Serveur Hetzner non provisionné

---

## Étapes Rapides

### 1. Provisionner le Serveur Hetzner (10 min)

1. Aller sur https://console.hetzner.cloud
2. Créer un serveur:
   - **Type**: CX21 (2 vCPU, 4GB RAM)
   - **Image**: Ubuntu 22.04 LTS
   - **Location**: Nuremberg
   - **Name**: `mcp-studio-prod`
3. **NOTER L'IP DU SERVEUR**

### 2. Configurer le Serveur (5 min)

```bash
# Se connecter au serveur
ssh root@<IP_DU_SERVEUR>

# Exécuter le script de setup
curl -sSL https://raw.githubusercontent.com/mbarki-abd/mcp-agent-studio/main/deploy/scripts/setup-server.sh | bash

# Se déconnecter
exit
```

### 3. Configurer la Clé SSH (2 min)

```bash
# Générer une clé dédiée
ssh-keygen -t ed25519 -C "deploy@mcp-studio" -f ~/.ssh/mcp_deploy

# Copier la clé publique sur le serveur
ssh-copy-id -i ~/.ssh/mcp_deploy.pub deploy@<IP_DU_SERVEUR>

# Tester la connexion
ssh -i ~/.ssh/mcp_deploy deploy@<IP_DU_SERVEUR>
# Si ça marche sans mot de passe → OK !
```

### 4. Configurer les Secrets GitHub (3 min)

```bash
# Secret 1: IP du serveur
gh secret set DEPLOY_HOST --body "<IP_DU_SERVEUR>"

# Secret 2: Utilisateur
gh secret set DEPLOY_USER --body "deploy"

# Secret 3: Clé SSH (toute la clé privée)
gh secret set DEPLOY_SSH_KEY < ~/.ssh/mcp_deploy

# Secret 4: Domaine (optionnel)
gh secret set DOMAIN --body "mcp-studio.ilinqsoft.com"
```

### 5. Configurer DNS (2 min)

Chez votre registrar (ex: Cloudflare, OVH, etc.), ajouter les enregistrements A:

| Nom | Type | Valeur |
|-----|------|--------|
| `mcp-studio.ilinqsoft.com` | A | `<IP_DU_SERVEUR>` |
| `api.mcp-studio.ilinqsoft.com` | A | `<IP_DU_SERVEUR>` |

**Attendre 5-30 minutes** pour la propagation DNS.

### 6. Déployer ! (2 min)

```bash
# Pousser sur main (déclenche le workflow automatique)
git push origin main

# Ou déclencher manuellement
gh workflow run deploy.yml

# Suivre le déploiement
gh run list --workflow=deploy.yml --limit 1
gh run view --log
```

### 7. Vérifier (1 min)

Après 3-5 minutes:

```bash
# Health check API
curl -sf https://api.mcp-studio.ilinqsoft.com/health

# Devrait afficher: {"status":"ok",...}
```

Puis ouvrir dans le navigateur:
- https://mcp-studio.ilinqsoft.com (Dashboard)
- https://api.mcp-studio.ilinqsoft.com/docs (API Docs)

---

## Vérification Automatique

Avant de déployer, vérifiez que tout est OK:

```bash
./deploy/scripts/verify-github-config.sh
```

Ce script vérifie:
- ✓ gh CLI installé et authentifié
- ✓ Environnement `production` créé
- ✓ Secrets configurés
- ✓ Clé SSH présente et permissions correctes
- ⚠ DNS configuré (vérification manuelle)

---

## En Cas de Problème

### Le workflow échoue avec "Permission denied"

→ La clé SSH n'est pas correcte. Vérifier:
```bash
# Tester manuellement
ssh -i ~/.ssh/mcp_deploy deploy@<IP_DU_SERVEUR>

# Re-configurer le secret
gh secret set DEPLOY_SSH_KEY < ~/.ssh/mcp_deploy
```

### Le certificat SSL ne se génère pas

→ DNS pas encore propagé. Vérifier:
```bash
nslookup mcp-studio.ilinqsoft.com
# Devrait afficher l'IP du serveur
```

Attendre 30 minutes et relancer le déploiement.

### Erreur "No such environment: production"

→ Créer l'environnement:
```bash
gh api repos/mbarki-abd/mcp-agent-studio/environments/production -X PUT
```

---

## Documentation Complète

Pour plus de détails, consulter:
- **Guide complet**: `docs/runbooks/GITHUB-DEPLOYMENT-SETUP.md`
- **Déploiement manuel**: `docs/runbooks/deployment.md`
- **Infos environnements**: `docs/DEPLOYMENT-INFO.md`

---

## Temps Total

| Étape | Durée |
|-------|-------|
| Provisionner serveur | 10 min |
| Setup serveur | 5 min |
| Clé SSH | 2 min |
| Secrets GitHub | 3 min |
| DNS | 2 min (+ 30 min propagation) |
| Déploiement | 5 min |
| **TOTAL** | **~30 min** (actif) + 30 min (attente DNS) |

---

Prêt à déployer ? Commencez par l'étape 1 ! 🚀
