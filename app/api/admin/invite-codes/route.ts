import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";
import type { InviteCode } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

const createInviteSchema = z.object({
  note: z.string().trim().nullable().optional(),
  maxUses: z.number().int().positive().default(1),
  expiresAt: z.string().datetime().nullable().optional()
});

function randomInviteCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function GET() {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ inviteCodes: repositories.listInviteCodes() });
}

export async function POST(request: Request) {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const timestamp = nowIso();
  const inviteCode: InviteCode = {
    id: createId("invite"),
    code: randomInviteCode(),
    note: parsed.data.note ?? null,
    createdByUserId: admin.id,
    maxUses: parsed.data.maxUses,
    usedCount: 0,
    status: "active",
    expiresAt: parsed.data.expiresAt ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  repositories.createInviteCode(inviteCode);

  return NextResponse.json({ ok: true, inviteCode });
}
