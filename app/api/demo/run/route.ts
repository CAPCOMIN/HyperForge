import { NextResponse } from "next/server";
import { getMiniMaxAvailability } from "@/lib/llm/minimax";
import { demoRunRequestSchema } from "@/lib/types/api";
import { startDemoTask } from "@/lib/orchestration/task-runner";
import { env } from "@/lib/utils/env";

export async function POST(request: Request) {
  const body = await request.json();
  const input = demoRunRequestSchema.parse(body);

  if (input.agentRuntime === "minimax" && !env.MINIMAX_API_KEY) {
    return NextResponse.json(
      { error: "MINIMAX_API_KEY is missing. Minimax runtime is unavailable." },
      { status: 400 }
    );
  }

  if (input.agentRuntime === "minimax") {
    const availability = await getMiniMaxAvailability();

    if (!availability.available) {
      return NextResponse.json(
        {
          error: availability.message,
          status: availability.status,
          model: availability.model,
          checkedAt: availability.checkedAt
        },
        { status: 503 }
      );
    }
  }

  const result = startDemoTask(input.task, input.mode, input.agentRuntime);

  return NextResponse.json({
    runId: result.runId,
    status: result.status
  });
}
