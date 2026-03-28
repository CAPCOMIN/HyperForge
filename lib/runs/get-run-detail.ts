import { getRunDeliverables } from "@/lib/deliverables";
import { repositories } from "@/lib/persistence/repositories";

export function getRunDetail(runId: string) {
  const detail = repositories.getRunDetail(runId);

  if (!detail) {
    return null;
  }

  return {
    ...detail,
    deliverables: getRunDeliverables(runId, detail.run.status)
  };
}
