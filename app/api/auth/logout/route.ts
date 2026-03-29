import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth/session";

export async function POST(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0
  });
  return response;
}
