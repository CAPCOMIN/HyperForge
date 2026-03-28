import type { AgentContext, HyperAgent } from "@/lib/agents/base-agent";
import type {
  AgentExecutionResult,
  AgentGeneCandidate,
  SubTask
} from "@/lib/types/domain";
import { executeAgentWithMiniMax } from "@/lib/llm/minimax";
import { extractSignals } from "@/lib/genes/signal-extractor";
import { runMockBuilder } from "@/lib/demo/mock-executor";

export class BuilderAgent implements HyperAgent {
  id = "agent_builder";
  role = "builder" as const;
  capabilities = ["implementation_plan", "mock_patch", "delivery_plan"];

  async plan() {
    return null;
  }

  async execute(subtask: SubTask, context: AgentContext): Promise<AgentExecutionResult> {
    if (context.agentRuntime === "minimax") {
      const { result } = await executeAgentWithMiniMax({
        role: "builder",
        task: context.inputTask,
        subtaskTitle: subtask.title,
        subtaskDescription: subtask.description,
        completedExecutions: context.completedExecutions,
        defaultCategory: "repair"
      });

      return result;
    }

    const analystContext = Object.values(context.completedExecutions)
      .map((item) => item.summary)
      .join(" | ");
    const mock = runMockBuilder(context.inputTask, analystContext);
    const signals = extractSignals(context.inputTask, mock.patchSummary);

    return {
      summary: "Builder produced a mock patch plan and implementation sequence.",
      detail: `${mock.patchSummary}\n\nFiles: ${mock.files.join(", ")}\n\nSteps:\n- ${mock.steps.join("\n- ")}`,
      signals,
      artifacts: mock,
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

    const files = Array.isArray(result.artifacts.files)
      ? (result.artifacts.files as string[])
      : [];

    return {
      summary: `${subtask.title}: implementation pattern`,
      category: "repair",
      signalsMatch: result.signals,
      preconditions: ["Analysis context is available", "Project needs a concrete delivery plan"],
      strategy: [
        "Map the task to a minimal file surface.",
        "Sequence implementation steps for the mock executor.",
        "Preserve outputs as structured patch notes for future sandbox replay."
      ],
      constraints: {
        rules: [
          "Do not assume a live repo sandbox",
          `Touch no more than ${files.length || 3} files in the demo plan`
        ]
      },
      validation: ["Ensure every change maps to an explicit file or interface"],
      content:
        "The builder capsule stores patch intent, affected files, and implementation steps so the same delivery pattern can later be replayed by a real executor."
    };
  }
}
