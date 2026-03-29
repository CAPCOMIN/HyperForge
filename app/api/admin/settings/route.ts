import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";
import { nowIso } from "@/lib/utils/time";

const settingsSchema = z.object({
  minimaxApiKey: z.string().trim().nullable().optional(),
  evomapApiKey: z.string().trim().nullable().optional(),
  evomapNodeId: z.string().trim().nullable().optional(),
  evomapNodeSecret: z.string().trim().nullable().optional()
});

export async function GET() {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ settings: repositories.getAppSettings() });
}

export async function PUT(request: Request) {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const timestamp = nowIso();

  for (const [key, value] of Object.entries(parsed.data)) {
    repositories.upsertAppSetting(
      key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`),
      value ?? null,
      timestamp,
      admin.id
    );
  }

  return NextResponse.json({ ok: true, settings: repositories.getAppSettings() });
}
