import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { repositories } from "@/lib/persistence/repositories";
import type { UserAccount } from "@/lib/types/domain";
import { nowIso } from "@/lib/utils/time";

const updateUserSchema = z.object({
  username: z.string().trim().min(3).optional(),
  displayName: z.string().trim().min(1).optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  quotaLimit: z.number().int().positive().nullable().optional(),
  password: z.string().min(6).optional()
});

function toSafeUser(
  user: (UserAccount & { passwordHash?: string }) | null
) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    quotaLimit: user.quotaLimit,
    passwordVersion: user.passwordVersion,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt
  } satisfies UserAccount;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const existing = repositories.getUserById(userId);

  if (!existing) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  if (
    parsed.data.username &&
    parsed.data.username !== existing.username &&
    repositories.getUserByUsername(parsed.data.username)
  ) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const nextRole = parsed.data.role ?? existing.role;
  const nextStatus = parsed.data.status ?? existing.status;

  if (
    existing.role === "admin" &&
    (nextRole !== "admin" || nextStatus !== "active") &&
    repositories.countAdmins() <= 1
  ) {
    return NextResponse.json({ error: "last_admin_guard" }, { status: 400 });
  }

  const timestamp = nowIso();
  repositories.updateUser({
    ...existing,
    username: parsed.data.username ?? existing.username,
    displayName: parsed.data.displayName ?? existing.displayName,
    role: nextRole,
    status: nextStatus,
    quotaLimit:
      nextRole === "admin"
        ? null
        : parsed.data.quotaLimit !== undefined
          ? parsed.data.quotaLimit
          : existing.quotaLimit ?? 5,
    updatedAt: timestamp
  });

  if (parsed.data.password) {
    repositories.updateUserPassword(userId, hashPassword(parsed.data.password), timestamp);
  }

  return NextResponse.json({
    ok: true,
    user: toSafeUser(repositories.getUserById(userId)),
    quota: repositories.getUserQuotaSnapshot(userId)
  });
}
