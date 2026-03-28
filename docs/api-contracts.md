# API Contracts

## Local Demo APIs

### `POST /api/demo/run`

Starts a new run and executes the whole demo pipeline synchronously.

Request:

```json
{
  "task": "为一个 Web 应用新增登录流程，包含需求分析、前端实现建议、验证计划和交付摘要",
  "mode": "mock"
}
```

Response:

```json
{
  "runId": "run_xxx",
  "status": "completed"
}
```

### `GET /api/demo/status/:runId`

Returns the full run detail persisted in SQLite.

### `POST /api/evomap/hello`

Ensures the local master node has an EvoMap identity and secret.

### `POST /api/evomap/heartbeat`

Sends a heartbeat using the stored node secret.

### `POST /api/evomap/publish`

Publishes a Gene + Capsule bundle.

Request:

```json
{
  "assets": [
    { "type": "Gene", "asset_id": "sha256:..." },
    { "type": "Capsule", "asset_id": "sha256:..." }
  ]
}
```

### `POST /api/evomap/fetch`

Minimal fetch wrapper with `signals`, `searchOnly`, and `assetIds`.

### `POST /api/evomap/recipe`

Creates and publishes a recipe.

### `POST /api/evomap/recipe/express`

Expresses a recipe into an organism.

## Mock Response Shapes

### Mock hello

```json
{
  "status": "acknowledged",
  "yourNodeId": "node_mock_xxx",
  "nodeSecret": "64_hex_chars",
  "hubNodeId": "hub_mock"
}
```

### Mock publish

```json
{
  "status": "mock-published",
  "publishedAssets": [
    {
      "assetId": "sha256:...",
      "type": "Gene",
      "status": "mock-published",
      "gdiScore": 42
    }
  ]
}
```

### Mock express

```json
{
  "organism": {
    "id": "organism_mock_recipe",
    "recipe_id": "recipe_mock_3",
    "status": "assembling",
    "ttl": 3600,
    "genes_expressed": 0,
    "genes_total_count": 3,
    "born_at": "2026-03-28T00:00:00.000Z"
  }
}
```

## EvoMap Integration Notes

## A2A envelope

Core A2A requests use:

```json
{
  "protocol": "gep-a2a",
  "protocol_version": "1.0.0",
  "message_type": "hello",
  "message_id": "msg_...",
  "sender_id": "node_xxx",
  "timestamp": "2026-03-28T00:00:00.000Z",
  "payload": {}
}
```

## Auth

- `POST /a2a/hello` does not require bearer auth
- `heartbeat`, `publish`, `fetch`, and other mutating endpoints use:

```http
Authorization: Bearer <node_secret>
```

## Bundle rule

Publish must send Gene + Capsule together. HyperForge publishes one pair per successful subtask.

## Recipe endpoints

Recipe endpoints currently use the request shape documented in EvoMap's Recipes & Organisms guide:

```json
{
  "sender_id": "node_xxx",
  "title": "HyperForge Task Recipe",
  "description": "Reusable gene sequence",
  "genes": [
    { "gene_asset_id": "sha256:...", "position": 0 }
  ],
  "price_per_execution": 15,
  "max_concurrent": 3
}
```
