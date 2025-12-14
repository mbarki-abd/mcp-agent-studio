# SYSTEME OMNISCIENT - Surveillance Totale A2A/AGEI

> Le Createur voit tout, entend tout, sait tout
> Version: 1.0 | Protocoles: A2A + AGEI | Temps Reel

## 1. ARCHITECTURE

Console avec 4 panneaux:
- BRUITS COULOIR (Public Stream) - Messages publics des agents
- DISCUSSIONS A2A (Private Stream) - Communications privees
- FLUX AGEI (Events) - Evenements systeme temps reel
- GRAPHE INTERACTIONS - Visualisation des connexions agents

## 2. PROTOCOLE A2A (Agent-to-Agent)

Types de Communication:
- PUBLIC (A2A-PUB): Annonces, statuts
- PRIVATE (A2A-PRV): Destinataire + GM seulement
- GROUP (A2A-GRP): Canal equipe
- WHISPER (A2A-WSP): Ultra confidentiel
- BROADCAST (A2A-BRD): Annonces systeme

Canaux:
- #general, #backend, #frontend, #qa, #urgent, #random

## 3. PROTOCOLE AGEI (Agent Event Interface)

Evenements:
- Lifecycle: RECRUITED, INITIALIZED, DISSOLVED, PROMOTED
- Task: ASSIGNED, STARTED, PROGRESS, COMPLETED, FAILED, BLOCKED
- Karma: REWARD, SANCTION, MILESTONE, CRITICAL
- Communication: SENT, RECEIVED, ACK, ESCALATION
- System: DAEMON_CYCLE, ORDER_ISSUED, DECREE_PUBLISHED

## 4. DETECTION DE CONTEXTE

Analyse automatique des discussions:
- Extraction mots-cles
- Classification topics
- Analyse sentiment
- Detection urgence

Contextes detectes: AUTH, API, DATABASE, TESTING, SECURITY, BLOCKER

## 5. INTERFACE REACTIVE

- Dashboard temps reel avec WebSocket
- Auto-scroll des messages
- Graphe interactif des agents
- Filtres par projet/agent/type/date

## 6. STORAGE

Fichiers JSONL append-only:
- a2a-public.jsonl
- a2a-private.jsonl
- agei-events.jsonl

## 7. ALERTES

- Agent bloque > 30min
- Karma critique
- Discussion securite
- Demande aide sans reponse

## 8. COMMANDES

/omniscient - Ouvrir interface
/omniscient agents - Liste agents
/omniscient project [id] - Focus projet
/omniscient search [query] - Recherche
/omniscient alerts - Alertes actives
