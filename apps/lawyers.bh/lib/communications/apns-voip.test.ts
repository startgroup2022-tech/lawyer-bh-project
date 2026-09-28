import { describe, expect, it } from "vitest";

import { buildVoipPushRequest } from "./apns-voip";

describe("APNs VoIP push", () => {
  it("builds a terminated-state incoming-call request", () => {
    const request = buildVoipPushRequest({
      token: "a".repeat(64),
      topic: "com.lawyers.legalsos.voip",
      event: {
        eventType: "incoming_call",
        requestId: "request-1",
        callId: "call-1",
        mediaKind: "video",
        callerName: "LegalSOS",
      },
    });

    expect(request.path).toBe(`/3/device/${"a".repeat(64)}`);
    expect(request.headers).toMatchObject({
      "apns-topic": "com.lawyers.legalsos.voip",
      "apns-push-type": "voip",
      "apns-priority": "10",
      "apns-expiration": "0",
    });
    expect(request.payload).toEqual({
      aps: { "content-available": 1 },
      eventType: "incoming_call",
      requestId: "request-1",
      callId: "call-1",
      id: "call-1",
      mediaKind: "video",
      callerName: "LegalSOS",
      nameCaller: "LegalSOS",
      handle: "Video call",
      isVideo: true,
    });
  });
});
