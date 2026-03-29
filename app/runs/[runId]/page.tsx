import { notFound } from "next/navigation";
import { RunDetailClient } from "@/components/RunDetailClient";
import { canAccessRun, requireSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";
import { getRunDetail } from "@/lib/runs/get-run-detail";

export default async function RunDetailPage({
  params
}: {
  params: Promise<{
    runId: string;
  }>;
}) {
  const { runId } = await params;
  const user = await requireSessionUser(`/runs/${runId}`);
  const run = repositories.getRun(runId);

  if (!run || !canAccessRun(user, run.userId)) {
    notFound();
  }

  const detail = getRunDetail(runId);

  if (!detail) {
    notFound();
  }

  return <RunDetailClient initialDetail={detail} />;
}
