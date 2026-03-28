import { NextResponse } from "next/server";
import { sendHeartbeat } from "@/lib/evomap/heartbeat";

export async function POST() {
  const result = await sendHeartbeat();
  return NextResponse.json(result);
}
