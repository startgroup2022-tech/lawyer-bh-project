import { describe, expect, it } from "vitest";

import { evaluateCommunicationCapabilities } from "./policy";

describe("communication safety policy", () => {
  it("keeps reads available while a user blocks the peer", () => {
    expect(
      evaluateCommunicationCapabilities({
        blockedByMe: true,
        blockedByPeer: false,
        chatSuspendedUntil: null,
      }),
    ).toEqual({
      read: true,
      send: false,
      attach: false,
      call: false,
      canReport: true,
      canBlock: false,
      canUnblock: true,
    });
  });

  it("does not reveal a peer block through different communication capabilities", () => {
    expect(
      evaluateCommunicationCapabilities({
        blockedByMe: false,
        blockedByPeer: true,
        chatSuspendedUntil: null,
      }),
    ).toEqual({
      read: true,
      send: false,
      attach: false,
      call: false,
      canReport: true,
      canBlock: true,
      canUnblock: false,
    });
  });

  it("disables personal communication during an active chat suspension", () => {
    expect(
      evaluateCommunicationCapabilities(
        {
          blockedByMe: false,
          blockedByPeer: false,
          chatSuspendedUntil: "2099-01-01T00:00:00.000Z",
        },
        new Date("2026-09-22T00:00:00.000Z"),
      ),
    ).toMatchObject({
      read: true,
      send: false,
      attach: false,
      call: false,
    });
  });

  it("restores personal communication after a suspension expires", () => {
    expect(
      evaluateCommunicationCapabilities(
        {
          blockedByMe: false,
          blockedByPeer: false,
          chatSuspendedUntil: "2026-09-21T23:59:59.000Z",
        },
        new Date("2026-09-22T00:00:00.000Z"),
      ),
    ).toEqual({
      read: true,
      send: true,
      attach: true,
      call: true,
      canReport: true,
      canBlock: true,
      canUnblock: false,
    });
  });
});
