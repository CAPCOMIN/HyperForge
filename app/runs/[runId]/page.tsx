import { notFound } from "next/navigation";
import { RunDetailClient } from "@/components/RunDetailClient";
import { repositories } from "@/lib/persistence/repositories";

export default async function RunDetailPage({
  params
}: {
  params: Promise<{
    runId: string;
  }>;
}) {
  const { runId } = await params;
  const detail = repositories.getRunDetail(runId);

  if (!detail) {
    notFound();
  }

  return <RunDetailClient initialDetail={detail} />;
}
