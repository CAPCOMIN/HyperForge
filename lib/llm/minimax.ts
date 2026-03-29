import { z } from "zod";
import { getRuntimeConfig } from "@/lib/config/runtime";
import type {
  AgentExecutionResult,
  AgentGeneCandidate,
  AgentRuntime,
  TaskPlan
} from "@/lib/types/domain";

const planSchema = z.object({
  goal: z.string().min(10),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(3),
        description: z.string().min(10),
        assignedAgent: z.enum(["analyst", "builder", "validator"]),
        dependsOn: z.array(z.string()),
        expectedOutput: z.string().min(10)
      })
    )
    .min(3)
});

const geneCandidateSchema = z.object({
  summary: z.string().min(10),
  category: z.enum(["repair", "optimize", "innovate", "regulatory"]),
  signalsMatch: z.array(z.string()).min(3).max(8),
  preconditions: z.array(z.string()).min(1),
  strategy: z.array(z.string()).min(2),
  constraints: z.object({
    rules: z.array(z.string()).min(1),
    notes: z.string().optional()
  }),
  validation: z.array(z.string()).min(1),
  content: z.string().min(80)
});

const agentOutputSchema = z.object({
  summary: z.string().min(10),
  detail: z.string().min(40),
  signals: z.array(z.string()).min(3).max(8),
  artifacts: z.record(z.any()),
  geneCandidate: geneCandidateSchema
});

type MiniMaxChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

export interface MiniMaxAvailability {
  available: boolean;
  status:
    | "ready"
    | "missing_key"
    | "insufficient_balance"
    | "auth_error"
    | "rate_limited"
    | "server_error"
    | "network_error"
    | "invalid_response";
  message: string;
  model: string;
  checkedAt: string;
}

export class MiniMaxError extends Error {
  statusCode?: number;
  providerCode?: string;

  constructor(message: string, options?: { statusCode?: number; providerCode?: string }) {
    super(message);
    this.name = "MiniMaxError";
    this.statusCode = options?.statusCode;
    this.providerCode = options?.providerCode;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __hyperforgeMiniMaxAvailability:
    | {
        value: MiniMaxAvailability;
        expiresAt: number;
      }
    | undefined;
}

function extractContent(response: MiniMaxChatResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text ?? "")
      .join("\n")
      .trim();
  }

  throw new MiniMaxError("The LLM returned an empty response.");
}

function extractJsonBlock(text: string) {
  const fencedBlocks = Array.from(text.matchAll(/```json\s*([\s\S]*?)```/gi))
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));

  for (const block of fencedBlocks) {
    try {
      JSON.parse(block);
      return block;
    } catch {}
  }

  const findBalancedCandidate = (source: string, startIndex: number) => {
    const opening = source[startIndex];
    const closing = opening === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < source.length; index += 1) {
      const char = source[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === "\\") {
          escaped = true;
          continue;
        }

        if (char === "\"") {
          inString = false;
        }

        continue;
      }

      if (char === "\"") {
        inString = true;
        continue;
      }

      if (char === opening) {
        depth += 1;
      } else if (char === closing) {
        depth -= 1;
        if (depth === 0) {
          return source.slice(startIndex, index + 1);
        }
      }
    }

    return null;
  };

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "{" && text[index] !== "[") {
      continue;
    }

    const candidate = findBalancedCandidate(text, index);
    if (!candidate) {
      continue;
    }

    try {
      JSON.parse(candidate);
      return candidate;
    } catch {}
  }

  throw new MiniMaxError("The LLM did not return valid JSON.");
}

function parseJsonResponse(raw: string) {
  return JSON.parse(extractJsonBlock(raw));
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter(Boolean);
}

function normalizePlanPayload(input: unknown) {
  const orderedAgents: Array<"analyst" | "builder" | "validator"> = [
    "analyst",
    "builder",
    "validator"
  ];
  const normalizeSubtask = (item: unknown) => {
    const subtask = asRecord(item) ?? {};
    return {
      title:
        asString(subtask.title) ||
        asString(subtask.name) ||
        "Untitled subtask",
      description:
        asString(subtask.description) ||
        asString(subtask.summary) ||
        "Structured work item.",
      assignedAgent: asString(subtask.assignedAgent) || "analyst",
      dependsOn: asStringArray(subtask.dependsOn),
      expectedOutput:
        asString(subtask.expectedOutput) ||
        asString(subtask.output) ||
        "Concrete deliverable."
    };
  };

  const finalizePlan = (goal: string, rawSubtasks: unknown[]) => {
    const subtasks = rawSubtasks
      .map(normalizeSubtask)
      .slice(0, 3)
      .map((subtask, index, all) => ({
        ...subtask,
        assignedAgent: orderedAgents[index] ?? "validator",
        dependsOn:
          subtask.dependsOn.length > 0
            ? subtask.dependsOn
            : index === 0
              ? []
              : [all[index - 1]?.title ?? "Previous subtask"]
      }));

    return {
      goal,
      subtasks
    };
  };

  if (Array.isArray(input)) {
    return finalizePlan("Multi-agent task plan", input);
  }

  const record = asRecord(input);
  if (!record) {
    return input;
  }

  return finalizePlan(
    asString(record.goal) ||
      asString(record.taskName) ||
      asString(record.title) ||
      "Multi-agent task plan",
    Array.isArray(record.subtasks) ? record.subtasks : []
  );
}

function normalizeAgentOutputPayload(
  input: unknown,
  defaultCategory: AgentGeneCandidate["category"]
) {
  const record = asRecord(input);
  if (!record) {
    return input;
  }

  const knownRootKeys = new Set([
    "summary",
    "detail",
    "signals",
    "tags",
    "keywords",
    "artifacts",
    "geneCandidate",
    "gene"
  ]);
  const candidateRecord =
    asRecord(record.geneCandidate) ?? asRecord(record.gene) ?? {};
  const rawSignals = [
    ...asStringArray(record.signals),
    ...asStringArray(record.tags),
    ...asStringArray(record.keywords)
  ].slice(0, 8);
  const summary =
    asString(record.summary) ||
    asString(record.title) ||
    "Agent produced a structured execution result.";
  const detail =
    asString(record.detail) ||
    asString(record.description) ||
    asString(record.analysis) ||
    `${summary} The output was normalized from a flexible LLM JSON response.`;
  const artifacts =
    asRecord(record.artifacts) ??
    Object.fromEntries(
      Object.entries(record).filter(([key]) => !knownRootKeys.has(key))
    );

  return {
    summary,
    detail,
    signals:
      rawSignals.length >= 3
        ? rawSignals
        : ["authentication", "delivery", "validation"],
    artifacts,
    geneCandidate: {
      summary:
        asString(candidateRecord.summary) ||
        `${summary} reusable strategy`,
      category:
        (asString(candidateRecord.category) as AgentGeneCandidate["category"]) ||
        defaultCategory,
      signalsMatch:
        asStringArray(candidateRecord.signalsMatch).length >= 3
          ? asStringArray(candidateRecord.signalsMatch).slice(0, 8)
          : rawSignals.length >= 3
            ? rawSignals
            : ["authentication", "delivery", "validation"],
      preconditions:
        asStringArray(candidateRecord.preconditions).length > 0
          ? asStringArray(candidateRecord.preconditions)
          : ["Task context is available"],
      strategy:
        asStringArray(candidateRecord.strategy).length >= 2
          ? asStringArray(candidateRecord.strategy)
          : asStringArray(candidateRecord.steps).length >= 2
            ? asStringArray(candidateRecord.steps)
            : [
                "Interpret the task context.",
                "Produce a structured result for downstream reuse."
              ],
      constraints: (() => {
        const constraints = asRecord(candidateRecord.constraints);
        const rules =
          asStringArray(constraints?.rules).length > 0
            ? asStringArray(constraints?.rules)
            : ["Keep the output deterministic and reusable."];
        const notes = asString(constraints?.notes);
        return notes ? { rules, notes } : { rules };
      })(),
      validation:
        asStringArray(candidateRecord.validation).length > 0
          ? asStringArray(candidateRecord.validation)
          : ["Review the result for downstream reuse and clarity."],
      content:
        asString(candidateRecord.content) ||
        `${detail} This reusable strategy was normalized from an LLM response so the workflow can continue without a mock fallback.`
    }
  };
}

function getBaseCandidates() {
  const config = getRuntimeConfig();
  return Array.from(
    new Set([
      config.minimaxBaseUrl,
      config.minimaxBaseUrl.includes("minimaxi.com")
        ? "https://api.minimax.io/v1"
        : "https://api.minimaxi.com/v1"
    ])
  );
}

function parseErrorResponse(body: string) {
  try {
    const parsed = JSON.parse(body) as {
      type?: string;
      error?: {
        type?: string;
        message?: string;
        http_code?: string;
      };
    };

    return {
      providerCode: parsed.error?.type ?? parsed.type,
      message: parsed.error?.message ?? body
    };
  } catch {
    return {
      providerCode: undefined,
      message: body
    };
  }
}

function normalizeMiniMaxError(error: unknown) {
  if (error instanceof MiniMaxError) {
    return error;
  }

  if (error instanceof Error) {
    return new MiniMaxError(error.message);
  }

  return new MiniMaxError("Unknown LLM provider error.");
}

function describeMiniMaxError(error: MiniMaxError): MiniMaxAvailability {
  const checkedAt = new Date().toISOString();
  const config = getRuntimeConfig();
  const model = config.minimaxModelName;

  if (!config.minimaxApiKey) {
    return {
      available: false,
      status: "missing_key",
      message: "The LLM API key is missing.",
      model,
      checkedAt
    };
  }

  if (error.providerCode === "insufficient_balance_error") {
    return {
      available: false,
      status: "insufficient_balance",
      message: "LLM credits are unavailable or exhausted for the current API key.",
      model,
      checkedAt
    };
  }

  if (error.statusCode === 401 || error.statusCode === 403) {
    return {
      available: false,
      status: "auth_error",
      message: "The LLM provider rejected the API key. Verify the key, account scope, and model access.",
      model,
      checkedAt
    };
  }

  if (error.statusCode === 429) {
    return {
      available: false,
      status: "rate_limited",
      message: "The LLM provider is rate limiting the request right now. Retry in a moment.",
      model,
      checkedAt
    };
  }

  if (error.statusCode && error.statusCode >= 500) {
    return {
      available: false,
      status: "server_error",
      message: "The LLM provider is currently unavailable on the server side.",
      model,
      checkedAt
    };
  }

  if (
    error.message.includes("JSON") ||
    error.message.includes("empty response") ||
    error.message.includes("valid JSON")
  ) {
    return {
      available: false,
      status: "invalid_response",
      message: "The LLM provider returned a malformed response for the expected structured output.",
      model,
      checkedAt
    };
  }

  return {
    available: false,
    status: "network_error",
    message: error.message || "The LLM request failed due to a network or timeout issue.",
    model,
    checkedAt
  };
}

async function callMiniMax(
  system: string,
  user: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
) {
  const config = getRuntimeConfig();

  if (!config.minimaxApiKey) {
    throw new MiniMaxError("The LLM API key is missing.");
  }

  let lastError: Error | null = null;

  for (const baseUrl of getBaseCandidates()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.minimaxTimeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.minimaxApiKey}`
        },
        body: JSON.stringify({
          model: config.minimaxModelName,
          temperature: options?.temperature ?? 0.2,
          max_tokens: options?.maxTokens ?? 1400,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text();
        const parsed = parseErrorResponse(body);
        throw new MiniMaxError(
          `LLM request failed (${response.status}): ${parsed.message.slice(0, 500)}`,
          {
            statusCode: response.status,
            providerCode: parsed.providerCode
          }
        );
      }

      return extractContent((await response.json()) as MiniMaxChatResponse);
    } catch (error) {
      clearTimeout(timeout);
      const normalized = normalizeMiniMaxError(error);

      if (normalized.statusCode || normalized.providerCode) {
        throw normalized;
      }

      lastError = normalized;
    }
  }

  throw lastError ?? new MiniMaxError("LLM request failed.");
}

async function generateStructured<T>(
  schema: z.ZodSchema<T>,
  system: string,
  user: string,
  options?: {
    normalize?: (value: unknown) => unknown;
  }
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const retryInstruction =
      attempt === 0
        ? "Return JSON only."
        : "Return only strict JSON matching the requested schema. No prose, no markdown fences, no think tags.";

    try {
      const raw = await callMiniMax(system, `${user}\n\n${retryInstruction}`);
      const parsed = parseJsonResponse(raw);
      const normalized = options?.normalize ? options.normalize(parsed) : parsed;
      return schema.parse(normalized);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function getMiniMaxAvailability(force = false): Promise<MiniMaxAvailability> {
  const cached = global.__hyperforgeMiniMaxAvailability;
  const config = getRuntimeConfig();

  if (!force && cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (!config.minimaxApiKey) {
    const missing = describeMiniMaxError(new MiniMaxError("The LLM API key is missing."));
    global.__hyperforgeMiniMaxAvailability = {
      value: missing,
      expiresAt: Date.now() + 15_000
    };
    return missing;
  }

  try {
    await callMiniMax(
      "You are a connectivity probe. Reply with exactly OK.",
      "Reply with exactly OK.",
      {
        maxTokens: 16,
        temperature: 0
      }
    );

    const ready: MiniMaxAvailability = {
      available: true,
      status: "ready",
      message: "The configured LLM is reachable and ready for task planning.",
      model: config.minimaxModelName,
      checkedAt: new Date().toISOString()
    };

    global.__hyperforgeMiniMaxAvailability = {
      value: ready,
      expiresAt: Date.now() + 30_000
    };

    return ready;
  } catch (error) {
    const availability = describeMiniMaxError(normalizeMiniMaxError(error));
    global.__hyperforgeMiniMaxAvailability = {
      value: availability,
      expiresAt: Date.now() + 15_000
    };
    return availability;
  }
}

export async function planTaskWithMiniMax(task: string): Promise<TaskPlan> {
  const result = await generateStructured(
    planSchema,
    "You are a senior multi-agent orchestrator. Create exactly 3 subtasks for analyst, builder, validator. Preserve a clean DAG. Return JSON only.",
    `Task: ${task}

Requirements:
- Exactly 3 subtasks
- assignedAgent must be analyst, builder, validator in order
- builder depends on analyst title
- validator depends on builder title
- expectedOutput must be concrete`,
    {
      normalize: normalizePlanPayload
    }
  );

  return {
    goal: result.goal,
    subtasks: result.subtasks
  };
}

export async function executeAgentWithMiniMax(params: {
  role: "analyst" | "builder" | "validator";
  task: string;
  subtaskTitle: string;
  subtaskDescription: string;
  completedExecutions: Record<string, AgentExecutionResult>;
  defaultCategory: AgentGeneCandidate["category"];
}): Promise<{
  result: AgentExecutionResult;
  candidate: AgentGeneCandidate;
}> {
  const config = getRuntimeConfig();
  const completed = Object.values(params.completedExecutions)
    .map((item) => ({
      summary: item.summary,
      detail: item.detail
    }))
    .slice(-3);

  const response = await generateStructured(
    agentOutputSchema,
    `You are the ${params.role} agent inside a commercial multi-agent engineering system.
Return JSON only.
Keep the output actionable, concise, and production-grade.
The geneCandidate.category should stay aligned with ${params.defaultCategory}.`,
    `Task: ${params.task}
Subtask title: ${params.subtaskTitle}
Subtask description: ${params.subtaskDescription}
Completed upstream context: ${JSON.stringify(completed)}

Output rules:
- summary: one concise sentence
- detail: detailed but crisp execution result
- signals: 3 to 8 useful signal tags
- artifacts: role-specific structured object
- geneCandidate: reusable strategy extracted from the result
- geneCandidate.category must be "${params.defaultCategory}"
- geneCandidate.content must be at least 80 characters`,
    {
      normalize: (value) => normalizeAgentOutputPayload(value, params.defaultCategory)
    }
  );

  return {
    result: {
      summary: response.summary,
      detail: response.detail,
      signals: response.signals,
      artifacts: {
        ...response.artifacts,
        runtimeProvider: "minimax" satisfies AgentRuntime,
        llmModelName: config.minimaxModelName,
        __geneCandidate: response.geneCandidate
      },
      success: true
    },
    candidate: response.geneCandidate
  };
}
