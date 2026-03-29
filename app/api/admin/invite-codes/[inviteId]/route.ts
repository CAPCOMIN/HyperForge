import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";
import { nowIso } from "@/lib/utils/time";

const updateInviteSchema = z.object({
  note: z.string().trim().nullable().optional(),
  status: z.enum(["active", "disabled", "exhausted"]).optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().nullable().optional()
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ inviteId: string }> }
) {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { inviteId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateInviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const invite = repositories.getInviteCodeById(inviteId);

  if (!invite) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }

  repositories.updateInviteCode({
    ...invite,
    note: parsed.data.note !== undefined ? parsed.data.note : invite.note,
    status: parsed.data.status ?? invite.status,
    maxUses: parsed.data.maxUses ?? invite.maxUses,
    expiresAt: parsed.data.expiresAt !== undefined ? parsed.data.expiresAt : invite.expiresAt,
    updatedAt: nowIso()
  });

  return NextResponse.json({ ok: true, inviteCode: repositories.getInviteCodeById(inviteId) });
}
