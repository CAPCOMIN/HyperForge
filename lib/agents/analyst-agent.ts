import type { AgentContext, HyperAgent } from "@/lib/agents/base-agent";
import type {
  AgentExecutionResult,
  AgentGeneCandidate,
  SubTask
} from "@/lib/types/domain";
import { executeAgentWithMiniMax } from "@/lib/llm/minimax";
import { extractSignals } from "@/lib/genes/signal-extractor";

export class AnalystAgent implements HyperAgent {
  id = "agent_analyst";
  role = "analyst" as const;
  capabilities = ["context_analysis", "signal_extraction", "requirements"];

  async plan() {
    return null;
  }

  async execute(subtask: SubTask, context: AgentContext): Promise<AgentExecutionResult> {
    if (context.agentRuntime === "minimax") {
      const { result } = await executeAgentWithMiniMax({
        role: "analyst",
        task: context.inputTask,
        subtaskTitle: subtask.title,
        subtaskDescription: subtask.description,
        completedExecutions: context.completedExecutions,
        defaultCategory: "innovate"
      });

      return result;
    }

    const signals = extractSignals(context.inputTask, subtask.description);

    return {
      summary: "Analyst clarified the objective, scope, and delivery signals.",
      detail: `Goal: ${context.inputTask}\n\nScope boundaries: keep the runtime demo-safe, emphasize login flow, interface stability, and downstream validation hooks.\n\nSignals: ${signals.join(", ")}.`,
      signals,
      artifacts: {
        requirements: [
          "Capture the user journey and state transitions.",
          "Identify dependencies for implementation and validation.",
          "Preserve artifacts for later Gene extraction."
        ]
      },
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
      summary: `${subtask.title}: reusable analysis strategy`,
      category: "innovate",
      signalsMatch: result.signals,
      preconditions: ["A complex delivery request exists", "No implementation has started"],
      strategy: [
        "Extract user intent and hard constraints.",
        "Translate open text into work packages and validation hooks.",
        "Surface reusable signals for downstream agents."
      ],
      constraints: {
        rules: ["Keep findings implementation-agnostic", "Prefer explicit dependencies"]
      },
      validation: ["Check every later subtask can cite at least one analyst signal"],
      content:
        "The analyst capsule captures the problem framing, major signals, and expected deliverables so downstream agents can inherit a stable context scaffold."
    };
  }
}
