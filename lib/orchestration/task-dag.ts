import type { SubTask, TaskPlan } from "@/lib/types/domain";

function normalizeDependencyKey(value: string) {
  return value.trim().toLowerCase();
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

export function sanitizeTaskPlan(plan: TaskPlan) {
  const agentOrder: Array<"analyst" | "builder" | "validator"> = [
    "analyst",
    "builder",
    "validator"
  ];
  const titleByIndex = plan.subtasks.map((subtask) => subtask.title.trim());
  const titleLookup = new Map(
    titleByIndex.map((title, index) => [normalizeDependencyKey(title), index])
  );
  const agentLookup = new Map(
    plan.subtasks.map((subtask, index) => [
      normalizeDependencyKey(subtask.assignedAgent),
      index
    ])
  );
  let corrected = false;

  const subtasks = plan.subtasks.map((subtask, index) => {
    const fallbackDependency = index === 0 ? [] : [titleByIndex[index - 1] as string];
    const normalizedDependsOn = dedupe(
      subtask.dependsOn
        .map((dependency) => {
          const raw = dependency.trim();
          if (!raw) {
            corrected = true;
            return null;
          }

          const numericIndex = Number(raw);
          if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= titleByIndex.length) {
            const resolvedIndex = numericIndex - 1;
            if (resolvedIndex < index) {
              if (raw !== titleByIndex[resolvedIndex]) {
                corrected = true;
              }
              return titleByIndex[resolvedIndex] as string;
            }

            corrected = true;
            return null;
          }

          const normalized = normalizeDependencyKey(raw);
          const titleIndex = titleLookup.get(normalized);
          if (typeof titleIndex === "number") {
            if (titleIndex < index) {
              return titleByIndex[titleIndex] as string;
            }

            corrected = true;
            return null;
          }

          const agentIndex = agentLookup.get(normalized);
          if (typeof agentIndex === "number" && agentIndex < index) {
            corrected = true;
            return titleByIndex[agentIndex] as string;
          }

          corrected = true;
          return null;
        })
        .filter((dependency): dependency is string => Boolean(dependency))
    );

    const finalDependsOn =
      index === 0
        ? []
        : normalizedDependsOn.length > 0
          ? normalizedDependsOn
          : fallbackDependency;

    if (
      subtask.assignedAgent !== agentOrder[index] ||
      subtask.dependsOn.join("|") !== finalDependsOn.join("|")
    ) {
      corrected = true;
    }

    return {
      ...subtask,
      assignedAgent: agentOrder[index] ?? subtask.assignedAgent,
      dependsOn: finalDependsOn
    };
  });

  return {
    plan: {
      ...plan,
      subtasks
    },
    corrected
  };
}

export function sortSubtasksByDependency(subtasks: SubTask[]) {
  const remaining = new Map(subtasks.map((subtask) => [subtask.title, subtask]));
  const completed = new Set<string>();
  const ordered: SubTask[] = [];

  while (remaining.size > 0) {
    const ready = Array.from(remaining.values()).find((subtask) =>
      subtask.dependsOn.every((dependency) => completed.has(dependency))
    );

    if (!ready) {
      const unresolved = Array.from(remaining.values()).map((subtask) => ({
        title: subtask.title,
        dependsOn: subtask.dependsOn
      }));
      throw new Error(
        `Invalid task DAG: cyclic or unresolved dependency. ${JSON.stringify(unresolved)}`
      );
    }

    ordered.push(ready);
    completed.add(ready.title);
    remaining.delete(ready.title);
  }

  return ordered;
}
