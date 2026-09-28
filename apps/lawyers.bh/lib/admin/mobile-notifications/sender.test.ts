import { describe, expect, it, vi } from "vitest";
import { sendAdminMobileNotification } from "./sender";
import type { MobileNotificationStore } from "./store";
vi.mock('../../notification-preferences/runtime',()=>({filterNotificationTokens:async(tokens:string[])=>tokens}));

const input = {
  adminId: "admin-1",
  audience: "everyone" as const,
  titleAr: "عنوان عربي",
  bodyAr: "نص عربي",
  titleEn: "English title",
  bodyEn: "English body",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
};

function setup(tokens = Array.from({ length: 501 }, (_, index) => ({
  token: `token-${index}`,
  locale: index === 500 ? "en" as const : "ar" as const,
}))) {
  const completed: unknown[] = [];
  const pruned: string[] = [];
  const store: MobileNotificationStore = {
    tokensForAudience: vi.fn(async () => tokens),
    countAudience: vi.fn(async () => tokens.length),
    findSendByIdempotencyKey: vi.fn(async () => null),
    startSend: vi.fn(async (value) => ({ created: true, record: { ...value, id: "notification-1", state: "sending" as const, targeted: 0, successful: 0, failed: 0, pruned: 0, createdAt: new Date(0).toISOString() } })),
    finishSend: vi.fn(async (id, totals) => { completed.push({ id, totals }); return { id, ...totals }; }),
    failSend: vi.fn(async () => undefined),
    recentSends: vi.fn(async () => []),
    pruneTokens: vi.fn(async (values) => { pruned.push(...values); }),
  };
  const messaging = {
    sendEachForMulticast: vi.fn(async (message: { tokens: string[] }) => ({
      successCount: message.tokens.length - (message.tokens.includes("token-10") ? 1 : 0),
      failureCount: message.tokens.includes("token-10") ? 1 : 0,
      responses: message.tokens.map((token) => token === "token-10"
        ? { success: false, error: { code: "messaging/registration-token-not-registered" } }
        : { success: true }),
    })),
  };
  return { store, messaging, completed, pruned };
}

describe("admin mobile notification sender", () => {
  it('excludes advertising opt-outs from delivery and totals',async()=>{
    const {store,messaging}=setup([{token:'muted',locale:'ar'},{token:'allowed',locale:'ar'}]);
    const result=await sendAdminMobileNotification(input,{store,messaging,filterTokens:async(tokens,category)=>{expect(category).toBe('advertising');return tokens.filter(token=>token==='allowed');}});
    expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toEqual(['allowed']);
    expect(result).toMatchObject({targeted:1,successful:1});
  });
  it("localizes, batches, prunes stale tokens, and persists aggregate totals", async () => {
    const { store, messaging, completed, pruned } = setup();
    const result = await sendAdminMobileNotification(input, { store, messaging });

    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(messaging.sendEachForMulticast.mock.calls[0]?.[0]).toMatchObject({
      notification: { title: "عنوان عربي", body: "نص عربي" },
      data: { type: "admin_broadcast", notificationId: "notification-1" },
      android: {
        priority: "high",
        notification: {
          channelId: "legalsos_alarm_classic_v1",
          sound: "legalsos_alarm_classic",
        },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "legalsos_alarm_classic.caf" } },
      },
    });
    expect(messaging.sendEachForMulticast.mock.calls[1]?.[0]).toMatchObject({
      notification: { title: "English title", body: "English body" },
    });
    expect(pruned).toEqual(["token-10"]);
    expect(completed).toEqual([{ id: "notification-1", totals: { targeted: 501, successful: 500, failed: 1, pruned: 1 } }]);
    expect(result).toMatchObject({ id: "notification-1", targeted: 501, successful: 500, failed: 1, pruned: 1 });
  });

  it("returns an existing idempotent result without sending again", async () => {
    const { store, messaging } = setup([]);
    vi.mocked(store.findSendByIdempotencyKey).mockResolvedValue({ id: "existing", adminId: "admin-1", audience: "everyone", state: "completed", targeted: 10, successful: 9, failed: 1, pruned: 1, createdAt: new Date(0).toISOString(), titleAr: "", bodyAr: "", titleEn: "", bodyEn: "", idempotencyKey: input.idempotencyKey });
    const result = await sendAdminMobileNotification(input, { store, messaging });
    expect(result.id).toBe("existing");
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
  });
});
