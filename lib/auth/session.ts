import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionUser, UserAccount } from "@/lib/types/domain";
import { verifyPassword } from "@/lib/auth/password";
import { repositories } from "@/lib/persistence/repositories";
import { env } from "@/lib/utils/env";

const SESSION_COOKIE_NAME = "hyperforge_session";
const SESSION_VERSION = 2;

function getSessionSecret() {
  if (!env.AUTH_SESSION_SECRET) {
    throw new Error("AUTH_SESSION_SECRET is not configured.");
  }

  return env.AUTH_SESSION_SECRET;
}

function signSessionPayload(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function toSessionUser(user: UserAccount): SessionUser {
  const quota = repositories.getUserQuotaSnapshot(user.id);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    quota:
      quota ?? {
        limit: user.quotaLimit,
        used: 0,
        remaining: user.quotaLimit
      }
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

export function authenticateUser(username: string, password: string) {
  const user = repositories.getUserByUsername(username);

  if (!user || user.status !== "active") {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return user;
}

export function createSessionCookieValue(user: UserAccount) {
  const payload = Buffer.from(
    JSON.stringify({
      v: SESSION_VERSION,
      uid: user.id,
      pv: user.passwordVersion
    })
  ).toString("base64url");

  return `${payload}.${signSessionPayload(payload)}`;
}

function verifySessionCookieValue(value?: string | null) {
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

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as {
      v?: number;
      uid?: string;
      pv?: number;
    };

    if (
      decoded.v !== SESSION_VERSION ||
      !decoded.uid ||
      typeof decoded.pv !== "number"
    ) {
      return null;
    }

    const user = repositories.getUserById(decoded.uid);

    if (
      !user ||
      user.status !== "active" ||
      user.passwordVersion !== decoded.pv
    ) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = verifySessionCookieValue(session);

  if (!user) {
    return null;
  }

  return toSessionUser(user);
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

export async function requireAdminUser(nextPath?: string) {
  const user = await requireSessionUser(nextPath);

  if (user.role !== "admin") {
    redirect("/" as never);
  }

  return user;
}

export function ensureRunQuota(user: SessionUser) {
  if (user.quota.limit !== null && user.quota.used >= user.quota.limit) {
    throw new Error("quota_exceeded");
  }
}

export function canAccessRun(user: SessionUser, runUserId: string) {
  return user.role === "admin" || user.id === runUserId;
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
