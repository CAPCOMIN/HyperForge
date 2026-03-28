import type { AgentContext, HyperAgent } from "@/lib/agents/base-agent";
import type {
  AgentExecutionResult,
  AgentGeneCandidate,
  SubTask
} from "@/lib/types/domain";
import { executeAgentWithMiniMax } from "@/lib/llm/minimax";
import { extractSignals } from "@/lib/genes/signal-extractor";
import { runMockValidation } from "@/lib/demo/mock-validation";

export class ValidatorAgent implements HyperAgent {
  id = "agent_validator";
  role = "validator" as const;
  capabilities = ["acceptance", "verification_plan", "regression_strategy"];

  async plan() {
    return null;
  }

  async execute(subtask: SubTask, context: AgentContext): Promise<AgentExecutionResult> {
    if (context.agentRuntime === "minimax") {
      const { result } = await executeAgentWithMiniMax({
        role: "validator",
        task: context.inputTask,
        subtaskTitle: subtask.title,
        subtaskDescription: subtask.description,
        completedExecutions: context.completedExecutions,
        defaultCategory: "regulatory"
      });

      return result;
    }

    const builderSummary = Object.values(context.completedExecutions)
      .map((item) => item.summary)
      .join(" | ");
    const validation = runMockValidation(context.inputTask, builderSummary);
    const signals = extractSignals(context.inputTask, validation.outcome);

    return {
      summary: "Validator produced acceptance checks and demo-safe verification output.",
      detail: `${validation.outcome}\n\nChecks:\n- ${validation.checks.join("\n- ")}`,
      signals,
      artifacts: validation,
      success: true
    };
  }

  summarize(result: AgentExecutionResult) {
    return result.summary;
  }

  emitGeneCandidate(
    subtask: SubTask,
    result: AgentExecutionResult,
    _context: AgentContext
  ): AgentGeneCandidate {
    const modelCandidate = result.artifacts.__geneCandidate;
    if (modelCandidate) {
      return modelCandidate as AgentGeneCandidate;
    }

    return {
      summary: `${subtask.title}: reusable validation scaffold`,
      category: "regulatory",
      signalsMatch: result.signals,
      preconditions: ["Implementation plan or patch output exists"],
      strategy: [
        "Define a bounded acceptance matrix.",
        "Cover happy path, error path, and regression path.",
        "Convert verification into an auditable capsule outcome."
      ],
      constraints: {
        rules: [
          "Validation should be deterministic in demo mode",
          "Keep checks human-readable for judges"
        ]
      },
      validation: ["Outcome score must remain above 0.5", "Every check must map to a user-visible behavior"],
      content:
        "The validator capsule packages test criteria, acceptance gates, and a scored outcome so future runs can inherit a consistent verification baseline."
    };
  }
}
