import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookieValue, getSessionCookieName } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import {
  registerVerificationCookieName,
  signRegisterVerificationCode
} from "@/lib/auth/verification";
import { repositories } from "@/lib/persistence/repositories";
import type { UserAccount } from "@/lib/types/domain";
import { createId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

const registerSchema = z.object({
  verificationCode: z.string().trim().min(4),
  inviteCode: z.string().trim().min(4),
  username: z.string().trim().min(3),
  displayName: z.string().trim().min(1),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const verificationCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${registerVerificationCookieName}=`))
    ?.split("=")[1];

  if (
    !verificationCookie ||
    verificationCookie !== signRegisterVerificationCode(parsed.data.verificationCode.toUpperCase())
  ) {
    return NextResponse.json({ error: "verification_invalid" }, { status: 400 });
  }

  const invite = repositories.getInviteCodeByCode(parsed.data.inviteCode);

  if (!invite) {
    return NextResponse.json({ error: "invite_invalid" }, { status: 404 });
  }

  if (invite.status !== "active") {
    return NextResponse.json({ error: "invite_unavailable" }, { status: 400 });
  }

  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "invite_expired" }, { status: 400 });
  }

  if (invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: "invite_exhausted" }, { status: 400 });
  }

  if (repositories.getUserByUsername(parsed.data.username)) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  const timestamp = nowIso();
  const user: UserAccount = {
    id: createId("user"),
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    role: "user",
    status: "active",
    quotaLimit: 5,
    passwordVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: timestamp
  };

  repositories.createUser({
    ...user,
    passwordHash: hashPassword(parsed.data.password)
  });
  repositories.consumeInviteCode(invite.id, timestamp);
  const secure = new URL(request.url).protocol === "https:";

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    },
    next: "/"
  });

  response.cookies.set({
    name: getSessionCookieName(),
    value: createSessionCookieValue(user),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  response.cookies.set({
    name: registerVerificationCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0
  });

  return response;
}
