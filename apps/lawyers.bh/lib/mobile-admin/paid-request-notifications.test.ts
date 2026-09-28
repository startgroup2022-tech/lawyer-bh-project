import { describe, expect, it, vi } from "vitest";

import {
  buildPaidRequestAdminEmail,
  buildPaidRequestAdminPush,
  drainPaidRequestAdminNotifications,
  type PaidRequestNotificationDependencies,
  type PaidRequestNotificationEvent,
} from "./paid-request-notifications";

const event: PaidRequestNotificationEvent = {
  id: "outbox-1",
  requestId: "request-1",
  caseRef: "SOS-2026-001",
  amountBhd: "150.000",
  createdAt: new Date("2026-09-22T18:00:00Z"),
  emailPending: true,
  pushPending: true,
  emailAttemptCount: 1,
  pushAttemptCount: 1,
};

function dependencies(overrides: Partial<PaidRequestNotificationDependencies> = {}): PaidRequestNotificationDependencies {
  return {
    claim: async () => [event],
    recipients: async () => [
      { token: "token-ar", locale: "ar" },
      { token: "token-ar", locale: "ar" },
      { token: "token-en", locale: "en" },
    ],
    sendEmail: async () => undefined,
    sendPush: async (tokens) => ({ successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) }),
    markDelivered: async () => undefined,
    markRetry: async () => undefined,
    prune: async () => undefined,
    ...overrides,
  };
}

describe("paid request administration notifications", () => {
  it("builds the fixed-recipient email without sensitive payment or access data", () => {
    const email = buildPaidRequestAdminEmail(event);
    expect(email.to).toBe("info@lawyers.bh");
    expect(email.subject).toContain("SOS-2026-001");
    expect(email.text).toContain("150.000 BHD");
    expect(email.text).toContain("/ar/admin/requests/emergency/request-1");
    expect(email.text).not.toMatch(/token|payload|card|chat/i);
  });

  it("builds localized push data that opens the paid request", () => {
    expect(buildPaidRequestAdminPush(event, "ar")).toEqual({
      notification: { title: "طلب LegalSOS مدفوع جديد", body: "تم تأكيد الدفع للطلب SOS-2026-001." },
      data: { eventType: "admin_request_paid", requestId: "request-1" },
    });
    expect(buildPaidRequestAdminPush(event, "en").notification.title).toBe("New paid LegalSOS request");
  });

  it("delivers email and deduplicated localized push independently", async () => {
    const sendEmail = vi.fn(async () => undefined);
    const sendPush = vi.fn(async (tokens: string[]) => ({ successCount: tokens.length, failureCount: 0, responses: tokens.map(() => ({ success: true })) }));
    const markDelivered = vi.fn(async (_id: string, _channel: "email" | "push") => undefined);
    const result = await drainPaidRequestAdminNotifications(dependencies({ sendEmail, sendPush, markDelivered }), new Date("2026-09-22T18:01:00Z"), 50);

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendPush).toHaveBeenCalledTimes(2);
    expect(sendPush.mock.calls.map(([tokens]) => tokens)).toEqual([["token-ar"], ["token-en"]]);
    expect(markDelivered.mock.calls.map(([, channel]) => channel).sort()).toEqual(["email", "push"]);
    expect(result).toEqual({ claimed: 1, emailDelivered: 1, pushDelivered: 1, retried: 0 });
  });

  it("does not resend delivered email when only push is pending", async () => {
    const sendEmail = vi.fn(async () => undefined);
    const sendPush = vi.fn(async () => ({ successCount: 0, failureCount: 1, responses: [{ success: false, error: { code: "unavailable" } }] }));
    const markRetry = vi.fn(async (_input: Parameters<PaidRequestNotificationDependencies["markRetry"]>[0]) => undefined);
    await drainPaidRequestAdminNotifications(dependencies({
      claim: async () => [{ ...event, emailPending: false }], sendEmail, sendPush, markRetry,
    }), new Date("2026-09-22T18:01:00Z"), 50);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(markRetry).toHaveBeenCalledWith(expect.objectContaining({ channel: "push", terminal: false, errorCode: "delivery_failed" }));
  });

  it("retries email without retrying successful push and becomes terminal on attempt eight", async () => {
    const markRetry = vi.fn(async (_input: Parameters<PaidRequestNotificationDependencies["markRetry"]>[0]) => undefined);
    const sendPush = vi.fn(async () => ({ successCount: 1, failureCount: 0, responses: [{ success: true }] }));
    await drainPaidRequestAdminNotifications(dependencies({
      claim: async () => [{ ...event, emailAttemptCount: 8, pushPending: false }],
      sendEmail: async () => { throw new Error("postmark unavailable"); },
      sendPush,
      markRetry,
    }), new Date("2026-09-22T18:01:00Z"), 50);

    expect(sendPush).not.toHaveBeenCalled();
    expect(markRetry).toHaveBeenCalledWith(expect.objectContaining({ channel: "email", terminal: true, errorCode: "email_unavailable" }));
  });
});
