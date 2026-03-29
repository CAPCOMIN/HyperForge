import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateUser,
  createSessionCookieValue,
  getSessionCookieName,
  resolveSafeNextPath
} from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";
import { nowIso } from "@/lib/utils/time";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  next: z.string().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400 }
    );
  }

  const { username, password, next } = parsed.data;
  const user = authenticateUser(username, password);

  if (!user) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 }
    );
  }

  const timestamp = nowIso();
  repositories.touchUserLogin(user.id, timestamp);
  const secure = new URL(request.url).protocol === "https:";

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    },
    next: resolveSafeNextPath(next)
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

  return response;
}
