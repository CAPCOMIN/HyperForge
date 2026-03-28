import type { TaskPlan } from "@/lib/types/domain";

export function createTaskPlan(inputTask: string): TaskPlan {
  return {
    goal: inputTask,
    subtasks: [
      {
        title: "Context and requirement analysis",
        description:
          "Interpret the task, extract signals, clarify scope, and define dependency anchors.",
        assignedAgent: "analyst",
        dependsOn: [],
        expectedOutput: "Structured analysis summary with reusable signals."
      },
      {
        title: "Implementation and delivery plan",
        description:
          "Turn the analysis into a concrete implementation sequence, mock patch plan, and delivery artifacts.",
        assignedAgent: "builder",
        dependsOn: ["Context and requirement analysis"],
        expectedOutput: "Mock implementation plan, file surface, and patch notes."
      },
      {
        title: "Validation and acceptance design",
        description:
          "Create acceptance criteria, regression checks, and demo-safe verification artifacts.",
        assignedAgent: "validator",
        dependsOn: ["Implementation and delivery plan"],
        expectedOutput: "Validation matrix, risk notes, and acceptance outcome."
      }
    ]
  };
}
