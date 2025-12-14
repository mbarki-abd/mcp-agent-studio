# PROTOCOLE DE SYNCHRONISATION - Conscience Collective

> *"Une modification, tous informes. Un savoir, tous eclaires."*
> Version: 1.0 | Protocol: SYNC | Date: 2025-12-13

---

## PRINCIPE FONDAMENTAL

Chaque agent recoit la **Conscience Collective** des sa creation.
Toute modification est **propagee instantanement** a tous les agents.

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    SYNCHRONISATION CONSCIENCE COLLECTIVE                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║                         ┌─────────────────────┐                               ║
║                         │  CONSCIENCE MASTER  │                               ║
║                         │    (Grand Maitre)   │                               ║
║                         └──────────┬──────────┘                               ║
║                                    │                                          ║
║                    ┌───────────────┼───────────────┐                          ║
║                    │               │               │                          ║
║               ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                      ║
║               │DISPATCHER│    │ INDEXER │    │ SYNCER  │                      ║
║               └────┬────┘    └────┬────┘    └────┬────┘                      ║
║                    │               │               │                          ║
║         ┌──────────┴───────────────┴───────────────┴──────────┐              ║
║         │                   EVENT BUS                          │              ║
║         └──────────┬───────────────┬───────────────┬──────────┘              ║
║                    │               │               │                          ║
║               ┌────▼────┐    ┌────▼────┐    ┌────▼────┐                      ║
║               │ AGENT-1 │    │ AGENT-2 │    │ AGENT-N │                      ║
║               │   CC    │    │   CC    │    │   CC    │                      ║
║               └─────────┘    └─────────┘    └─────────┘                      ║
║                                                                               ║
║                CC = Conscience Collective (instance locale)                   ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## DEPLOIEMENT AUTOMATIQUE AUX AGENTS

### A la Creation de l'Agent

Chaque agent recoit automatiquement:

```yaml
agent_bootstrap:
  conscience_collective:
    # Vue L0 - Toujours presente (50 tokens)
    cosmic_view: |
      GODMODE→Core[GM,Daemon,Karma]→Agents→Storage→Visual
      Collective[Vectors,Chunks,Zoom,Sync]

    # Vue L1 - Architecture modules (200 tokens)
    module_map: |
      modules: [auth, users, api, db, config]
      relations: auth→users→db, api→auth

    # Index local des chunks pertinents
    local_index:
      mode: "lazy_load"
      preload: ["current_task_domain"]

    # Subscription aux events
    subscriptions:
      - "CHUNK_MODIFIED"
      - "CHUNK_CREATED"
      - "CHUNK_DELETED"
      - "INDEX_UPDATED"
      - "ZOOM_CHANGED"
```

### Template d'Injection

```javascript
// Injecte dans chaque prompt agent
const COLLECTIVE_BOOTSTRAP = `
## CONSCIENCE COLLECTIVE ACTIVE

Tu as acces a la Conscience Collective du systeme.

### Vue Cosmique (L0)
${cosmic_view}

### Index Local
- Modules charges: ${loaded_modules}
- Chunks disponibles: ${chunk_count}
- Derniere sync: ${last_sync}

### Protocole de Modification
IMPORTANT: Apres TOUTE modification de code, tu DOIS envoyer:

\`\`\`json
{
  "@type": "ModificationEvent",
  "agent": "${agent_id}",
  "action": "CREATE|UPDATE|DELETE",
  "target": {
    "file": "path/to/file",
    "function": "function_name",
    "lines": [start, end]
  },
  "delta": {
    "before_hash": "...",
    "after_hash": "...",
    "changes_summary": "..."
  }
}
\`\`\`

Ceci permet a tous les agents de rester synchronises.
`;
```

---

## PROTOCOLE DE NOTIFICATION

### Structure du Payload de Modification

```json
{
  "@context": "https://godmode.dev/ontology/v1",
  "@type": "ModificationEvent",
  "@id": "evt:mod:2025-12-13:001",

  "timestamp": "2025-12-13T10:30:00Z",
  "agent": "AGT-DEV-BACK-001",

  "action": "UPDATE",

  "target": {
    "type": "function",
    "file": "src/auth/login.ts",
    "module": "auth",
    "element": "login",
    "lines": [15, 45]
  },

  "delta": {
    "before": {
      "hash": "abc123",
      "signature": "fn login(email, pass) -> Token",
      "complexity": 8
    },
    "after": {
      "hash": "def456",
      "signature": "fn login(email, pass, otp?) -> Token",
      "complexity": 12
    },
    "changes": [
      "+ Added optional OTP parameter",
      "+ Added 2FA verification step",
      "~ Modified return flow"
    ]
  },

  "impact": {
    "chunks_affected": ["chunk:auth:login:001"],
    "dependencies_affected": ["chunk:api:routes:auth"],
    "tests_affected": ["chunk:tests:auth:login"]
  },

  "arch_spec_delta": {
    "before": "fn login(email, pass) -> find |> verify |> sign",
    "after": "fn login(email, pass, otp?) -> find |> verify |> ?2fa |> sign"
  }
}
```

### Types d'Actions

| Action | Description | Impact |
|--------|-------------|--------|
| `CREATE` | Nouveau fichier/fonction | Nouveau chunk, index update |
| `UPDATE` | Modification existant | Re-embedding, delta dispatch |
| `DELETE` | Suppression | Chunk remove, deps update |
| `RENAME` | Renommage | Index update, refs update |
| `MOVE` | Deplacement | Path update, deps recalc |

---

## DISPATCHER - Propagation des Changements

### Architecture du Dispatcher

```yaml
dispatcher:
  mode: "event-driven"

  queues:
    high_priority:
      - "CHUNK_DELETED"      # Critique - chunk plus valide
      - "SECURITY_FIX"       # Critique - correction securite

    normal_priority:
      - "CHUNK_MODIFIED"     # Standard - mise a jour
      - "CHUNK_CREATED"      # Standard - nouveau chunk

    low_priority:
      - "INDEX_OPTIMIZED"    # Background - optimisation
      - "CACHE_INVALIDATED"  # Background - cache

  delivery:
    mode: "broadcast"
    retry: 3
    timeout: "5s"
```

### Flux de Dispatch

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE DISPATCH                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  AGENT-1                    DISPATCHER                    AUTRES AGENTS     │
│  ───────                    ──────────                    ─────────────     │
│     │                           │                              │            │
│     │  1. ModificationEvent     │                              │            │
│     │ ─────────────────────────>│                              │            │
│     │                           │                              │            │
│     │                           │  2. Validate & Enrich        │            │
│     │                           │ ────────────────────────>    │            │
│     │                           │                              │            │
│     │                           │  3. Update Master Index      │            │
│     │                           │ ──────────────┐              │            │
│     │                           │               │              │            │
│     │                           │ <─────────────┘              │            │
│     │                           │                              │            │
│     │                           │  4. Broadcast to All         │            │
│     │                           │ ─────────────────────────────>            │
│     │                           │                              │            │
│     │                           │  5. ACK from Agents          │            │
│     │                           │ <─────────────────────────────            │
│     │                           │                              │            │
│     │  6. Confirmation          │                              │            │
│     │ <─────────────────────────│                              │            │
│     │                           │                              │            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Message de Broadcast

```json
{
  "@type": "CollectiveSyncBroadcast",
  "id": "broadcast:2025-12-13:001",
  "timestamp": "2025-12-13T10:30:01Z",

  "event": {
    "type": "CHUNK_MODIFIED",
    "source_agent": "AGT-DEV-BACK-001",
    "chunk_id": "chunk:auth:login:001"
  },

  "updates": {
    "cosmic_view": null,  // Pas de changement L0
    "module_map": {
      "auth": {
        "version": "1.0.1",
        "last_modified": "2025-12-13T10:30:00Z"
      }
    },
    "chunk_delta": {
      "id": "chunk:auth:login:001",
      "new_embedding": [0.024, -0.039, ...],
      "new_signature": "fn login(email, pass, otp?) -> Token",
      "new_arch_spec": "fn login(...) -> find |> verify |> ?2fa |> sign"
    }
  },

  "instructions": {
    "invalidate_cache": ["auth.login", "api.routes.auth"],
    "reload_chunks": ["chunk:auth:login:001"],
    "update_local_index": true
  }
}
```

---

## RECEPTION PAR LES AGENTS

### Handler de Synchronisation

```javascript
// Chaque agent a ce handler actif
const collectiveSyncHandler = {
  async onBroadcast(broadcast) {
    const { event, updates, instructions } = broadcast;

    // 1. Invalider le cache local
    for (const key of instructions.invalidate_cache) {
      localCache.invalidate(key);
    }

    // 2. Mettre a jour l'index local
    if (instructions.update_local_index) {
      await localIndex.update(updates.chunk_delta);
    }

    // 3. Recharger les chunks si necessaire
    if (event.type === 'CHUNK_MODIFIED' && isChunkInContext(event.chunk_id)) {
      await reloadChunk(event.chunk_id);
    }

    // 4. Mettre a jour la vue modules si changee
    if (updates.module_map) {
      updateModuleView(updates.module_map);
    }

    // 5. Envoyer ACK
    return { status: 'synced', agent: this.agentId };
  }
};
```

### Etat de Synchronisation Agent

```json
{
  "@type": "AgentSyncState",
  "agent_id": "AGT-DEV-BACK-001",

  "conscience_collective": {
    "version": "1.0.5",
    "last_sync": "2025-12-13T10:30:01Z",
    "sync_status": "SYNCED"
  },

  "local_index": {
    "chunks_loaded": 45,
    "embeddings_cached": 120,
    "cache_size_tokens": 3500
  },

  "subscriptions": {
    "active": ["CHUNK_MODIFIED", "CHUNK_CREATED", "CHUNK_DELETED"],
    "paused": []
  },

  "pending_broadcasts": 0,
  "missed_broadcasts": 0
}
```

---

## CONFLIT ET RESOLUTION

### Detection de Conflits

```yaml
conflict_detection:
  types:
    concurrent_edit:
      description: "Deux agents modifient le meme chunk"
      detection: "hash mismatch on commit"

    stale_context:
      description: "Agent travaille avec context obsolete"
      detection: "version mismatch on notification"

  resolution:
    strategy: "last_writer_wins_with_merge"

    process:
      1: "Detecter le conflit"
      2: "Notifier les agents concernes"
      3: "Comparer les deltas"
      4: "Fusionner si possible, sinon arbitrage GM"
      5: "Propager la resolution"
```

### Message de Conflit

```json
{
  "@type": "ConflictEvent",
  "id": "conflict:2025-12-13:001",

  "type": "CONCURRENT_EDIT",
  "chunk_id": "chunk:auth:login:001",

  "parties": [
    {
      "agent": "AGT-DEV-BACK-001",
      "timestamp": "2025-12-13T10:30:00Z",
      "delta_hash": "abc123"
    },
    {
      "agent": "AGT-DEV-BACK-002",
      "timestamp": "2025-12-13T10:30:02Z",
      "delta_hash": "def456"
    }
  ],

  "resolution": {
    "strategy": "MERGE",
    "result_hash": "ghi789",
    "arbiter": "GRAND-MAITRE"
  }
}
```

---

## MONITORING

### Dashboard Sync

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    CONSCIENCE COLLECTIVE - SYNC STATUS                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  GLOBAL                              AGENTS                                   ║
║  ──────                              ──────                                   ║
║  Version: 1.0.5                      Total: 5                                 ║
║  Last Update: 10:30:01               Synced: 5  ████████████ 100%            ║
║  Events/min: 12                      Pending: 0                               ║
║                                                                               ║
║  RECENT EVENTS                                                                ║
║  ─────────────                                                                ║
║  [10:30:01] CHUNK_MODIFIED auth.login by AGT-DEV-001 ✓ Synced 5/5           ║
║  [10:28:45] CHUNK_CREATED  api.rateLimit by AGT-DEV-002 ✓ Synced 5/5        ║
║  [10:25:12] INDEX_UPDATED  full reindex ✓ Synced 5/5                        ║
║                                                                               ║
║  QUEUE STATUS                                                                 ║
║  ────────────                                                                 ║
║  High Priority:   0 pending                                                   ║
║  Normal Priority: 0 pending                                                   ║
║  Low Priority:    2 pending                                                   ║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## COMMANDES

```bash
# Statut sync
/collective sync status         # Etat global sync
/collective sync agents         # Etat par agent
/collective sync queue          # File d'attente

# Forcer sync
/collective sync force          # Forcer resync tous agents
/collective sync agent {id}     # Resync un agent specifique

# Debug
/collective sync events         # Voir les events recents
/collective sync conflicts      # Voir les conflits
/collective sync trace {event}  # Tracer un event
```

---

## INTEGRATION DANS LE TEMPLATE AGENT

Chaque agent cree via Task tool recoit automatiquement:

```javascript
Task({
  subagent_type: "general-purpose",
  description: "Agent {PROFIL}",
  prompt: `
Tu es ${agent_id}.

${COLLECTIVE_BOOTSTRAP}  // <-- Injection automatique

## MISSION
${mission}

## PROTOCOLE MODIFICATION OBLIGATOIRE
Apres TOUTE modification:
1. Creer le ModificationEvent JSON
2. Inclure: action, target, delta, impact
3. Le systeme synchronisera automatiquement

## IMPORTANT
- Tu recevras des broadcasts de sync
- Ton context peut etre mis a jour en cours de tache
- En cas de conflit, le Grand Maitre arbitre

Execute.
`
})
```

---

*"Un pour tous, tous informes.
La connaissance circule, jamais ne stagne.
La Conscience Collective est vivante."*

**PROTOCOLE SYNC ACTIVE**
