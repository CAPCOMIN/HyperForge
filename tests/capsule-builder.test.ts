import { buildCapsuleDraft } from "@/lib/genes/capsule-builder";
import { buildGeneDraft } from "@/lib/genes/gene-builder";

describe("buildCapsuleDraft", () => {
  it("builds a capsule linked to a gene", () => {
    const execution = {
      id: "exec_1",
      runId: "run_1",
      subtaskId: "subtask_1",
      agentRole: "builder" as const,
      status: "completed" as const,
      summary: "Builder done",
      detail: "Builder detail",
      signals: ["login", "form"],
      artifacts: {},
      createdAt: new Date().toISOString()
    };

    const candidate = {
      summary: "Builder pattern",
      category: "repair" as const,
      signalsMatch: ["login", "form"],
      preconditions: ["Analysis exists"],
      strategy: ["Map files", "Plan steps"],
      constraints: {
        rules: ["Demo-safe"]
      },
      validation: ["Every file is named"],
      content:
        "The capsule content stores enough detail to satisfy the minimum substance threshold for a demo-safe publish payload."
    };

    const gene = buildGeneDraft({
      runId: "run_1",
      sourceSubtaskId: "subtask_1",
      candidate,
      execution
    });

    const capsule = buildCapsuleDraft({
      runId: "run_1",
      sourceSubtaskId: "subtask_1",
      gene,
      candidate,
      execution
    });

    expect(capsule.payload.type).toBe("Capsule");
    expect(capsule.payload.gene).toBe(gene.assetId);
    expect(capsule.assetId.startsWith("sha256:")).toBe(true);
  });
});
