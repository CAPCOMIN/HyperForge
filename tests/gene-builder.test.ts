import { buildGeneDraft } from "@/lib/genes/gene-builder";

describe("buildGeneDraft", () => {
  it("builds a structured gene payload with an asset id", () => {
    const gene = buildGeneDraft({
      runId: "run_1",
      sourceSubtaskId: "subtask_1",
      candidate: {
        summary: "Reusable analysis pattern",
        category: "innovate",
        signalsMatch: ["login", "session"],
        preconditions: ["Complex task exists"],
        strategy: ["Analyze scope", "Extract signals"],
        constraints: {
          rules: ["Keep output explicit"]
        },
        validation: ["Signals should feed later steps"],
        content: "Analysis artifact content that is long enough to be useful."
      },
      execution: {
        id: "exec_1",
        runId: "run_1",
        subtaskId: "subtask_1",
        agentRole: "analyst",
        status: "completed",
        summary: "Done",
        detail: "Done",
        signals: ["login"],
        artifacts: {},
        createdAt: new Date().toISOString()
      }
    });

    expect(gene.assetId.startsWith("sha256:")).toBe(true);
    expect(gene.payload.type).toBe("Gene");
    expect(gene.payload.summary).toBe("Reusable analysis pattern");
  });
});
