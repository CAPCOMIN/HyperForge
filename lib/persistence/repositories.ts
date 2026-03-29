import type {
  AgentExecution,
  AgentNode,
  AppSettings,
  CapsuleDraft,
  GeneDraft,
  InviteCode,
  OrganismRun,
  RecipeDraft,
  RunDetail,
  RunEvent,
  SubTask,
  TaskRun,
  UserAccount,
  UserQuotaSnapshot
} from "@/lib/types/domain";
import { getDb } from "@/lib/persistence/db";

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function stringify(value: unknown) {
  return JSON.stringify(value);
}

export const repositories = {
  createUser(input: UserAccount & { passwordHash: string }) {
    getDb()
      .prepare(
        `
        INSERT INTO users (
          id, username, display_name, password_hash, role, status, quota_limit,
          password_version, created_at, updated_at, last_login_at
        )
        VALUES (
          @id, @username, @displayName, @passwordHash, @role, @status, @quotaLimit,
          @passwordVersion, @createdAt, @updatedAt, @lastLoginAt
        )
      `
      )
      .run(input);
  },

  updateUser(user: UserAccount) {
    getDb()
      .prepare(
        `
        UPDATE users
        SET username = @username,
            display_name = @displayName,
            role = @role,
            status = @status,
            quota_limit = @quotaLimit,
            password_version = @passwordVersion,
            updated_at = @updatedAt,
            last_login_at = @lastLoginAt
        WHERE id = @id
      `
      )
      .run(user);
  },

  updateUserPassword(userId: string, passwordHash: string, updatedAt: string) {
    getDb()
      .prepare(
        `
        UPDATE users
        SET password_hash = ?,
            password_version = password_version + 1,
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(passwordHash, updatedAt, userId);
  },

  touchUserLogin(userId: string, timestamp: string) {
    getDb()
      .prepare(
        `
        UPDATE users
        SET last_login_at = ?, updated_at = ?
        WHERE id = ?
      `
      )
      .run(timestamp, timestamp, userId);
  },

  getUserById(id: string) {
    const row = getDb()
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(id) as
      | {
          id: string;
          username: string;
          display_name: string;
          password_hash: string;
          role: UserAccount["role"];
          status: UserAccount["status"];
          quota_limit: number | null;
          password_version: number;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
      quotaLimit: row.quota_limit,
      passwordVersion: row.password_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at
    };
  },

  getUserByUsername(username: string) {
    const row = getDb()
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as
      | {
          id: string;
          username: string;
          display_name: string;
          password_hash: string;
          role: UserAccount["role"];
          status: UserAccount["status"];
          quota_limit: number | null;
          password_version: number;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      passwordHash: row.password_hash,
      role: row.role,
      status: row.status,
      quotaLimit: row.quota_limit,
      passwordVersion: row.password_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at
    };
  },

  listUsers() {
    const rows = getDb()
      .prepare("SELECT * FROM users ORDER BY role DESC, created_at ASC")
      .all() as Array<{
      id: string;
      username: string;
      display_name: string;
      role: UserAccount["role"];
      status: UserAccount["status"];
      quota_limit: number | null;
      password_version: number;
      created_at: string;
      updated_at: string;
      last_login_at: string | null;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          role: row.role,
          status: row.status,
          quotaLimit: row.quota_limit,
          passwordVersion: row.password_version,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastLoginAt: row.last_login_at
        }) satisfies UserAccount
    );
  },

  countAdmins() {
    const row = getDb()
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'")
      .get() as { count: number };

    return row.count;
  },

  countRunsByUser(userId: string) {
    const row = getDb()
      .prepare("SELECT COUNT(*) as count FROM task_runs WHERE user_id = ?")
      .get(userId) as { count: number };

    return row.count;
  },

  getUserQuotaSnapshot(userId: string): UserQuotaSnapshot | null {
    const user = this.getUserById(userId);

    if (!user) {
      return null;
    }

    const used = this.countRunsByUser(userId);
    return {
      limit: user.quotaLimit,
      used,
      remaining: user.quotaLimit === null ? null : Math.max(user.quotaLimit - used, 0)
    };
  },

  upsertAppSetting(key: string, value: string | null, updatedAt: string, updatedByUserId: string) {
    getDb()
      .prepare(
        `
        INSERT INTO app_settings (key, value, updated_at, updated_by_user_id)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at,
          updated_by_user_id = excluded.updated_by_user_id
      `
      )
      .run(key, value, updatedAt, updatedByUserId);
  },

  getAppSettings(): AppSettings {
    const rows = getDb()
      .prepare("SELECT * FROM app_settings")
      .all() as Array<{
      key: string;
      value: string | null;
      updated_at: string;
      updated_by_user_id: string | null;
    }>;

    const map = new Map(rows.map((row) => [row.key, row]));
    const latest = rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

    return {
      minimaxApiKey: map.get("minimax_api_key")?.value ?? null,
      evomapApiKey: map.get("evomap_api_key")?.value ?? null,
      evomapNodeId: map.get("evomap_node_id")?.value ?? null,
      evomapNodeSecret: map.get("evomap_node_secret")?.value ?? null,
      updatedAt: latest?.updated_at ?? null,
      updatedByUserId: latest?.updated_by_user_id ?? null
    };
  },

  createInviteCode(inviteCode: InviteCode) {
    getDb()
      .prepare(
        `
        INSERT INTO invite_codes (
          id, code, note, created_by_user_id, max_uses, used_count, status,
          expires_at, created_at, updated_at
        )
        VALUES (
          @id, @code, @note, @createdByUserId, @maxUses, @usedCount, @status,
          @expiresAt, @createdAt, @updatedAt
        )
      `
      )
      .run(inviteCode);
  },

  updateInviteCode(inviteCode: InviteCode) {
    getDb()
      .prepare(
        `
        UPDATE invite_codes
        SET note = @note,
            max_uses = @maxUses,
            used_count = @usedCount,
            status = @status,
            expires_at = @expiresAt,
            updated_at = @updatedAt
        WHERE id = @id
      `
      )
      .run(inviteCode);
  },

  getInviteCodeByCode(code: string) {
    const row = getDb()
      .prepare("SELECT * FROM invite_codes WHERE code = ?")
      .get(code) as
      | {
          id: string;
          code: string;
          note: string | null;
          created_by_user_id: string;
          max_uses: number;
          used_count: number;
          status: InviteCode["status"];
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      note: row.note,
      createdByUserId: row.created_by_user_id,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } satisfies InviteCode;
  },

  getInviteCodeById(id: string) {
    const row = getDb()
      .prepare("SELECT * FROM invite_codes WHERE id = ?")
      .get(id) as
      | {
          id: string;
          code: string;
          note: string | null;
          created_by_user_id: string;
          max_uses: number;
          used_count: number;
          status: InviteCode["status"];
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      code: row.code,
      note: row.note,
      createdByUserId: row.created_by_user_id,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } satisfies InviteCode;
  },

  listInviteCodes() {
    const rows = getDb()
      .prepare("SELECT * FROM invite_codes ORDER BY created_at DESC")
      .all() as Array<{
      id: string;
      code: string;
      note: string | null;
      created_by_user_id: string;
      max_uses: number;
      used_count: number;
      status: InviteCode["status"];
      expires_at: string | null;
      created_at: string;
      updated_at: string;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          code: row.code,
          note: row.note,
          createdByUserId: row.created_by_user_id,
          maxUses: row.max_uses,
          usedCount: row.used_count,
          status: row.status,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }) satisfies InviteCode
    );
  },

  consumeInviteCode(id: string, timestamp: string) {
    getDb()
      .prepare(
        `
        UPDATE invite_codes
        SET used_count = used_count + 1,
            status = CASE
              WHEN used_count + 1 >= max_uses THEN 'exhausted'
              ELSE status
            END,
            updated_at = ?
        WHERE id = ?
      `
      )
      .run(timestamp, id);
  },

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
        INSERT INTO task_runs (id, user_id, input_task, mode, agent_runtime, status, started_at, finished_at, summary, llm_model_name)
        VALUES (@id, @userId, @inputTask, @mode, @agentRuntime, @status, @startedAt, @finishedAt, @summary, @llmModelName)
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

  listRuns(options?: { userId?: string }) {
    const rows = getDb()
      .prepare(
        `
        SELECT task_runs.*, users.username AS owner_username, users.display_name AS owner_display_name
        FROM task_runs
        LEFT JOIN users ON users.id = task_runs.user_id
        ${options?.userId ? "WHERE task_runs.user_id = @userId" : ""}
        ORDER BY task_runs.started_at DESC
      `
      )
      .all(options?.userId ? { userId: options.userId } : {}) as Array<{
      id: string;
      user_id: string;
      input_task: string;
      mode: TaskRun["mode"];
      agent_runtime: TaskRun["agentRuntime"];
      status: TaskRun["status"];
      started_at: string;
      finished_at: string | null;
      summary: string;
      llm_model_name: string | null;
      owner_username: string | null;
      owner_display_name: string | null;
    }>;

    return rows.map(
      (row) =>
        ({
          id: row.id,
          userId: row.user_id,
          ownerUsername: row.owner_username,
          ownerDisplayName: row.owner_display_name,
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
      .prepare(
        `
        SELECT task_runs.*, users.username AS owner_username, users.display_name AS owner_display_name
        FROM task_runs
        LEFT JOIN users ON users.id = task_runs.user_id
        WHERE task_runs.id = ?
      `
      )
      .get(id) as
      | {
          id: string;
          user_id: string;
          input_task: string;
          mode: TaskRun["mode"];
          agent_runtime: TaskRun["agentRuntime"];
          status: TaskRun["status"];
          started_at: string;
          finished_at: string | null;
          summary: string;
          llm_model_name: string | null;
          owner_username: string | null;
          owner_display_name: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userId: row.user_id,
      ownerUsername: row.owner_username,
      ownerDisplayName: row.owner_display_name,
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

  getRunDetail(runId: string): Omit<RunDetail, "deliverables"> | null {
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
