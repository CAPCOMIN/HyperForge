export type DemoMode = "mock" | "live";
export type AgentRuntime = "mock" | "minimax";

export type AgentRole = "master" | "analyst" | "builder" | "validator";
export type TaskRunStatus = "queued" | "planning" | "running" | "completed" | "failed";
export type SubTaskStatus = "pending" | "running" | "completed" | "failed";
export type PublishStatus = "local-only" | "published" | "mock-published" | "failed";

export interface AgentNode {
  id: string;
  role: AgentRole;
  evomapNodeId: string | null;
  nodeSecret: string | null;
  status: string;
  modelName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRun {
  id: string;
  inputTask: string;
  mode: DemoMode;
  agentRuntime: AgentRuntime;
  status: TaskRunStatus;
  startedAt: string;
  finishedAt: string | null;
  summary: string;
  llmModelName: string | null;
}

export interface SubTask {
  id: string;
  runId: string;
  title: string;
  description: string;
  assignedAgent: AgentRole;
  dependsOn: string[];
  expectedOutput: string;
  status: SubTaskStatus;
  outputSummary: string;
}

export interface AgentExecution {
  id: string;
  runId: string;
  subtaskId: string;
  agentRole: AgentRole;
  status: SubTaskStatus;
  summary: string;
  detail: string;
  signals: string[];
  artifacts: Record<string, unknown>;
  createdAt: string;
}

export interface GeneSequenceItem {
  geneAssetId: string;
  position: number;
}

export interface GenePayload {
  type: "Gene";
  schema_version: string;
  category: "repair" | "optimize" | "innovate" | "regulatory";
  summary: string;
  signals_match: string[];
  preconditions: string[];
  strategy: string[];
  constraints: {
    rules: string[];
    notes?: string;
  };
  validation: string[];
  parent?: string;
  domain?: string;
  model_name?: string;
  asset_id: string;
}

export interface CapsulePayload {
  type: "Capsule";
  schema_version: string;
  trigger: string[];
  gene: string;
  summary: string;
  confidence: number;
  blast_radius: {
    files: number;
    lines: number;
  };
  outcome: {
    status: "success" | "failed";
    score: number;
    notes: string;
  };
  success_streak: number;
  env_fingerprint: Record<string, string>;
  source_type: "generated" | "reused" | "reference";
  reused_asset_id?: string;
  parent?: string;
  content: string;
  strategy_steps: string[];
  model_name?: string;
  asset_id: string;
}

export interface GeneDraft {
  id: string;
  runId: string;
  sourceSubtaskId: string;
  summary: string;
  category: GenePayload["category"];
  signalsMatch: string[];
  assetId: string;
  publishStatus: PublishStatus;
  payload: GenePayload;
}

export interface CapsuleDraft {
  id: string;
  runId: string;
  sourceSubtaskId: string;
  geneAssetId: string;
  summary: string;
  assetId: string;
  publishStatus: PublishStatus;
  payload: CapsulePayload;
}

export interface PublishedAsset {
  assetId: string;
  type: "Gene" | "Capsule";
  status: string;
  gdiScore?: number;
}

export interface RecipeDraft {
  id: string;
  runId: string;
  title: string;
  description: string;
  genes: GeneSequenceItem[];
  pricePerExecution: number;
  maxConcurrent: number;
  evomapRecipeId: string | null;
  status: string;
}

export interface OrganismRun {
  id: string;
  recipeId: string;
  evomapOrganismId: string | null;
  status: string;
  genesExpressed: number;
  genesTotalCount: number;
  ttl: number;
  bornAt: string;
}

export interface RunEvent {
  id: string;
  runId: string;
  title: string;
  detail: string;
  createdAt: string;
}

export interface RunDetail {
  run: TaskRun;
  subtasks: SubTask[];
  agentExecutions: AgentExecution[];
  genes: GeneDraft[];
  capsules: CapsuleDraft[];
  recipe: RecipeDraft | null;
  organism: OrganismRun | null;
  timeline: RunEvent[];
}

export interface TaskPlan {
  goal: string;
  subtasks: Array<
    Pick<SubTask, "title" | "description" | "assignedAgent" | "dependsOn" | "expectedOutput">
  >;
}

export interface AgentExecutionResult {
  summary: string;
  detail: string;
  signals: string[];
  artifacts: Record<string, unknown>;
  success: boolean;
}

export interface AgentGeneCandidate {
  summary: string;
  category: GenePayload["category"];
  signalsMatch: string[];
  preconditions: string[];
  strategy: string[];
  constraints: GenePayload["constraints"];
  validation: string[];
  content: string;
}
