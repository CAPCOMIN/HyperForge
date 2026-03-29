import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/utils/env";

export interface SessionUser {
  username: string;
  displayName: string;
}

const SESSION_COOKIE_NAME = "hyperforge_session";
const SESSION_VERSION = 1;

function getAuthConfig() {
  if (
    !env.AUTH_BOOTSTRAP_USERNAME ||
    !env.AUTH_BOOTSTRAP_PASSWORD ||
    !env.AUTH_BOOTSTRAP_DISPLAY_NAME ||
    !env.AUTH_SESSION_SECRET
  ) {
    throw new Error(
      "Authentication is not configured. Set AUTH_BOOTSTRAP_USERNAME, AUTH_BOOTSTRAP_PASSWORD, AUTH_BOOTSTRAP_DISPLAY_NAME, and AUTH_SESSION_SECRET in the server environment."
    );
  }

  return {
    username: env.AUTH_BOOTSTRAP_USERNAME,
    password: env.AUTH_BOOTSTRAP_PASSWORD,
    displayName: env.AUTH_BOOTSTRAP_DISPLAY_NAME,
    sessionSecret: env.AUTH_SESSION_SECRET
  };
}

export function resolveSafeNextPath(nextPath?: string | null) {
  if (
    !nextPath ||
    !nextPath.startsWith("/") ||
    nextPath.startsWith("//") ||
    nextPath === "/login"
  ) {
    return "/";
  }

  return nextPath;
}

export function validateLoginCredentials(username: string, password: string) {
  const auth = getAuthConfig();
  return (
    username === auth.username &&
    password === auth.password
  );
}

export function getDefaultSessionUser(): SessionUser {
  const auth = getAuthConfig();
  return {
    username: auth.username,
    displayName: auth.displayName
  };
}

function signSessionPayload(value: string) {
  const auth = getAuthConfig();
  return createHmac("sha256", auth.sessionSecret)
    .update(value)
    .digest("hex");
}

export function createSessionCookieValue(username: string) {
  const payload = Buffer.from(
    JSON.stringify({
      v: SESSION_VERSION,
      u: username
    })
  ).toString("base64url");

  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function verifySessionCookieValue(value?: string | null) {
  const auth = getAuthConfig();

  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as {
      v?: number;
      u?: string;
    };

    if (
      decoded.v !== SESSION_VERSION ||
      decoded.u !== auth.username
    ) {
      return null;
    }

    return decoded.u;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!verifySessionCookieValue(session)) {
    return null;
  }

  return getDefaultSessionUser();
}

export async function requireSessionUser(nextPath?: string) {
  const user = await getSessionUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(resolveSafeNextPath(nextPath))}` as never
    );
  }

  return user;
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
