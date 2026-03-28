import { NextResponse } from "next/server";
import { repositories } from "@/lib/persistence/repositories";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const detail = repositories.getRunDetail(runId);

  if (!detail) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
