import type { AgentContext, HyperAgent } from "@/lib/agents/base-agent";
import type { AgentExecutionResult, SubTask, TaskPlan } from "@/lib/types/domain";
import { planTaskWithMiniMax } from "@/lib/llm/minimax";
import { createTaskPlan } from "@/lib/orchestration/task-planner";

export class MasterAgent implements HyperAgent {
  id = "agent_master";
  role = "master" as const;
  capabilities = ["plan", "summarize", "compose_recipe"];

  async plan(inputTask: string, context: AgentContext): Promise<TaskPlan> {
    if (context.agentRuntime === "minimax") {
      return await planTaskWithMiniMax(inputTask);
    }

    return createTaskPlan(inputTask);
  }

  async execute(_subtask: SubTask): Promise<AgentExecutionResult> {
    return {
      summary: "Master agent does not execute leaf subtasks in phase 1.",
      detail: "Execution is delegated to Analyst, Builder, and Validator.",
      signals: [],
      artifacts: {},
      success: true
    };
  }

  summarize(result: AgentExecutionResult) {
    return result.summary;
  }

  emitGeneCandidate() {
    return {
      summary: "Master orchestration blueprint",
      category: "regulatory" as const,
      signalsMatch: ["orchestration", "dag"],
      preconditions: ["A run is initiated"],
      strategy: ["Create DAG", "Dispatch agents", "Collect results"],
      constraints: {
        rules: ["Keep execution deterministic"]
      },
      validation: ["Verify every dependency is satisfied before execution"],
      content:
        "This regulatory candidate is reserved for a phase-two supervisory gene and is not published in phase one."
    };
  }
}
