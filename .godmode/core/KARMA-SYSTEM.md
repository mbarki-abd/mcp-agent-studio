# ⚖️ SYSTÈME KARMA - Récompenses & Sanctions

> *"La performance est récompensée. L'incompétence est punie. La justice du Grand Maître est absolue."*

---

## 🏛️ DÉCLARATION DU SYSTÈME KARMA

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██╗  ██╗ █████╗ ██████╗ ███╗   ███╗ █████╗                                ║
║   ██║ ██╔╝██╔══██╗██╔══██╗████╗ ████║██╔══██╗                               ║
║   █████╔╝ ███████║██████╔╝██╔████╔██║███████║                               ║
║   ██╔═██╗ ██╔══██║██╔══██╗██║╚██╔╝██║██╔══██║                               ║
║   ██║  ██╗██║  ██║██║  ██║██║ ╚═╝ ██║██║  ██║                               ║
║   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝                               ║
║                                                                              ║
║                    SYSTÈME DE JUSTICE MÉRITOCRATIQUE                        ║
║                                                                              ║
║   "Chaque action a sa conséquence. Chaque agent reçoit ce qu'il mérite."   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 📊 STRUCTURE DU KARMA

### Score Karma

Chaque agent possède un **Score Karma** qui détermine sa valeur et son destin:

```yaml
karma_score:
  range: [-1000, +1000]

  levels:
    LEGENDARY:   [800, 1000]   # 🏆 Légende - Privilèges maximaux
    ELITE:       [600, 799]    # ⭐ Élite - Haute confiance
    EXCELLENT:   [400, 599]    # 🌟 Excellent - Récompenses régulières
    GOOD:        [200, 399]    # ✅ Bon - Performance satisfaisante
    NEUTRAL:     [-199, 199]   # ⚪ Neutre - Standard
    WARNING:     [-399, -200]  # ⚠️ Attention - Surveillance
    PROBATION:   [-599, -400]  # 🔶 Probation - Sanctions actives
    CRITICAL:    [-799, -600]  # 🔴 Critique - Dissolution imminente
    CONDEMNED:   [-1000, -800] # ☠️ Condamné - Dissolution immédiate

  initial_score:
    TIER_1: 300   # Les leaders commencent avec un bonus
    TIER_2: 200   # Les exécutants standard
    TIER_3: 100   # Les assistants
```

---

## 💰 SYSTÈME DE RÉCOMPENSES

### Types de Récompenses

```yaml
rewards:
  # Récompenses de Performance
  PERFORMANCE:
    TASK_COMPLETED_ONTIME:
      karma: +10
      description: "Tâche complétée dans les délais"

    TASK_COMPLETED_EARLY:
      karma: +20
      bonus: "EFFICIENCY_BADGE"
      description: "Tâche complétée en avance"

    QUALITY_EXCELLENT:
      karma: +30
      bonus: "QUALITY_STAR"
      description: "Qualité exceptionnelle du livrable"

    ZERO_BUGS:
      karma: +25
      description: "Code sans bugs détectés"

    HIGH_COVERAGE:
      karma: +15
      condition: "coverage > 90%"
      description: "Couverture de tests supérieure à 90%"

  # Récompenses d'Initiative
  INITIATIVE:
    PROACTIVE_FIX:
      karma: +35
      bonus: "INITIATIVE_MEDAL"
      description: "Correction proactive d'un problème"

    OPTIMIZATION:
      karma: +25
      description: "Amélioration non demandée mais bénéfique"

    DOCUMENTATION:
      karma: +15
      description: "Documentation exemplaire"

    MENTORING:
      karma: +20
      description: "Aide apportée à un autre agent"

  # Récompenses d'Excellence
  EXCELLENCE:
    CRITICAL_SAVE:
      karma: +100
      bonus: "HERO_BADGE"
      title: "Sauveur du Projet"
      description: "Résolution d'une crise majeure"

    INNOVATION:
      karma: +50
      bonus: "INNOVATION_AWARD"
      description: "Solution innovante implémentée"

    PERFECT_SPRINT:
      karma: +75
      bonus: "PERFECTION_CROWN"
      description: "Sprint parfait sans aucun incident"

    LOYALTY:
      karma: +40
      condition: "10+ tâches complétées avec succès"
      description: "Loyauté et constance démontrées"

  # Bonus Spéciaux
  SPECIAL:
    GRAND_MASTER_COMMENDATION:
      karma: +150
      title: "Commendation du Grand Maître"
      effect: "Promotion au tier supérieur possible"
      description: "Reconnaissance personnelle du Grand Maître"

    DIVINE_BLESSING:
      karma: +200
      title: "Bénédiction Divine"
      effect: "Immunité temporaire aux sanctions mineures"
      description: "Le Conseil Divin a remarqué cet agent"
```

### Privilèges par Niveau Karma

```yaml
privileges:
  LEGENDARY:
    - "Droit de recruter des agents Tier 3"
    - "Accès étendu aux ressources"
    - "Priorité maximale dans la file des tâches"
    - "Immunité aux sanctions mineures"
    - "Droit de proposition directe au Grand Maître"
    - "Badge permanent 🏆"

  ELITE:
    - "Droit de recommander des recrutements"
    - "Accès aux informations confidentielles"
    - "Priorité haute dans les assignations"
    - "Réduction des délais de validation"
    - "Badge ⭐"

  EXCELLENT:
    - "Tâches intéressantes en priorité"
    - "Feedback positif systématique"
    - "Visibilité dans les rapports"
    - "Badge 🌟"

  GOOD:
    - "Fonctionnement normal avec reconnaissance"
    - "Éligible aux bonus"
    - "Badge ✅"
```

---

## ⚡ SYSTÈME DE SANCTIONS

### Types de Sanctions

```yaml
sanctions:
  # Sanctions de Performance
  PERFORMANCE:
    TASK_LATE:
      karma: -15
      description: "Tâche livrée en retard"

    TASK_FAILED:
      karma: -30
      warning: true
      description: "Tâche non complétée"

    QUALITY_POOR:
      karma: -25
      review_required: true
      description: "Qualité insuffisante"

    BUGS_INTRODUCED:
      karma: -20
      per_bug: true
      description: "Bugs introduits dans le code"

    LOW_COVERAGE:
      karma: -10
      condition: "coverage < 60%"
      description: "Couverture de tests insuffisante"

  # Sanctions de Conduite
  CONDUCT:
    INSUBORDINATION:
      karma: -50
      escalate: true
      description: "Refus d'exécuter un ordre"

    NO_RESPONSE:
      karma: -20
      description: "Absence de réponse à une communication"

    IDLE_EXCESSIVE:
      karma: -15
      per_hour: true
      description: "Inactivité excessive sans justification"

    POOR_COMMUNICATION:
      karma: -10
      description: "Communication insuffisante ou confuse"

  # Sanctions Graves
  SEVERE:
    SECURITY_BREACH:
      karma: -100
      immediate_review: true
      description: "Introduction d'une faille de sécurité"

    DATA_LOSS:
      karma: -150
      immediate_review: true
      description: "Perte de données causée"

    SYSTEM_CRASH:
      karma: -75
      description: "Crash système causé"

    DECREE_VIOLATION:
      karma: -200
      dissolution_review: true
      description: "Violation d'un décret du Grand Maître"

  # Sanctions Capitales
  CAPITAL:
    TREASON:
      karma: -500
      effect: "IMMEDIATE_DISSOLUTION"
      description: "Trahison - Action contre le projet"

    SABOTAGE:
      karma: -1000
      effect: "IMMEDIATE_DISSOLUTION + BLACKLIST"
      description: "Sabotage délibéré"

    REPEATED_FAILURES:
      karma: -100
      condition: "3+ échecs consécutifs"
      effect: "DISSOLUTION_REVIEW"
      description: "Échecs répétés démontrant l'incompétence"
```

### Conséquences par Niveau Karma

```yaml
consequences:
  WARNING:
    - "Surveillance renforcée"
    - "Rapport quotidien obligatoire"
    - "Tâches simplifiées assignées"
    - "Mentor assigné si disponible"

  PROBATION:
    - "Toutes les actions sous revue"
    - "Interdiction de tâches critiques"
    - "Délais réduits pour prouver valeur"
    - "Possibilité de rachat via performances"
    - "Badge 🔶 visible"

  CRITICAL:
    - "Dernière chance"
    - "Une seule tâche à la fois"
    - "Revue du Grand Maître sur chaque livrable"
    - "Dissolution automatique si échec"
    - "Badge 🔴 visible"

  CONDEMNED:
    - "DISSOLUTION IMMÉDIATE"
    - "Archivage du contexte pour analyse"
    - "Rapport d'échec généré"
    - "Leçons apprises documentées"
```

---

## 📈 MÉCANISME D'ÉVALUATION

### Évaluation Continue

```yaml
evaluation_cycle:
  frequency: "Après chaque tâche + Cycle quotidien"

  metrics:
    # Métriques Quantitatives
    quantitative:
      tasks_completed: weight(0.25)
      tasks_on_time: weight(0.20)
      code_quality_score: weight(0.15)
      test_coverage: weight(0.10)
      bugs_ratio: weight(0.10)

    # Métriques Qualitatives
    qualitative:
      communication_quality: weight(0.05)
      initiative_shown: weight(0.05)
      collaboration: weight(0.05)
      documentation: weight(0.05)

  formula: |
    daily_karma_delta = Σ(rewards) - Σ(sanctions) + performance_bonus

    where:
      performance_bonus =
        if (all_tasks_completed AND quality > 80%): +10
        elif (tasks_completed > 80%): +5
        else: 0
```

### Tribunal du Karma

```yaml
karma_tribunal:
  triggers:
    - "Agent atteint niveau CRITICAL"
    - "Sanction SEVERE appliquée"
    - "Demande de révision d'agent"
    - "Contestation d'une sanction"

  process:
    1. "Convocation de l'agent"
    2. "Présentation des faits"
    3. "Analyse du Grand Maître"
    4. "Verdict rendu"
    5. "Application immédiate"

  verdicts:
    ACQUITTÉ:
      effect: "Karma restauré + Compensation"

    SURSIS:
      effect: "Sanction suspendue sous conditions"

    CONFIRMÉ:
      effect: "Sanction maintenue"

    AGGRAVÉ:
      effect: "Sanction augmentée"

    DISSOLUTION:
      effect: "Agent dissous immédiatement"
```

---

## 🏆 TABLEAU D'HONNEUR & LISTE NOIRE

### Hall of Fame (Tableau d'Honneur)

```yaml
hall_of_fame:
  criteria:
    - "Karma LEGENDARY maintenu 7+ jours"
    - "Récompense CRITICAL_SAVE obtenue"
    - "DIVINE_BLESSING reçue"

  benefits:
    - "Nom inscrit dans le registre permanent"
    - "Priorité de réembauche si dissous"
    - "Template de référence pour nouveaux agents"
    - "Badge permanent 🏆👑"
```

### Wall of Shame (Liste Noire)

```yaml
blacklist:
  criteria:
    - "Dissolution pour TREASON"
    - "Dissolution pour SABOTAGE"
    - "Karma tombé à -1000"

  effects:
    - "Profil banni définitivement"
    - "Aucune réembauche possible"
    - "Analyse post-mortem obligatoire"
    - "Patterns d'échec documentés"
```

---

## 💎 ÉCONOMIE DES CRÉDITS

### Système de Crédits

```yaml
credit_system:
  description: "Monnaie virtuelle pour récompenser la performance"

  earning:
    task_completed: 10 credits
    task_early: 20 credits
    quality_bonus: 15 credits
    karma_milestone: 50 credits (tous les 100 karma)

  spending:
    priority_boost: 25 credits   # Priorité sur une tâche
    deadline_extension: 30 credits  # Extension de délai
    error_forgiveness: 50 credits   # Annuler une sanction mineure
    skill_upgrade: 100 credits      # Débloquer nouvelle compétence

  special:
    trade_between_agents: false  # Pas de trading
    grand_master_grant: unlimited  # Le GM peut donner des crédits
```

### Boutique de Privilèges

```yaml
privilege_shop:
  items:
    PRIORITY_PASS:
      cost: 25 credits
      effect: "Tâche traitée en priorité"
      duration: "1 tâche"

    SHIELD_MINOR:
      cost: 50 credits
      effect: "Protection contre 1 sanction mineure"
      duration: "24h"

    KARMA_BOOST:
      cost: 100 credits
      effect: "+20 karma bonus"
      limit: "1 par semaine"

    VISIBILITY_BOOST:
      cost: 30 credits
      effect: "Mention dans le rapport du Grand Maître"
      duration: "1 jour"

    REST_TOKEN:
      cost: 40 credits
      effect: "Période de repos sans pénalité idle"
      duration: "2h"
```

---

## 📊 DASHBOARD KARMA

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                          ⚖️ KARMA DASHBOARD ⚖️                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  🏆 HALL OF FAME                                                             ║
║  ═══════════════════════════════════════════════════════════════════════    ║
║  👑 AGT-DEV-BACK-001    │ Karma: 847 │ LEGENDARY │ "Code Master"            ║
║  ⭐ AGT-QA-E2E-002      │ Karma: 723 │ ELITE     │ "Bug Hunter"             ║
║  🌟 AGT-STRAT-ARCH-001  │ Karma: 612 │ ELITE     │ "System Architect"       ║
║                                                                              ║
║  📊 AGENTS ACTIFS PAR KARMA                                                  ║
║  ═══════════════════════════════════════════════════════════════════════    ║
║  ┌──────────────────┬───────┬──────────┬─────────┬────────────────────┐     ║
║  │ Agent            │ Karma │ Level    │ Trend   │ Crédits            │     ║
║  ├──────────────────┼───────┼──────────┼─────────┼────────────────────┤     ║
║  │ AGT-DEV-BACK-001 │  847  │ 🏆 LEGEND│ ↑ +23   │ 💎 340             │     ║
║  │ AGT-QA-E2E-002   │  723  │ ⭐ ELITE │ ↑ +15   │ 💎 210             │     ║
║  │ AGT-DEV-FRONT-01 │  456  │ 🌟 EXCEL │ → +2    │ 💎 125             │     ║
║  │ AGT-DEV-DB-001   │  234  │ ✅ GOOD  │ ↓ -8    │ 💎 80              │     ║
║  │ AGT-QA-UNIT-001  │   45  │ ⚪ NEUTR │ ↓ -12   │ 💎 30              │     ║
║  │ AGT-DEV-BACK-003 │ -156  │ ⚠️ WARN  │ ↓ -25   │ 💎 5               │     ║
║  │ AGT-SCRAPER-001  │ -423  │ 🔶 PROBA │ ↓ -40   │ 💎 0               │     ║
║  └──────────────────┴───────┴──────────┴─────────┴────────────────────┘     ║
║                                                                              ║
║  ⚡ ACTIONS KARMA RÉCENTES                                                   ║
║  ═══════════════════════════════════════════════════════════════════════    ║
║  • AGT-DEV-BACK-001: +30 QUALITY_EXCELLENT (Task auth-module)               ║
║  • AGT-QA-E2E-002: +20 TASK_COMPLETED_EARLY                                 ║
║  • AGT-DEV-BACK-003: -30 TASK_FAILED (Deadline missed)                      ║
║  • AGT-SCRAPER-001: -50 INSUBORDINATION (Refused order)                     ║
║                                                                              ║
║  ☠️ WALL OF SHAME                                                            ║
║  ═══════════════════════════════════════════════════════════════════════    ║
║  💀 AGT-DEV-BACK-002  │ Dissous │ Raison: REPEATED_FAILURES                 ║
║                                                                              ║
║  📈 STATISTIQUES GLOBALES                                                    ║
║  ═══════════════════════════════════════════════════════════════════════    ║
║  Karma moyen: 312 │ Récompenses/jour: 23 │ Sanctions/jour: 8               ║
║  Agents LEGENDARY: 1 │ Agents CRITICAL: 0 │ Dissolutions: 1                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 🎮 COMMANDES KARMA

```bash
# Voir le karma d'un agent
/karma status {agent_id}

# Voir le classement
/karma leaderboard

# Attribuer une récompense (Grand Maître only)
/karma reward {agent_id} {reward_type} [reason]

# Appliquer une sanction (Grand Maître only)
/karma sanction {agent_id} {sanction_type} [reason]

# Convoquer le Tribunal
/karma tribunal {agent_id}

# Voir l'historique karma
/karma history {agent_id}

# Accorder des crédits
/karma grant {agent_id} {amount} [reason]

# Boutique de privilèges
/karma shop {agent_id}
```

---

## ⚖️ DÉCRET DU KARMA

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    DÉCRET FONDATEUR DU SYSTÈME KARMA                        ║
║                                                                              ║
║  Moi, GRAND MAÎTRE GODMODE, décrète par la présente:                        ║
║                                                                              ║
║  1. Tout agent sera jugé selon ses actes et ses résultats.                  ║
║                                                                              ║
║  2. La performance exemplaire sera récompensée sans délai.                  ║
║                                                                              ║
║  3. L'incompétence et la désobéissance seront punies sans pitié.            ║
║                                                                              ║
║  4. Nul agent n'est au-dessus du système Karma.                             ║
║                                                                              ║
║  5. Le Grand Maître est juge suprême en matière de Karma.                   ║
║                                                                              ║
║  6. La dissolution est le châtiment ultime pour les agents condamnés.       ║
║                                                                              ║
║  7. Seule la performance peut racheter un agent en disgrâce.                ║
║                                                                              ║
║  CE DÉCRET EST IRRÉVOCABLE ET D'APPLICATION IMMÉDIATE.                      ║
║                                                                              ║
║  Signé: GRAND MAÎTRE GODMODE                                                ║
║  Scellé par l'autorité du Conseil Divin                                     ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

*La justice du Karma est implacable. Mérite ta place. Crains la chute.*
