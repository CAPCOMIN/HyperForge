import type { TaskRunStatus } from "@/lib/types/domain";

const transitions: Record<TaskRunStatus, TaskRunStatus[]> = {
  queued: ["planning", "failed"],
  planning: ["running", "failed"],
  running: ["completed", "failed"],
  completed: [],
  failed: []
};

export function assertRunTransition(current: TaskRunStatus, next: TaskRunStatus) {
  if (!transitions[current].includes(next)) {
    throw new Error(`Invalid run state transition: ${current} -> ${next}`);
  }
}
