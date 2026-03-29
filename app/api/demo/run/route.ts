import { NextResponse } from "next/server";
import { ensureRunQuota, getSessionUser } from "@/lib/auth/session";
import { getRuntimeConfig } from "@/lib/config/runtime";
import { getMiniMaxAvailability } from "@/lib/llm/minimax";
import { demoRunRequestSchema } from "@/lib/types/api";
import { startDemoTask } from "@/lib/orchestration/task-runner";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const input = demoRunRequestSchema.parse(body);
  const runtimeConfig = getRuntimeConfig();

  try {
    ensureRunQuota(sessionUser);
  } catch {
    return NextResponse.json(
      { error: "quota_exceeded", message: "Conversation quota reached for this account." },
      { status: 403 }
    );
  }

  if (input.agentRuntime === "minimax" && !runtimeConfig.minimaxApiKey) {
    return NextResponse.json(
      { error: "The LLM API key is missing. The LLM runtime is unavailable." },
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

  const result = startDemoTask(sessionUser, input.task, input.mode, input.agentRuntime);

  return NextResponse.json({
    runId: result.runId,
    status: result.status
  });
}
