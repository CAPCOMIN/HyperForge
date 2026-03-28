export const schemaSql = `
CREATE TABLE IF NOT EXISTS agent_nodes (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  evomap_node_id TEXT,
  node_secret TEXT,
  status TEXT NOT NULL,
  model_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS task_runs (
  id TEXT PRIMARY KEY,
  input_task TEXT NOT NULL,
  mode TEXT NOT NULL,
  agent_runtime TEXT NOT NULL DEFAULT 'mock',
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  summary TEXT NOT NULL,
  llm_model_name TEXT
);

CREATE TABLE IF NOT EXISTS subtasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_agent TEXT NOT NULL,
  depends_on TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  status TEXT NOT NULL,
  output_summary TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_executions (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  subtask_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  detail TEXT NOT NULL,
  signals TEXT NOT NULL,
  artifacts TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gene_drafts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  source_subtask_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  category TEXT NOT NULL,
  signals_match TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  publish_status TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS capsule_drafts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  source_subtask_id TEXT NOT NULL,
  gene_asset_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  publish_status TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genes TEXT NOT NULL,
  price_per_execution INTEGER NOT NULL,
  max_concurrent INTEGER NOT NULL,
  evomap_recipe_id TEXT,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organisms (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  evomap_organism_id TEXT,
  status TEXT NOT NULL,
  genes_expressed INTEGER NOT NULL,
  genes_total_count INTEGER NOT NULL,
  ttl INTEGER NOT NULL,
  born_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
