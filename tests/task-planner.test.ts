import { createTaskPlan } from "@/lib/orchestration/task-planner";

describe("createTaskPlan", () => {
  it("creates a 3-step dependency-aware plan", () => {
    const plan = createTaskPlan("Build a login flow");

    expect(plan.subtasks).toHaveLength(3);
    expect(plan.subtasks[1]?.dependsOn).toEqual(["Context and requirement analysis"]);
    expect(plan.subtasks[2]?.dependsOn).toEqual(["Implementation and delivery plan"]);
  });
});
