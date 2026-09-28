import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communicationCallPushRegistrations,
  communicationCalls,
  communicationMessages,
  communicationSignalEvents,
} from "@/lib/db/schema";

describe("request communication schema contract", () => {
  it("stores durable messages with server identity and idempotency", () => {
    expect(getTableName(communicationMessages)).toBe(
      "bahrain_communication_messages",
    );
    expect(Object.keys(getTableColumns(communicationMessages))).toEqual([
      "id",
      "requestId",
      "senderRole",
      "senderId",
      "clientMessageId",
      "body",
      "createdAt",
      "readAt",
    ]);
  });

  it("stores the authoritative call lifecycle timestamps", () => {
    expect(getTableName(communicationCalls)).toBe(
      "bahrain_communication_calls",
    );
    expect(Object.keys(getTableColumns(communicationCalls))).toEqual([
      "id",
      "requestId",
      "initiatorRole",
      "initiatorId",
      "mediaKind",
      "status",
      "ringingAt",
      "acceptedAt",
      "connectedAt",
      "endedAt",
      "durationSeconds",
      "endReason",
      "endedByRole",
      "createdAt",
      "updatedAt",
    ]);
  });

  it("keeps iOS VoIP tokens separate from ordinary FCM installations", () => {
    expect(getTableName(communicationCallPushRegistrations)).toBe(
      "bahrain_communication_call_push_registrations",
    );
    expect(
      Object.keys(getTableColumns(communicationCallPushRegistrations)),
    ).toEqual([
      "id",
      "requestId",
      "actorRole",
      "actorId",
      "platform",
      "tokenType",
      "token",
      "locale",
      "createdAt",
      "lastSeenAt",
    ]);
  });

  it("stores signaling only as short-lived relay events", () => {
    expect(getTableName(communicationSignalEvents)).toBe(
      "bahrain_communication_signal_events",
    );
    expect(Object.keys(getTableColumns(communicationSignalEvents))).toEqual([
      "id",
      "requestId",
      "senderRole",
      "event",
      "createdAt",
      "expiresAt",
    ]);
  });
});
