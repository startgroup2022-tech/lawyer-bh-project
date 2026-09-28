import { describe, expect, it } from "vitest";
import { decodeClientEvent } from "./events";

describe("communication socket event codec", () => {
  it("accepts scoped signaling without actor or request identity", () => {
    expect(decodeClientEvent(JSON.stringify({ type: "signal.offer", callId: "call-1", sdp: "v=0" }))).toEqual({ type: "signal.offer", callId: "call-1", sdp: "v=0" });
  });
  it("accepts a scoped call invitation with media kind", () => {
    expect(decodeClientEvent(JSON.stringify({ type: "call.invite", callId: "call-1", mediaKind: "video" }))).toEqual({ type: "call.invite", callId: "call-1", mediaKind: "video" });
  });
  it.each([
    JSON.stringify({ type: "signal.offer", callId: "call-1", sdp: "v=0", actorId: "spoof" }),
    JSON.stringify({ type: "signal.ice", callId: "call-1", candidate: "x", requestId: "other" }),
    JSON.stringify({ type: "unknown" }),
    "not-json",
  ])("rejects unsafe or malformed frames", (frame) => expect(() => decodeClientEvent(frame)).toThrow());
  it("rejects oversized signaling", () => {
    expect(() => decodeClientEvent(JSON.stringify({ type: "signal.offer", callId: "call-1", sdp: "x".repeat(65_537) }))).toThrow("too_large");
  });
});
