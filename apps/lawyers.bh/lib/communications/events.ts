/**
 * Server-originated only: a chat message was persisted and is being fanned out
 * to the peer. `decodeClientEvent` never produces this variant, so a client
 * cannot forge a message frame over the socket.
 */
export type CommunicationServerEvent = {
  type: "message.created";
  message: { id: string; senderRole: "client" | "lawyer"; body: string; createdAt: string };
};

/** Events a client is allowed to send over the socket. */
export type ClientCommunicationEvent =
  | { type: "call.invite"; callId: string; mediaKind: "audio" | "video" }
  | { type: "call.rejected" | "call.cancelled" | "call.ended"; callId: string }
  | { type: "signal.offer" | "signal.answer"; callId: string; sdp: string }
  | {
      type: "signal.ice";
      callId: string;
      candidate: string;
      sdpMid?: string | null;
      sdpMLineIndex?: number | null;
    }
  | { type: "ping" };

export type CommunicationClientEvent = ClientCommunicationEvent | CommunicationServerEvent;

const MAX_FRAME_BYTES = 70_000;
const MAX_SDP_LENGTH = 65_536;
const MAX_CANDIDATE_LENGTH = 8_192;

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
) {
  const set = new Set(allowed);

  if (Object.keys(value).some((key) => !set.has(key))) {
    throw new Error("invalid_event_fields");
  }
}

export function decodeClientEvent(
  frame: string,
): ClientCommunicationEvent {
  if (Buffer.byteLength(frame, "utf8") > MAX_FRAME_BYTES) {
    throw new Error("event_too_large");
  }

  let value: unknown;

  try {
    value = JSON.parse(frame);
  } catch {
    throw new Error("invalid_event_json");
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("invalid_event");
  }

  const event = value as Record<string, unknown>;

  if (event.type === "ping") {
    exactKeys(event, ["type"]);

    return {
      type: "ping",
    };
  }

  if (event.type === "call.invite") {
    exactKeys(event, [
      "type",
      "callId",
      "mediaKind",
    ]);

    if (
      typeof event.callId !== "string" ||
      !event.callId ||
      (
        event.mediaKind !== "audio" &&
        event.mediaKind !== "video"
      )
    ) {
      throw new Error("invalid_call_invite");
    }

    return {
      type: "call.invite",
      callId: event.callId,
      mediaKind: event.mediaKind,
    };
  }

  if (
    event.type === "call.rejected" ||
    event.type === "call.cancelled" ||
    event.type === "call.ended"
  ) {
    exactKeys(event, [
      "type",
      "callId",
    ]);

    if (
      typeof event.callId !== "string" ||
      !event.callId
    ) {
      throw new Error("invalid_call_event");
    }

    return {
      type: event.type,
      callId: event.callId,
    };
  }

  if (
    event.type === "signal.offer" ||
    event.type === "signal.answer"
  ) {
    exactKeys(event, [
      "type",
      "callId",
      "sdp",
    ]);

    if (
      typeof event.callId !== "string" ||
      !event.callId ||
      typeof event.sdp !== "string"
    ) {
      throw new Error("invalid_signal");
    }

    if (event.sdp.length > MAX_SDP_LENGTH) {
      throw new Error("event_too_large");
    }

    return {
      type: event.type,
      callId: event.callId,
      sdp: event.sdp,
    };
  }

  if (event.type === "signal.ice") {
    exactKeys(event, [
      "type",
      "callId",
      "candidate",
      "sdpMid",
      "sdpMLineIndex",
    ]);

    if (
      typeof event.callId !== "string" ||
      !event.callId ||
      typeof event.candidate !== "string" ||
      event.candidate.length > MAX_CANDIDATE_LENGTH
    ) {
      throw new Error("invalid_signal");
    }

    if (
      event.sdpMid !== undefined &&
      event.sdpMid !== null &&
      typeof event.sdpMid !== "string"
    ) {
      throw new Error("invalid_signal");
    }

    if (
      event.sdpMLineIndex !== undefined &&
      event.sdpMLineIndex !== null &&
      typeof event.sdpMLineIndex !== "number"
    ) {
      throw new Error("invalid_signal");
    }

    return {
      type: "signal.ice",
      callId: event.callId,
      candidate: event.candidate,
      ...(event.sdpMid !== undefined
        ? {
            sdpMid: event.sdpMid as string | null,
          }
        : {}),
      ...(event.sdpMLineIndex !== undefined
        ? {
            sdpMLineIndex:
              event.sdpMLineIndex as number | null,
          }
        : {}),
    };
  }

  throw new Error("unknown_event_type");
}