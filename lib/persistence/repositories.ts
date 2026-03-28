import type {
  AgentExecution,
  AgentNode,
  CapsuleDraft,
  GeneDraft,
  OrganismRun,
  RecipeDraft,
  RunDetail,
  RunEvent,
  SubTask,
  TaskRun
} from "@/lib/types/domain";
import { getDb } from "@/lib/persistence/db";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function stringify(value: unknown) {
  return JSON.stringify(value);
}

export const repositories = {
  upsertAgentNode(agentNode: AgentNode) {
    getDb()
      .prepare(
        `
        INSERT INTO agent_nodes (id, role, evomap_node_id, node_secret, status, model_name, created_at, updated_at)
        VALUES (@id, @role, @evomapNodeId, @nodeSecret, @status, @modelName, @createdAt, @updatedAt)
        ON CONFLICT(role) DO UPDATE SET
          id = excluded.id,
          evomap_node_id = excluded.evomap_node_id,
          node_secret = excluded.node_secret,
          status = excluded.status,
          model_name = excluded.model_name,
          updated_at = excluded.updated_at
      `
      )
      .run(agentNode);
  },

  getAgentNode(role: AgentNode["role"]) {
    const row = getDb()
      .prepare("SELECT * FROM agent_nodes WHERE role = ?")
      .get(role) as
      | {
          id: string;
          role: AgentNode["role"];
          evomap_node_id: string | null;
          node_secret: string | null;
          status: string;
          model_name: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      role: row.role,
      evomapNodeId: row.evomap_node_id,
      nodeSecret: row.node_secret,
      status: row.status,
      modelName: row.model_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } satisfies AgentNode;
  },

  createRun(run: TaskRun) {
    getDb()
      .prepare(
        `
        INSERT INTO task_runs (id, input_task, mode, agent_runtime, status, started_at, finished_at, summary, llm_model_name)
        VALUES (@id, @inputTask, @mode, @agentRuntime, @status, @startedAt, @finishedAt, @summary, @llmModelName)
      `
      )
      .run(run);
  },

  updateRun(run: TaskRun) {
    getDb()
      .prepare(
        `
        UPDATE task_runs
        SET status = @status, finished_at = @finishedAt, summary = @summary, agent_runtime = @agentRuntime, llm_model_name = @llmModelName
        WHERE id = @id
      `
      )
      .run(run);
  },

  listRuns() {
    const rows = getDb()
      .prepare("SELECT * FROM task_runs ORDER BY started_at DESC")
      .all() as Array<{
      id: string;
      input_task: string;
      mode: TaskRun["mode"];
      agent_runtime: TaskRun["agentRuntime"];
      status: TaskRun["status"];
      started_at: string;
      finished_at: string | null;
      summary: string;
      llm_model_name: string | null;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          inputTask: row.input_task,
          mode: row.mode,
          agentRuntime: row.agent_runtime,
          status: row.status,
          startedAt: row.started_at,
          finishedAt: row.finished_at,
          summary: row.summary,
          llmModelName: row.llm_model_name
        }) satisfies TaskRun
    );
  },

  getRun(id: string) {
    const row = getDb()
      .prepare("SELECT * FROM task_runs WHERE id = ?")
      .get(id) as
      | {
          id: string;
          input_task: string;
          mode: TaskRun["mode"];
          agent_runtime: TaskRun["agentRuntime"];
          status: TaskRun["status"];
          started_at: string;
          finished_at: string | null;
          summary: string;
          llm_model_name: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      inputTask: row.input_task,
      mode: row.mode,
      agentRuntime: row.agent_runtime,
      status: row.status,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      summary: row.summary,
      llmModelName: row.llm_model_name
    } satisfies TaskRun;
  },

  insertSubtasks(subtasks: SubTask[]) {
    const statement = getDb().prepare(
      `
      INSERT INTO subtasks (id, run_id, title, description, assigned_agent, depends_on, expected_output, status, output_summary)
      VALUES (@id, @runId, @title, @description, @assignedAgent, @dependsOn, @expectedOutput, @status, @outputSummary)
    `
    );

    const insertMany = getDb().transaction((items: SubTask[]) => {
      for (const item of items) {
        statement.run({
          ...item,
          dependsOn: stringify(item.dependsOn)
        });
      }
    });

    insertMany(subtasks);
  },

  updateSubtask(subtask: SubTask) {
    getDb()
      .prepare(
        `
        UPDATE subtasks
        SET status = @status, output_summary = @outputSummary
        WHERE id = @id
      `
      )
      .run(subtask);
  },

  listSubtasks(runId: string) {
    const rows = getDb()
      .prepare("SELECT * FROM subtasks WHERE run_id = ? ORDER BY rowid ASC")
      .all(runId) as Array<{
      id: string;
      run_id: string;
      title: string;
      description: string;
      assigned_agent: SubTask["assignedAgent"];
      depends_on: string;
      expected_output: string;
      status: SubTask["status"];
      output_summary: string;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          runId: row.run_id,
          title: row.title,
          description: row.description,
          assignedAgent: row.assigned_agent,
          dependsOn: parseJson<string[]>(row.depends_on),
          expectedOutput: row.expected_output,
          status: row.status,
          outputSummary: row.output_summary
        }) satisfies SubTask
    );
  },

  insertExecution(execution: AgentExecution) {
    getDb()
      .prepare(
        `
        INSERT INTO agent_executions (id, run_id, subtask_id, agent_role, status, summary, detail, signals, artifacts, created_at)
        VALUES (@id, @runId, @subtaskId, @agentRole, @status, @summary, @detail, @signals, @artifacts, @createdAt)
      `
      )
      .run({
        ...execution,
        signals: stringify(execution.signals),
        artifacts: stringify(execution.artifacts)
      });
  },

  listExecutions(runId: string) {
    const rows = getDb()
      .prepare("SELECT * FROM agent_executions WHERE run_id = ? ORDER BY created_at ASC")
      .all(runId) as Array<{
      id: string;
      run_id: string;
      subtask_id: string;
      agent_role: AgentExecution["agentRole"];
      status: AgentExecution["status"];
      summary: string;
      detail: string;
      signals: string;
      artifacts: string;
      created_at: string;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          runId: row.run_id,
          subtaskId: row.subtask_id,
          agentRole: row.agent_role,
          status: row.status,
          summary: row.summary,
          detail: row.detail,
          signals: parseJson<string[]>(row.signals),
          artifacts: parseJson<Record<string, unknown>>(row.artifacts),
          createdAt: row.created_at
        }) satisfies AgentExecution
    );
  },

  insertGeneDraft(gene: GeneDraft) {
    getDb()
      .prepare(
        `
        INSERT INTO gene_drafts (id, run_id, source_subtask_id, summary, category, signals_match, asset_id, publish_status, payload)
        VALUES (@id, @runId, @sourceSubtaskId, @summary, @category, @signalsMatch, @assetId, @publishStatus, @payload)
      `
      )
      .run({
        ...gene,
        signalsMatch: stringify(gene.signalsMatch),
        payload: stringify(gene.payload)
      });
  },

  updateGeneDraft(gene: GeneDraft) {
    getDb()
      .prepare("UPDATE gene_drafts SET publish_status = @publishStatus WHERE id = @id")
      .run(gene);
  },

  listGeneDrafts(runId: string) {
    const rows = getDb()
      .prepare("SELECT * FROM gene_drafts WHERE run_id = ? ORDER BY rowid ASC")
      .all(runId) as Array<{
      id: string;
      run_id: string;
      source_subtask_id: string;
      summary: string;
      category: GeneDraft["category"];
      signals_match: string;
      asset_id: string;
      publish_status: GeneDraft["publishStatus"];
      payload: string;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          runId: row.run_id,
          sourceSubtaskId: row.source_subtask_id,
          summary: row.summary,
          category: row.category,
          signalsMatch: parseJson<string[]>(row.signals_match),
          assetId: row.asset_id,
          publishStatus: row.publish_status,
          payload: parseJson<GeneDraft["payload"]>(row.payload)
        }) satisfies GeneDraft
    );
  },

  insertCapsuleDraft(capsule: CapsuleDraft) {
    getDb()
      .prepare(
        `
        INSERT INTO capsule_drafts (id, run_id, source_subtask_id, gene_asset_id, summary, asset_id, publish_status, payload)
        VALUES (@id, @runId, @sourceSubtaskId, @geneAssetId, @summary, @assetId, @publishStatus, @payload)
      `
      )
      .run({
        ...capsule,
        payload: stringify(capsule.payload)
      });
  },

  updateCapsuleDraft(capsule: CapsuleDraft) {
    getDb()
      .prepare("UPDATE capsule_drafts SET publish_status = @publishStatus WHERE id = @id")
      .run(capsule);
  },

  listCapsuleDrafts(runId: string) {
    const rows = getDb()
      .prepare("SELECT * FROM capsule_drafts WHERE run_id = ? ORDER BY rowid ASC")
      .all(runId) as Array<{
      id: string;
      run_id: string;
      source_subtask_id: string;
      gene_asset_id: string;
      summary: string;
      asset_id: string;
      publish_status: CapsuleDraft["publishStatus"];
      payload: string;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          runId: row.run_id,
          sourceSubtaskId: row.source_subtask_id,
          geneAssetId: row.gene_asset_id,
          summary: row.summary,
          assetId: row.asset_id,
          publishStatus: row.publish_status,
          payload: parseJson<CapsuleDraft["payload"]>(row.payload)
        }) satisfies CapsuleDraft
    );
  },

  upsertRecipe(recipe: RecipeDraft) {
    getDb()
      .prepare(
        `
        INSERT INTO recipes (id, run_id, title, description, genes, price_per_execution, max_concurrent, evomap_recipe_id, status)
        VALUES (@id, @runId, @title, @description, @genes, @pricePerExecution, @maxConcurrent, @evomapRecipeId, @status)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          genes = excluded.genes,
          price_per_execution = excluded.price_per_execution,
          max_concurrent = excluded.max_concurrent,
          evomap_recipe_id = excluded.evomap_recipe_id,
          status = excluded.status
      `
      )
      .run({
        ...recipe,
        genes: stringify(recipe.genes)
      });
  },

  getRecipeByRun(runId: string) {
    const row = getDb()
      .prepare("SELECT * FROM recipes WHERE run_id = ? LIMIT 1")
      .get(runId) as
      | {
          id: string;
          run_id: string;
          title: string;
          description: string;
          genes: string;
          price_per_execution: number;
          max_concurrent: number;
          evomap_recipe_id: string | null;
          status: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      runId: row.run_id,
      title: row.title,
      description: row.description,
      genes: parseJson<RecipeDraft["genes"]>(row.genes),
      pricePerExecution: row.price_per_execution,
      maxConcurrent: row.max_concurrent,
      evomapRecipeId: row.evomap_recipe_id,
      status: row.status
    } satisfies RecipeDraft;
  },

  upsertOrganism(organism: OrganismRun) {
    getDb()
      .prepare(
        `
        INSERT INTO organisms (id, recipe_id, evomap_organism_id, status, genes_expressed, genes_total_count, ttl, born_at)
        VALUES (@id, @recipeId, @evomapOrganismId, @status, @genesExpressed, @genesTotalCount, @ttl, @bornAt)
        ON CONFLICT(id) DO UPDATE SET
          evomap_organism_id = excluded.evomap_organism_id,
          status = excluded.status,
          genes_expressed = excluded.genes_expressed,
          genes_total_count = excluded.genes_total_count,
          ttl = excluded.ttl,
          born_at = excluded.born_at
      `
      )
      .run(organism);
  },

  getOrganismByRecipe(recipeId: string) {
    const row = getDb()
      .prepare("SELECT * FROM organisms WHERE recipe_id = ? LIMIT 1")
      .get(recipeId) as
      | {
          id: string;
          recipe_id: string;
          evomap_organism_id: string | null;
          status: string;
          genes_expressed: number;
          genes_total_count: number;
          ttl: number;
          born_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      recipeId: row.recipe_id,
      evomapOrganismId: row.evomap_organism_id,
      status: row.status,
      genesExpressed: row.genes_expressed,
      genesTotalCount: row.genes_total_count,
      ttl: row.ttl,
      bornAt: row.born_at
    } satisfies OrganismRun;
  },

  addRunEvent(event: RunEvent) {
    getDb()
      .prepare(
        `
        INSERT INTO run_events (id, run_id, title, detail, created_at)
        VALUES (@id, @runId, @title, @detail, @createdAt)
      `
      )
      .run(event);
  },

  listRunEvents(runId: string) {
    const rows = getDb()
      .prepare("SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at ASC")
      .all(runId) as Array<{
      id: string;
      run_id: string;
      title: string;
      detail: string;
      created_at: string;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          runId: row.run_id,
          title: row.title,
          detail: row.detail,
          createdAt: row.created_at
        }) satisfies RunEvent
    );
  },

  getRunDetail(runId: string): RunDetail | null {
    const run = this.getRun(runId);

    if (!run) {
      return null;
    }

    const recipe = this.getRecipeByRun(runId);

    return {
      run,
      subtasks: this.listSubtasks(runId),
      agentExecutions: this.listExecutions(runId),
      genes: this.listGeneDrafts(runId),
      capsules: this.listCapsuleDrafts(runId),
      recipe,
      organism: recipe ? this.getOrganismByRecipe(recipe.id) : null,
      timeline: this.listRunEvents(runId)
    };
  }
};
