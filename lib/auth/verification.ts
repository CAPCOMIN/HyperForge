import { createHash } from "crypto";

export const registerVerificationCookieName = "hf_register_challenge";

export function createRegisterVerificationCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export function signRegisterVerificationCode(code: string) {
  return createHash("sha256")
    .update(`${code}:hyperforge-register`)
    .digest("hex");
}
