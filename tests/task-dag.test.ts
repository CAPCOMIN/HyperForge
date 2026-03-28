import { sanitizeTaskPlan, sortSubtasksByDependency } from "@/lib/orchestration/task-dag";
import type { SubTask, TaskPlan } from "@/lib/types/domain";

describe("sanitizeTaskPlan", () => {
  it("resolves numeric dependency references into task titles", () => {
    const plan: TaskPlan = {
      goal: "Write a paper",
      subtasks: [
        {
          title: "Research topic analysis",
          description: "Analyze the topic and gather sources.",
          assignedAgent: "analyst",
          dependsOn: [],
          expectedOutput: "Research outline"
        },
        {
          title: "Draft the paper",
          description: "Write the first draft.",
          assignedAgent: "builder",
          dependsOn: ["1"],
          expectedOutput: "Paper draft"
        },
        {
          title: "Review and validate",
          description: "Review the paper quality.",
          assignedAgent: "validator",
          dependsOn: ["2"],
          expectedOutput: "Review report"
        }
      ]
    };

    const result = sanitizeTaskPlan(plan);

    expect(result.corrected).toBe(true);
    expect(result.plan.subtasks[1]?.dependsOn).toEqual(["Research topic analysis"]);
    expect(result.plan.subtasks[2]?.dependsOn).toEqual(["Draft the paper"]);
  });

  it("falls back to a stable sequential DAG for unresolved dependencies", () => {
    const plan: TaskPlan = {
      goal: "Build a login flow",
      subtasks: [
        {
          title: "Analyze login requirements",
          description: "Capture requirements.",
          assignedAgent: "validator",
          dependsOn: ["builder"],
          expectedOutput: "Analysis"
        },
        {
          title: "Implement login UI",
          description: "Build the UI.",
          assignedAgent: "analyst",
          dependsOn: ["unknown-step"],
          expectedOutput: "Implementation"
        },
        {
          title: "Validate login flow",
          description: "Validate behavior.",
          assignedAgent: "builder",
          dependsOn: ["Implement login UI", "3"],
          expectedOutput: "Validation"
        }
      ]
    };

    const result = sanitizeTaskPlan(plan);

    expect(result.plan.subtasks[0]?.assignedAgent).toBe("analyst");
    expect(result.plan.subtasks[1]?.assignedAgent).toBe("builder");
    expect(result.plan.subtasks[2]?.assignedAgent).toBe("validator");
    expect(result.plan.subtasks[0]?.dependsOn).toEqual([]);
    expect(result.plan.subtasks[1]?.dependsOn).toEqual(["Analyze login requirements"]);
    expect(result.plan.subtasks[2]?.dependsOn).toEqual(["Implement login UI"]);
  });
});

describe("sortSubtasksByDependency", () => {
  it("orders a sanitized task list without throwing", () => {
    const subtasks: SubTask[] = [
      {
        id: "subtask_1",
        runId: "run_1",
        title: "Analyze login requirements",
        description: "Capture requirements.",
        assignedAgent: "analyst",
        dependsOn: [],
        expectedOutput: "Analysis",
        status: "pending",
        outputSummary: ""
      },
      {
        id: "subtask_2",
        runId: "run_1",
        title: "Implement login UI",
        description: "Build the UI.",
        assignedAgent: "builder",
        dependsOn: ["Analyze login requirements"],
        expectedOutput: "Implementation",
        status: "pending",
        outputSummary: ""
      },
      {
        id: "subtask_3",
        runId: "run_1",
        title: "Validate login flow",
        description: "Validate behavior.",
        assignedAgent: "validator",
        dependsOn: ["Implement login UI"],
        expectedOutput: "Validation",
        status: "pending",
        outputSummary: ""
      }
    ];

    expect(sortSubtasksByDependency(subtasks).map((item) => item.title)).toEqual([
      "Analyze login requirements",
      "Implement login UI",
      "Validate login flow"
    ]);
  });
});
