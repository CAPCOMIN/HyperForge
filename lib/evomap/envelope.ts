import type { EvoMapEnvelope } from "@/lib/evomap/types";
import { createMessageId } from "@/lib/utils/ids";
import { nowIso } from "@/lib/utils/time";

export function buildEnvelope<TPayload>(params: {
  messageType: string;
  senderId: string;
  payload: TPayload;
}): EvoMapEnvelope<TPayload> {
  return {
    protocol: "gep-a2a",
    protocol_version: "1.0.0",
    message_type: params.messageType,
    message_id: createMessageId(),
    sender_id: params.senderId,
    timestamp: nowIso(),
    payload: params.payload
  };
}

export function unwrapEvoMapResponse<T>(value: unknown): T {
  if (value && typeof value === "object" && "payload" in (value as Record<string, unknown>)) {
    return (value as { payload: T }).payload;
  }

  return value as T;
}
