import { notFound } from "next/navigation";
import { RunDetailClient } from "@/components/RunDetailClient";
import { getRunDetail } from "@/lib/runs/get-run-detail";

export default async function RunDetailPage({
  params
}: {
  params: Promise<{
    runId: string;
  }>;
}) {
  const { runId } = await params;
  const detail = getRunDetail(runId);

  if (!detail) {
    notFound();
  }

  return <RunDetailClient initialDetail={detail} />;
}
