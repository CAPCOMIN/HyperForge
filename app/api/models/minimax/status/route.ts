import { NextResponse } from "next/server";
import { getMiniMaxAvailability } from "@/lib/llm/minimax";

export async function GET() {
  const availability = await getMiniMaxAvailability(true);

  return NextResponse.json(availability, {
    status: availability.available ? 200 : 503
  });
}
