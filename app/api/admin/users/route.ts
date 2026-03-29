import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { repositories } from "@/lib/persistence/repositories";
import type { UserAccount } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

const createUserSchema = z.object({
  username: z.string().trim().min(3),
  displayName: z.string().trim().min(1),
  password: z.string().min(6),
  role: z.enum(["admin", "user"]).default("user"),
  status: z.enum(["active", "disabled"]).default("active"),
  quotaLimit: z.number().int().positive().nullable().optional()
});

export async function GET() {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = repositories.listUsers().map((user) => ({
    ...user,
    quota: repositories.getUserQuotaSnapshot(user.id)
  }));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const admin = await getSessionUser();

  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (repositories.getUserByUsername(parsed.data.username)) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const timestamp = nowIso();
  const user: UserAccount = {
    id: createId("user"),
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
    status: parsed.data.status,
    quotaLimit:
      parsed.data.role === "admin" ? null : (parsed.data.quotaLimit ?? 5),
    passwordVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: null
  };

  repositories.createUser({
    ...user,
    passwordHash: hashPassword(parsed.data.password)
  });

  return NextResponse.json({
    ok: true,
    user,
    quota: repositories.getUserQuotaSnapshot(user.id)
  });
}
