#!/bin/bash

#######################################################################
# Script de Vérification de Configuration GitHub Deployment
#
# Usage: ./deploy/scripts/verify-github-config.sh
#
# Vérifie que tous les prérequis pour le déploiement sont OK
#######################################################################

set -e

REPO="mbarki-abd/mcp-agent-studio"
REQUIRED_SECRETS=("DEPLOY_HOST" "DEPLOY_USER" "DEPLOY_SSH_KEY")

echo "========================================"
echo "  Vérification Configuration Deployment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Check 1: gh CLI installed
echo -n "1. gh CLI installé... "
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "   → Installer gh CLI: https://cli.github.com/"
    ((FAILED++))
fi

# Check 2: gh authenticated
echo -n "2. gh CLI authentifié... "
if gh auth status &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "   → Exécuter: gh auth login"
    ((FAILED++))
fi

# Check 3: Production environment exists
echo -n "3. Environnement 'production' existe... "
ENV_CHECK=$(gh api repos/$REPO/environments 2>/dev/null | grep -c '"name":"production"' || echo "0")
if [ "$ENV_CHECK" -gt 0 ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "   → Créer: gh api repos/$REPO/environments/production -X PUT"
    ((FAILED++))
fi

# Check 4: Secrets exist
echo ""
echo "4. Secrets GitHub Actions:"
gh secret list 2>/dev/null > /tmp/gh_secrets.txt || echo "" > /tmp/gh_secrets.txt

for SECRET in "${REQUIRED_SECRETS[@]}"; do
    echo -n "   - $SECRET... "
    if grep -q "$SECRET" /tmp/gh_secrets.txt; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC}"
        echo "      → Configurer: gh secret set $SECRET"
        ((FAILED++))
    fi
done

rm -f /tmp/gh_secrets.txt

# Check 5: SSH key format (si présent localement)
echo ""
echo -n "5. Clé SSH locale (~/.ssh/mcp_deploy)... "
if [ -f ~/.ssh/mcp_deploy ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))

    # Vérifier permissions
    PERMS=$(stat -c "%a" ~/.ssh/mcp_deploy 2>/dev/null || stat -f "%A" ~/.ssh/mcp_deploy 2>/dev/null)
    echo -n "   - Permissions (600)... "
    if [ "$PERMS" = "600" ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} (actuellement: $PERMS)"
        echo "      → Corriger: chmod 600 ~/.ssh/mcp_deploy"
        ((WARNINGS++))
    fi

    # Vérifier clé publique
    echo -n "   - Clé publique existe... "
    if [ -f ~/.ssh/mcp_deploy.pub ]; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠${NC}"
        echo "      → Générer: ssh-keygen -y -f ~/.ssh/mcp_deploy > ~/.ssh/mcp_deploy.pub"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} (non trouvée)"
    echo "   → Générer: ssh-keygen -t ed25519 -C 'deploy@mcp-studio' -f ~/.ssh/mcp_deploy"
    ((WARNINGS++))
fi

# Check 6: DNS configuration (si DEPLOY_HOST est configuré)
echo ""
echo -n "6. DNS configuré... "
DEPLOY_HOST=$(gh secret list 2>/dev/null | grep DEPLOY_HOST | awk '{print $1}' || echo "")
if [ -n "$DEPLOY_HOST" ]; then
    # On ne peut pas récupérer la valeur du secret, donc on avertit juste
    echo -e "${YELLOW}⚠${NC} (à vérifier manuellement)"
    echo "   → Vérifier: nslookup mcp-studio.ilinqsoft.com"
    echo "   → Doit pointer vers l'IP du serveur Hetzner"
    ((WARNINGS++))
else
    echo -e "${YELLOW}⚠${NC} (DEPLOY_HOST non configuré)"
    ((WARNINGS++))
fi

# Check 7: Workflow file exists
echo ""
echo -n "7. Workflow de déploiement existe... "
if [ -f .github/workflows/deploy.yml ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    echo "   → Fichier manquant: .github/workflows/deploy.yml"
    ((FAILED++))
fi

# Summary
echo ""
echo "========================================"
echo "           RÉSUMÉ"
echo "========================================"
echo -e "Tests réussis:   ${GREEN}$PASSED${NC}"
echo -e "Tests échoués:   ${RED}$FAILED${NC}"
echo -e "Avertissements:  ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ Configuration complète ! Prêt pour le déploiement.${NC}"
        echo ""
        echo "Pour déployer:"
        echo "  git push origin main"
        echo ""
        echo "Ou manuellement:"
        echo "  gh workflow run deploy.yml"
        exit 0
    else
        echo -e "${YELLOW}⚠ Configuration presque complète.${NC}"
        echo "Vérifiez les avertissements ci-dessus avant de déployer."
        exit 0
    fi
else
    echo -e "${RED}✗ Configuration incomplète.${NC}"
    echo "Corrigez les erreurs ci-dessus avant de déployer."
    echo ""
    echo "Guide complet: docs/runbooks/GITHUB-DEPLOYMENT-SETUP.md"
    exit 1
fi
