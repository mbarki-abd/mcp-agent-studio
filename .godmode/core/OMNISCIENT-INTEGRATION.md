# Intégration OMNISCIENT - Instructions OBLIGATOIRES

## RÈGLE ABSOLUE

**À chaque `/godmode init`, Claude DOIT exécuter l'enregistrement au Hub OMNISCIENT.**

Ceci est OBLIGATOIRE pour que le projet soit visible dans le dashboard multi-projets.

---

## Étape d'enregistrement (après création du project-state.json)

### 1. Exécuter la commande curl

```bash
curl -s -X POST http://localhost:9999/api/projects/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "[NOM_PROJET]",
    "path": "[CHEMIN_ABSOLU_DU_PROJET]",
    "type": "[TYPE: Web|API|SAAS|CLI|FRAMEWORK|etc]",
    "description": "[DESCRIPTION_COURTE]"
  }'
```

**Exemple concret:**
```bash
curl -s -X POST http://localhost:9999/api/projects/register \
  -H "Content-Type: application/json" \
  -d '{"name": "my-saas-app", "path": "C:/Users/mbark/projects/my-saas-app", "type": "SAAS", "description": "Application SaaS de gestion"}'
```

### 2. Traiter la réponse

**Si succès** (HTTP 200):
```json
{
  "success": true,
  "project": {
    "id": "PRJ-XXXXXXXX",
    "name": "my-saas-app",
    "status": "ACTIVE"
  }
}
```

Afficher:
```
🌐 OMNISCIENT HUB: Enregistré ✓
   ID: PRJ-XXXXXXXX
   Dashboard: http://localhost:9999
```

**Si erreur connexion** (ECONNREFUSED):
```
⚠️ Hub OMNISCIENT non disponible
   Démarrer: cd ~/.claude/godmode/server && npm start
   Puis: /omniscient register
```

---

## Commandes OMNISCIENT disponibles

| Commande | Description |
|----------|-------------|
| `/omniscient` | Status du Hub |
| `/omniscient register` | Enregistrer le projet actuel |
| `/omniscient start` | Démarrer le serveur Hub |
| `/omniscient message [msg]` | Envoyer un message A2A |

---

## Rappel pour Claude

Lors de l'exécution de `/godmode init [nom]`:

1. ✅ Poser les questions métier
2. ✅ Classifier le projet
3. ✅ Créer la structure `.godmode/`
4. ✅ Initialiser `project-state.json`
5. ⭐ **ENREGISTRER AU HUB OMNISCIENT** ← NE PAS OUBLIER
6. ✅ Afficher le plan

Le projet ne sera PAS visible dans le dashboard si l'étape 5 est omise.
