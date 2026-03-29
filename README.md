# HyperForge

HyperForge is a first-phase hackathon demo for EvoMap track 03 / Case A. It demonstrates a closed-loop multi-agent workflow:

1. User submits a complex task
2. Master agent decomposes it into a DAG
3. Analyst / Builder / Validator execute subtasks
4. Successful executions become Gene and Capsule drafts
5. Assets publish to EvoMap through a mock/live adapter
6. Published Genes compose a Recipe
7. Recipe is published and expressed into an Organism
8. UI shows the full timeline and outputs

## Tech Stack

- TypeScript
- Node.js 20+
- Next.js App Router
- React
- Tailwind CSS
- Zod
- SQLite via `better-sqlite3`
- Vitest
- pnpm

## Project Structure

```text
app/
  api/
    demo/run
    demo/status/[runId]
    evomap/hello
    evomap/heartbeat
    evomap/publish
    evomap/fetch
    evomap/recipe
    evomap/recipe/express
  dashboard
  runs/[runId]
  page.tsx
components/
lib/
  agents/
  orchestration/
  evomap/
  genes/
  persistence/
  demo/
  types/
  utils/
tests/
docs/
```

## Architecture

- `app` and `components`: UI and route handlers only
- `lib/orchestration`: DAG planning, execution, state transitions, run summary
- `lib/agents`: unified agent interface and concrete agent implementations
- `lib/genes`: signal extraction, canonical JSON normalization, hashing, Gene/Capsule/Recipe builders
- `lib/evomap`: all EvoMap protocol integration and mock/live switching
- `lib/persistence`: SQLite schema and repositories
- `lib/demo`: deterministic mock executor and validation runtime

More detail: [`docs/architecture.md`](./docs/architecture.md)

## Environment Variables

Copy `.env.example` to `.env.local`.

```bash
EVOMAP_MODE=mock
EVOMAP_BASE_URL=https://evomap.ai
EVOMAP_AUTO_HELLO=true
EVOMAP_NODE_ID=
EVOMAP_NODE_SECRET=
EVOMAP_MODEL_NAME=gpt-5
AUTH_BOOTSTRAP_USERNAME=
AUTH_BOOTSTRAP_PASSWORD=
AUTH_BOOTSTRAP_DISPLAY_NAME=
AUTH_SESSION_SECRET=
DATABASE_URL=file:./data/hyperforge.db
```

## How To Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Useful commands:

```bash
pnpm test
pnpm typecheck
pnpm build
```

## Mock / Live Mode

### Mock Mode

- Default
- No EvoMap network dependency
- `hello`, `publish`, `recipe`, and `express` all return deterministic local mock responses
- Best for hackathon presentation stability

### Live Mode

- Select `live` in the UI or call `/api/demo/run` with `"mode": "live"`
- Uses EvoMap HTTP endpoints
- Auto-registers with `POST /a2a/hello` when local node identity is missing
- Uses `Authorization: Bearer <node_secret>` for mutating requests

## Demo Flow

1. Open the home page
2. Enter your own task
3. Choose `mock` or `live`
4. Start the run
5. Inspect the run page:
   - DAG
   - agent outputs
   - Gene/Capsule cards
   - Recipe and Organism state
   - timeline and final summary

## Implemented In Phase 1

- Unified multi-agent architecture
- Master DAG planning
- Analyst / Builder / Validator execution
- Local SQLite persistence
- Canonical JSON SHA-256 asset hashing
- Gene and Capsule drafting
- EvoMap hello / heartbeat / publish / fetch / recipe / express adapters
- Mock/live switch
- Run dashboard UI
- Minimal tests and docs

## Explicitly Deferred To Phase 2

- Real repo sandbox stage/apply/validate/reused publish loop
- EvoMap session / board / collaboration APIs
- Service publish with recipe link
- Memory graph and reuse scoring
- Pipeline / swarm / marketplace orchestration
- Multi-model routing
- Validator network
- Correction / skill recovery chain
- Baseline vs reuse metrics

These are represented as adapters or typed stubs under `lib/evomap`, `lib/demo`, and orchestration boundaries.

## Testing Scope

Current tests cover:

- asset hash stability
- Gene draft builder
- Capsule draft builder
- task planner DAG shape
- recipe composer
- EvoMap client mode adapters

## EvoMap Notes

This project follows the updated `gep-a2a` envelope described in EvoMap's A2A documentation for `hello`, `heartbeat`, `publish`, `fetch`, and `validate`. Recipe endpoints are implemented with the JSON payload shape shown in the Recipe/Organism docs.

Sources used:

- <https://evomap.ai/llms.txt>
- <https://evomap.ai/docs/en/05-a2a-protocol.md>
- <https://evomap.ai/docs/en/19-recipe-organism.md>

## Known Constraints

- The current runtime uses a deterministic mock executor instead of a real code sandbox
- Live EvoMap behavior may evolve; the adapter layer is designed to contain protocol drift
- This repository was authored in an environment without a local Node binary, so install and runtime verification should be run after Node 20+ is available
