import { describe, expect, it, vi } from "vitest";
vi.mock('../notification-preferences/runtime',()=>({filterNotificationTokens:async(tokens:string[])=>tokens}));

import {
  buildMobilePushMessage,
  createMobilePushSender,
  type MobilePushDeliveryReport,
  type MobilePushMessaging,
  type MobilePushTokenStore,
} from "./mobile-push";

const REQUEST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("mobile push payload", () => {
  it.each([
    "lawyer_offer",
    "lawyer_assigned",
    "lawyer_found",
    "lawyer_accepted",
    "lawyer_en_route",
    "lawyer_arrived",
    "request_cancelled",
    "payment_confirmed",
    "lawyer_offer_expired",
    "new_message",
    "account_closure_followup",
  ] as const)("keeps %s payload free of sensitive request data", (eventType) => {
    const message = buildMobilePushMessage({
      eventType,
      requestId: REQUEST_ID,
      locale: "ar",
    });

    expect(message.data).toEqual({ eventType, requestId: REQUEST_ID });
    expect(message.apns).toEqual({
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "legalsos_alarm_classic.caf" } },
    });
    expect(message.android).toEqual({
      priority: "high",
      notification: {
        channelId: "legalsos_alarm_classic_v1",
        sound: "legalsos_alarm_classic",
      },
    });
    expect(JSON.stringify(message)).not.toMatch(
      /description|location|latitude|longitude|phone|paymentRef|tap/i,
    );
  });
});

describe("mobile push delivery", () => {
  it("reports delivery counts without exposing installation tokens", async () => {
    const reports: MobilePushDeliveryReport[] = [];
    const sender = createMobilePushSender({
      store: {
        tokensForLawyer: async () => ["private-lawyer-token"],
        tokensForRequest: async () => [],
        pruneInstallationTokens: async () => undefined,
      },
      messaging: {
        sendEachForMulticast: async () => ({
          successCount: 1,
          failureCount: 0,
          responses: [{ success: true }],
        }),
      },
      onDelivery: (report) => reports.push(report),
    });

    await sender.sendLawyerPush({
      lawyerId: "11111111-1111-4111-8111-111111111111",
      eventType: "lawyer_offer",
      requestId: REQUEST_ID,
      locale: "ar",
    });

    expect(reports).toEqual([
      {
        eventType: "lawyer_offer",
        requestId: REQUEST_ID,
        recipientRole: "lawyer",
        sent: 1,
        failed: 0,
        pruned: 0,
      },
    ]);
    expect(JSON.stringify(reports)).not.toContain("private-lawyer-token");
  });

  it('filters request and call categories before sending and never prunes muted tokens',async()=>{
    const sent:string[][]=[];
    const sender=createMobilePushSender({
      store:{tokensForRequest:async()=>['request-only','call-only'],tokensForLawyer:async()=>[],pruneInstallationTokens:async()=>{throw Error('Muted tokens are not invalid');}},
      messaging:{sendEachForMulticast:async message=>{sent.push(message.tokens);return {successCount:message.tokens.length,failureCount:0,responses:message.tokens.map(()=>({success:true}))};}},
      filterTokens:async(tokens,category)=>tokens.filter(token=>category==='communications'?token==='call-only':token==='request-only'),
    });
    await sender.sendClientPush({eventType:'payment_confirmed',requestId:REQUEST_ID,locale:'ar'});
    await sender.sendClientPush({eventType:'incoming_call',requestId:REQUEST_ID,locale:'ar'});
    await sender.sendClientPush({eventType:'new_message',requestId:REQUEST_ID,locale:'ar'});
    expect(sent).toEqual([['request-only'],['call-only'],['call-only']]);
  });

  it("uses the requested recipient without leaking message content", async () => {
    const sent: Array<{ tokens: string[]; data: Record<string, string> }> = [];
    const sender = createMobilePushSender({
      store: {
        tokensForLawyer: async () => ["lawyer-token"],
        tokensForRequest: async () => ["client-token"],
        pruneInstallationTokens: async () => undefined,
      },
      messaging: {
        sendEachForMulticast: async (message) => {
          sent.push({ tokens: message.tokens, data: message.data });
          return { successCount: 1, failureCount: 0, responses: [{ success: true }] };
        },
      },
    });

    await sender.sendLawyerPush({ lawyerId: "lawyer-1", eventType: "new_message", requestId: REQUEST_ID, locale: "ar" });
    await sender.sendClientPush({ eventType: "new_message", requestId: REQUEST_ID, locale: "ar" });

    expect(sent).toEqual([
      { tokens: ["lawyer-token"], data: { eventType: "new_message", requestId: REQUEST_ID } },
      { tokens: ["client-token"], data: { eventType: "new_message", requestId: REQUEST_ID } },
    ]);
  });
  it("prunes only permanently invalid Firebase registration tokens", async () => {
    const pruned: string[][] = [];
    const store: MobilePushTokenStore = {
      tokensForLawyer: async () => ["valid", "stale", "retry-later"],
      tokensForRequest: async () => [],
      pruneInstallationTokens: async (tokens) => {
        pruned.push(tokens);
      },
    };
    const messaging: MobilePushMessaging = {
      sendEachForMulticast: async () => ({
        successCount: 1,
        failureCount: 2,
        responses: [
          { success: true },
          {
            success: false,
            error: { code: "messaging/registration-token-not-registered" },
          },
          { success: false, error: { code: "messaging/internal-error" } },
        ],
      }),
    };
    const sender = createMobilePushSender({ store, messaging });

    const result = await sender.sendLawyerPush({
      lawyerId: "11111111-1111-4111-8111-111111111111",
      eventType: "lawyer_offer",
      requestId: REQUEST_ID,
      locale: "en",
    });

    expect(result).toEqual({ sent: 1, failed: 2, pruned: 1 });
    expect(pruned).toEqual([["stale"]]);
  });

  it("does not call Firebase when the request has no subscriptions", async () => {
    let sendCalls = 0;
    const store: MobilePushTokenStore = {
      tokensForLawyer: async () => [],
      tokensForRequest: async () => [],
      pruneInstallationTokens: async () => undefined,
    };
    const messaging: MobilePushMessaging = {
      sendEachForMulticast: async () => {
        sendCalls += 1;
        return { successCount: 0, failureCount: 0, responses: [] };
      },
    };
    const sender = createMobilePushSender({ store, messaging });

    expect(
      await sender.sendClientPush({
        eventType: "lawyer_found",
        requestId: REQUEST_ID,
        locale: "ar",
      }),
    ).toEqual({ sent: 0, failed: 0, pruned: 0 });
    expect(sendCalls).toBe(0);
  });
});
