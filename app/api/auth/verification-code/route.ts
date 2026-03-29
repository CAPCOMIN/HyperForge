import { NextResponse } from "next/server";
import {
  createRegisterVerificationCode,
  registerVerificationCookieName,
  signRegisterVerificationCode
} from "@/lib/auth/verification";

export async function GET(request: Request) {
  const code = createRegisterVerificationCode();
  const secure = new URL(request.url).protocol === "https:";

  const response = NextResponse.json({
    code,
    expiresInSeconds: 300
  });

  response.cookies.set({
    name: registerVerificationCookieName,
    value: signRegisterVerificationCode(code),
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 300
  });

  return response;
}
