import { describe, expect, it } from "vitest";
import { decodeQueueCursor, encodeQueueCursor } from "./queue-cursor";

describe("admin queue cursor", () => {
  it("round-trips a timestamp and id without exposing arbitrary SQL input", () => {
    const value = encodeQueueCursor("2026-09-20T08:00:00.000Z", "11111111-1111-4111-8111-111111111111");
    expect(decodeQueueCursor(value)).toEqual({ at: "2026-09-20T08:00:00.000Z", id: "11111111-1111-4111-8111-111111111111" });
    expect(decodeQueueCursor("garbage")).toBeNull();
  });
});
