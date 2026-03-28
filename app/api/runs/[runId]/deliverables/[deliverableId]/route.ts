import { NextResponse } from "next/server";
import { getRunDeliverableFile } from "@/lib/deliverables";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      runId: string;
      deliverableId: string;
    }>;
  }
) {
  const { runId, deliverableId } = await context.params;
  const file = getRunDeliverableFile(runId, deliverableId);

  if (!file) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  return new NextResponse(file.content, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
