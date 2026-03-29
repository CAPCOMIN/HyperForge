import { NextResponse } from "next/server";
import { canAccessRun, getSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";
import { getRunDetail } from "@/lib/runs/get-run-detail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await context.params;
  const run = repositories.getRun(runId);

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (!canAccessRun(sessionUser, run.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const detail = getRunDetail(runId);

  if (!detail) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
