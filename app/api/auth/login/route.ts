import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionCookieValue,
  getDefaultSessionUser,
  getSessionCookieName,
  resolveSafeNextPath,
  validateLoginCredentials
} from "@/lib/auth/session";

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

  if (!validateLoginCredentials(username, password)) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 }
    );
  }

  const user = getDefaultSessionUser();
  const response = NextResponse.json({
    ok: true,
    user,
    next: resolveSafeNextPath(next)
  });

  response.cookies.set({
    name: getSessionCookieName(),
    value: createSessionCookieValue(user.username),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
