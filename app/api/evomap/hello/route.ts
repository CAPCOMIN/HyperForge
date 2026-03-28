import { NextResponse } from "next/server";
import { ensureNodeIdentity } from "@/lib/evomap/auth";

export async function POST() {
  const result = await ensureNodeIdentity("master");
  return NextResponse.json({
    senderId: result.senderId,
    status: result.status
  });
}
