import { randomBytes, randomUUID } from "crypto";

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

export function createMessageId() {
  return `msg_${Date.now()}_${randomBytes(4).toString("hex")}`;
}

export function createNodeId(role: string) {
  return `node_${role}_${randomBytes(6).toString("hex")}`;
}

export function createSecret() {
  return randomBytes(32).toString("hex");
}
