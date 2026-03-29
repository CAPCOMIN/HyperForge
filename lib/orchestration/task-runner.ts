import { createAgentRegistry } from "@/lib/agents/agent-registry";
import { getRuntimeConfig } from "@/lib/config/runtime";
import type {
  AgentExecutionResult,
  AgentNode,
  AgentRuntime,
  DemoMode,
  RunDetail,
  SessionUser,
  SubTask,
  TaskRun
} from "@/lib/types/domain";
import { buildCapsuleDraft } from "@/lib/genes/capsule-builder";
import { buildGeneDraft } from "@/lib/genes/gene-builder";
import { composeRecipeDraft } from "@/lib/genes/recipe-composer";
import { writeRunDeliverables } from "@/lib/deliverables";
import { createRecipeAndPublish, expressRecipe } from "@/lib/evomap/recipe";
import { publishAssets, toDraftPublishStatus, toEvoMapAssetUrl } from "@/lib/evomap/publish";
import { sanitizeTaskPlan, sortSubtasksByDependency } from "@/lib/orchestration/task-dag";
import { assertRunTransition } from "@/lib/orchestration/run-state-machine";
import { repositories } from "@/lib/persistence/repositories";
import { getRunDetail } from "@/lib/runs/get-run-detail";
import { createId, createNodeId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

declare global {
  // eslint-disable-next-line no-var
  var __hyperforgeActiveRuns: Map<string, Promise<void>> | undefined;
}

function ensureLocalAgentNodes() {
  const timestamp = nowIso();
  const roles: AgentNode["role"][] = ["master", "analyst", "builder", "validator"];

  for (const role of roles) {
    const existing = repositories.getAgentNode(role);
    repositories.upsertAgentNode({
      id: existing?.id ?? createNodeId(role),
      role,
      evomapNodeId: existing?.evomapNodeId ?? null,
      nodeSecret: existing?.nodeSecret ?? null,
      status: existing?.status ?? "ready",
      modelName: existing?.modelName ?? getRuntimeConfig().evomapModelName,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    });
  }
}

function getActiveRuns() {
  if (!global.__hyperforgeActiveRuns) {
    global.__hyperforgeActiveRuns = new Map();
  }

  return global.__hyperforgeActiveRuns;
}

function createQueuedRun(
  user: SessionUser,
  task: string,
  mode: DemoMode,
  agentRuntime: AgentRuntime
) {
  ensureLocalAgentNodes();
  const runId = createId("run");
  const run: TaskRun = {
    id: runId,
    userId: user.id,
    ownerUsername: user.username,
    ownerDisplayName: user.displayName,
    inputTask: task,
    mode,
    agentRuntime,
    status: "queued",
    startedAt: nowIso(),
    finishedAt: null,
    summary:
      agentRuntime === "minimax"
        ? "Run queued. Preparing LLM-backed agents."
        : "Run queued. Preparing mock agents.",
    llmModelName:
      agentRuntime === "minimax" ? getRuntimeConfig().minimaxModelName : null
  };

  repositories.createRun(run);
  repositories.addRunEvent({
    id: createId("event"),
    runId,
    title: "Run created",
    detail: `User submitted a complex task. Runtime=${agentRuntime}, EvoMap mode=${mode}.`,
    createdAt: nowIso()
  });

  return run;
}

async function executeDemoRun(
  runId: string,
  task: string,
  mode: DemoMode,
  agentRuntime: AgentRuntime
): Promise<RunDetail> {
  ensureLocalAgentNodes();
  const registry = createAgentRegistry();
  const run = repositories.getRun(runId);

  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  assertRunTransition(run.status, "planning");
  run.status = "planning";
  run.summary =
    agentRuntime === "minimax"
      ? "Master agent is planning the task DAG with the configured LLM."
      : "Master agent is planning the task DAG.";
  repositories.updateRun(run);

  const master = registry.get("master");
  let recoveredPlanning = false;
  let recoveredExecutions = 0;
  let plan;

  try {
    plan = await master.plan(task, {
      runId,
      inputTask: task,
      agentRuntime,
      completedExecutions: {}
    });
  } catch (error) {
    if (agentRuntime === "minimax") {
      recoveredPlanning = true;
      repositories.addRunEvent({
        id: createId("event"),
        runId,
        title: "Planning degraded",
        detail:
          error instanceof Error
            ? `LLM planning returned an invalid structure. Falling back to the deterministic planner. ${error.message}`
            : "LLM planning returned an invalid structure. Falling back to the deterministic planner.",
        createdAt: nowIso()
      });

      plan = await master.plan(task, {
        runId,
        inputTask: task,
        agentRuntime: "mock",
        completedExecutions: {}
      });
    } else {
      throw new Error(
        `Master planning failed${
          error instanceof Error ? `: ${error.message}` : "."
        }`
      );
    }
  }

  if (!plan) {
    throw new Error("Master agent failed to produce a task plan.");
  }

  const sanitizedPlanResult = sanitizeTaskPlan(plan);
  plan = sanitizedPlanResult.plan;

  const subtasks: SubTask[] = plan.subtasks.map((subtask) => ({
    id: createId("subtask"),
    runId,
    title: subtask.title,
    description: subtask.description,
    assignedAgent: subtask.assignedAgent,
    dependsOn: subtask.dependsOn,
    expectedOutput: subtask.expectedOutput,
    status: "pending",
    outputSummary: ""
  }));

  repositories.insertSubtasks(subtasks);
  repositories.addRunEvent({
    id: createId("event"),
    runId,
    title: "Task planned",
    detail: `Master agent created ${subtasks.length} subtasks with explicit dependencies.`,
    createdAt: nowIso()
  });

  if (sanitizedPlanResult.corrected) {
    repositories.addRunEvent({
      id: createId("event"),
      runId,
      title: "Task plan normalized",
      detail:
        "Dependency references were normalized into a stable sequential DAG for analyst, builder, and validator.",
      createdAt: nowIso()
    });
  }

  assertRunTransition(run.status, "running");
  run.status = "running";
  run.summary =
    agentRuntime === "minimax"
      ? recoveredPlanning
        ? "LLM planning required deterministic recovery. Agents are now executing subtasks."
        : "Agents are executing subtasks with the configured LLM."
      : "Agents are executing subtasks.";
  repositories.updateRun(run);

  const executionMap: Record<string, AgentExecutionResult> = {};
  const geneDrafts: RunDetail["genes"] = [];
  const capsuleDrafts: RunDetail["capsules"] = [];

  for (const subtask of sortSubtasksByDependency(subtasks)) {
    const current = repositories
      .listSubtasks(runId)
      .find((item) => item.id === subtask.id);

    if (!current) {
      throw new Error(`Subtask not found: ${subtask.id}`);
    }

    current.status = "running";
    current.outputSummary = "In progress.";
    repositories.updateSubtask(current);
    repositories.addRunEvent({
      id: createId("event"),
      runId,
      title: `Start ${current.title}`,
      detail: `${current.assignedAgent} agent started the assigned subtask.`,
      createdAt: nowIso()
    });

    const agent = registry.get(current.assignedAgent);
    let result: AgentExecutionResult;

    try {
      result = await agent.execute(current, {
        runId,
        inputTask: task,
        agentRuntime,
        completedExecutions: executionMap
      });
    } catch (error) {
      if (agentRuntime === "minimax") {
        recoveredExecutions += 1;
        repositories.addRunEvent({
          id: createId("event"),
          runId,
        title: `Execution degraded: ${current.title}`,
        detail:
          error instanceof Error
              ? `${current.assignedAgent} could not complete the task with the LLM runtime. Falling back to deterministic execution. ${error.message}`
              : `${current.assignedAgent} could not complete the task with the LLM runtime. Falling back to deterministic execution.`,
          createdAt: nowIso()
        });

        result = await agent.execute(current, {
          runId,
          inputTask: task,
          agentRuntime: "mock",
          completedExecutions: executionMap
        });

        result.artifacts = {
          ...result.artifacts,
          runtimeProvider: "mock" satisfies AgentRuntime,
          recovery: {
            source: "minimax",
            reason: error instanceof Error ? error.message : "Unknown LLM runtime failure."
          }
        };
      } else {
        throw new Error(
          `${current.assignedAgent} agent failed on "${current.title}"${
            error instanceof Error ? `: ${error.message}` : "."
          }`
        );
      }
    }

    current.status = result.success ? "completed" : "failed";
    current.outputSummary = result.summary;
    repositories.updateSubtask(current);

    const execution = {
      id: createId("exec"),
      runId,
      subtaskId: current.id,
      agentRole: current.assignedAgent,
      status: current.status,
      summary: result.summary,
      detail: result.detail,
      signals: result.signals,
      artifacts: result.artifacts,
      createdAt: nowIso()
    } as const;

    repositories.insertExecution(execution);
    executionMap[current.id] = result;
    repositories.addRunEvent({
      id: createId("event"),
      runId,
      title: `Finish ${current.title}`,
      detail: agent.summarize(result),
      createdAt: nowIso()
    });

    if (result.success) {
      const candidate = agent.emitGeneCandidate(current, result, {
        runId,
        inputTask: task,
        agentRuntime,
        completedExecutions: executionMap
      });
      const gene = buildGeneDraft({
        runId,
        sourceSubtaskId: current.id,
        candidate,
        execution
      });
      const capsule = buildCapsuleDraft({
        runId,
        sourceSubtaskId: current.id,
        gene,
        candidate,
        execution
      });

      repositories.insertGeneDraft(gene);
      repositories.insertCapsuleDraft(capsule);
      geneDrafts.push(gene);
      capsuleDrafts.push(capsule);

      try {
        const publishResult = await publishAssets([gene.payload, capsule.payload], mode);
        gene.publishStatus = toDraftPublishStatus(mode, true);
        capsule.publishStatus = toDraftPublishStatus(mode, true);
        const publishedGene = publishResult.publishedAssets.find((asset) => asset.type === "Gene");
        const publishedCapsule = publishResult.publishedAssets.find((asset) => asset.type === "Capsule");
        const publishDetail =
          mode === "live"
            ? [
                publishedGene?.assetId
                  ? `Gene: ${toEvoMapAssetUrl(publishedGene.assetId)}`
                  : null,
                publishedCapsule?.assetId
                  ? `Capsule: ${toEvoMapAssetUrl(publishedCapsule.assetId)}`
                  : null
              ]
                .filter(Boolean)
                .join(" | ")
            : "Local mode run. Public EvoMap asset links are not generated yet.";

        repositories.addRunEvent({
          id: createId("event"),
          runId,
          title: "Assets published",
          detail: publishDetail,
          createdAt: nowIso()
        });
      } catch (error) {
        gene.publishStatus = "failed";
        capsule.publishStatus = "failed";
        const detail =
          error instanceof Error ? error.message : "Unknown EvoMap publish error.";
        repositories.addRunEvent({
          id: createId("event"),
          runId,
          title: "Assets publish failed",
          detail,
          createdAt: nowIso()
        });
      }

      repositories.updateGeneDraft(gene);
      repositories.updateCapsuleDraft(capsule);
      repositories.addRunEvent({
        id: createId("event"),
        runId,
        title: "Assets bundled",
        detail: `Generated Gene ${gene.assetId.slice(0, 18)}... and Capsule ${capsule.assetId.slice(0, 18)}...`,
        createdAt: nowIso()
      });
    }
  }

  const publishedGenes = geneDrafts.filter((item) => item.publishStatus !== "failed");
  const recipeDraft = composeRecipeDraft({
    runId,
    task,
    genes: publishedGenes.slice(0, Math.max(2, Math.min(3, publishedGenes.length)))
  });

  repositories.upsertRecipe(recipeDraft);
  repositories.addRunEvent({
    id: createId("event"),
    runId,
    title: "Recipe drafted",
    detail: `Recipe assembled from ${recipeDraft.genes.length} genes.`,
    createdAt: nowIso()
  });

  if (recipeDraft.genes.length >= 1) {
    try {
      const recipeResult = await createRecipeAndPublish({
        title: recipeDraft.title,
        description: recipeDraft.description,
        genes: recipeDraft.genes,
        pricePerExecution: recipeDraft.pricePerExecution,
        maxConcurrent: recipeDraft.maxConcurrent
      }, mode);

      recipeDraft.evomapRecipeId = recipeResult.published.recipeId;
      recipeDraft.status =
        mode === "live" ? recipeResult.published.status : "mock-published";
      repositories.upsertRecipe(recipeDraft);

      const expressed = await expressRecipe(recipeDraft.evomapRecipeId, 3600, mode);
      repositories.upsertOrganism({
        id: createId("organism"),
        recipeId: recipeDraft.id,
        evomapOrganismId: expressed.organism.id,
        status: expressed.organism.status,
        genesExpressed: expressed.organism.genes_expressed,
        genesTotalCount: expressed.organism.genes_total_count,
        ttl: expressed.organism.ttl,
        bornAt: expressed.organism.born_at
      });
      repositories.addRunEvent({
        id: createId("event"),
        runId,
        title: "Organism expressed",
        detail: `Recipe ${recipeDraft.evomapRecipeId} expressed into organism ${expressed.organism.id}.`,
        createdAt: nowIso()
      });
    } catch (error) {
      recipeDraft.status = "failed";
      repositories.upsertRecipe(recipeDraft);
      repositories.addRunEvent({
        id: createId("event"),
        runId,
        title: "Recipe flow degraded",
        detail:
          error instanceof Error
            ? error.message
            : "Recipe create/publish/express failed.",
        createdAt: nowIso()
      });
    }
  }

  assertRunTransition(run.status, "completed");
  run.status = "completed";
  run.finishedAt = nowIso();
  run.summary =
    agentRuntime === "minimax"
      ? recoveredPlanning || recoveredExecutions > 0
        ? `Master orchestrator completed the LLM-backed workflow with resilient recovery: ${recoveredPlanning ? "planning recovered, " : ""}${recoveredExecutions} execution fallback(s), Gene/Capsule drafting, EvoMap integration, recipe creation, and organism expression.`
        : "Master orchestrator completed the LLM-backed closed-loop workflow: DAG execution, Gene/Capsule drafting, EvoMap integration, recipe creation, and organism expression."
      : "Master orchestrator completed the closed-loop demo: DAG execution, Gene/Capsule drafting, EvoMap publish, recipe creation, and organism expression.";
  repositories.updateRun(run);
  const finalDetail = repositories.getRunDetail(runId);

  if (finalDetail) {
    writeRunDeliverables({
      ...finalDetail,
      deliverables: {
        status: "pending",
        title: "Final Deliverables",
        description: "",
        outputDir: null,
        generatedAt: null,
        primaryDeliverableId: null,
        items: []
      }
    });
    repositories.addRunEvent({
      id: createId("event"),
      runId,
      title: "Final deliverables generated",
      detail:
        "Final handoff files were assembled from Analyst, Builder, and Validator outputs and saved for preview/download.",
      createdAt: nowIso()
    });
  }

  return getRunDetail(runId) as RunDetail;
}

export async function runDemoTask(
  user: SessionUser,
  task: string,
  mode: DemoMode = getRuntimeConfig().evomapMode,
  agentRuntime: AgentRuntime = "mock"
): Promise<RunDetail> {
  const run = createQueuedRun(user, task, mode, agentRuntime);
  return executeDemoRun(run.id, task, mode, agentRuntime);
}

export function startDemoTask(
  user: SessionUser,
  task: string,
  mode: DemoMode = getRuntimeConfig().evomapMode,
  agentRuntime: AgentRuntime = "mock"
) {
  const run = createQueuedRun(user, task, mode, agentRuntime);
  const activeRuns = getActiveRuns();

  const job: Promise<void> = executeDemoRun(run.id, task, mode, agentRuntime)
    .then(() => undefined)
    .catch((error) => {
      const failedRun = repositories.getRun(run.id);
      if (failedRun) {
        failedRun.status = "failed";
        failedRun.finishedAt = nowIso();
        failedRun.summary =
          error instanceof Error ? error.message : "Run failed unexpectedly.";
        repositories.updateRun(failedRun);
        repositories.addRunEvent({
          id: createId("event"),
          runId: run.id,
          title: "Run failed",
          detail:
            error instanceof Error
              ? error.message
              : "Unexpected orchestration failure.",
          createdAt: nowIso()
        });
      }
    })
    .finally(() => {
      activeRuns.delete(run.id);
    });

  activeRuns.set(run.id, job);

  return {
    runId: run.id,
    status: run.status
  };
}
