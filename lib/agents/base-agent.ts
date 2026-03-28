import type {
  AgentExecutionResult,
  AgentGeneCandidate,
  AgentRole,
  AgentRuntime,
  SubTask,
  TaskPlan
} from "@/lib/types/domain";

export interface AgentContext {
  runId: string;
  inputTask: string;
  agentRuntime: AgentRuntime;
  completedExecutions: Record<string, AgentExecutionResult>;
}

export interface HyperAgent {
  id: string;
  role: AgentRole;
  capabilities: string[];
  plan(inputTask: string, context: AgentContext): Promise<TaskPlan | null>;
  execute(subtask: SubTask, context: AgentContext): Promise<AgentExecutionResult>;
  summarize(result: AgentExecutionResult): string;
  emitGeneCandidate(
    subtask: SubTask,
    result: AgentExecutionResult,
    context: AgentContext
  ): AgentGeneCandidate;
}
