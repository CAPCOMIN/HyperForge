# HyperForge Architecture

## 1. System Boundaries

HyperForge is split into six layers:

1. UI Layer
   - `app/*`
   - `components/*`
   - Collects task input and renders run detail

2. Orchestration Layer
   - `lib/orchestration/*`
   - Creates the DAG, runs agents in order, tracks status, writes timeline

3. Agent Layer
   - `lib/agents/*`
   - Defines the unified agent contract and concrete roles

4. Gene Layer
   - `lib/genes/*`
   - Extracts signals, computes canonical JSON, hashes assets, builds Gene/Capsule/Recipe drafts

5. EvoMap Integration Layer
   - `lib/evomap/*`
   - Encapsulates `hello`, `heartbeat`, `publish`, `fetch`, `recipe`, and `express`
   - Supports mock/live switching

6. Persistence Layer
   - `lib/persistence/*`
   - Initializes SQLite schema and provides repositories

## 2. Core Flow

```text
User Task
  -> Master Agent planning
  -> DAG persisted
  -> Analyst execution
  -> Builder execution
  -> Validator execution
  -> Gene/Capsule drafting
  -> EvoMap publish bundle(s)
  -> Recipe compose
  -> Recipe publish
  -> Recipe express -> Organism
  -> Run detail dashboard
```

## 3. Agent Contract

Each agent implements:

- `id`
- `role`
- `capabilities`
- `plan()`
- `execute()`
- `summarize()`
- `emitGeneCandidate()`

This keeps phase-two agent types additive instead of invasive.

## 4. Data Model

### Persistent entities

- `agent_nodes`
- `task_runs`
- `subtasks`
- `agent_executions`
- `gene_drafts`
- `capsule_drafts`
- `recipes`
- `organisms`
- `run_events`

### Important domain models

- `TaskRun`
- `SubTask`
- `AgentExecution`
- `GeneDraft`
- `CapsuleDraft`
- `PublishedAsset`
- `RecipeDraft`
- `OrganismRun`

## 5. EvoMap Integration Decisions

### Adopted now

- `gep-a2a` envelope for A2A messages
- local SHA-256 `asset_id` hashing with canonical JSON
- bundle publish for Gene + Capsule
- `Authorization: Bearer <node_secret>` for mutating requests
- recipe create/publish/express flow

### Contained protocol drift

EvoMap public docs currently expose both envelope-centric A2A examples and plain JSON examples for recipe endpoints. HyperForge keeps this inconsistency isolated inside `lib/evomap/client.ts`.

## 6. Mock Runtime

Phase 1 uses:

- `lib/demo/mock-executor.ts`
- `lib/demo/mock-validation.ts`

They simulate:

- file surface planning
- patch note generation
- acceptance test planning
- validation scoring

They are intentionally deterministic for demo repeatability.

## 7. Phase 2 Extension Points

### Real asset reuse loop

- future adapter: fetch -> stage -> apply -> validate -> reused publish
- boundary: `lib/evomap/corrections.ts`, orchestration runner, mock runtime replacement

### Collaboration/session protocol

- future adapter: EvoMap session / board / message endpoints
- boundary: `lib/evomap/*` and additional orchestration coordinator

### Real executor sandbox

- future adapter: repo checkout, diff apply, command runner, validator harness
- boundary: replace `lib/demo/mock-executor.ts`

### Memory graph / scoring

- future adapter: reuse memory, suppression, success weighting
- boundary: new service under `lib/genes` or `lib/orchestration`

### Multi-model routing

- future adapter: role-specific model selection and cost policy
- boundary: agent registry and runtime strategy
