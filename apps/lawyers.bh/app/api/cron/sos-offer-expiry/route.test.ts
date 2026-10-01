import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(async () => ({ expired: 1, advanced: 1, escalated: 0 })),
  drain: vi.fn(async () => ({ claimed: 0, delivered: 0, retried: 0 })),
  paidDrain: vi.fn(async () => ({ claimed: 0, emailDelivered: 0, pushDelivered: 0, retried: 0 })),
  appointmentSchedule: vi.fn(async () => ({ completed: 0, reminders: { claimed: 0, sent: 0, failed: 0 } })),
  dependencies: {},
}));
vi.mock("@/lib/sos/offer-expiry", () => ({ expireLawyerOffers: mocks.run }));
vi.mock("@/lib/sos/offer-expiry-runtime", () => ({ offerExpiryDependencies: mocks.dependencies }));
vi.mock("@/lib/mobile-admin/escalation-push-runtime", () => ({ runAdminEscalationPush: mocks.drain }));
vi.mock("@/lib/mobile-admin/paid-request-notification-runtime", () => ({ runPaidRequestAdminNotifications: mocks.paidDrain }));
vi.mock("@/lib/appointment-communications/schedule-runtime", () => ({ runAppointmentSchedule: mocks.appointmentSchedule }));

import { GET } from "./route";

describe("SOS offer expiry cron", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = "test-cron-secret"; });

  it("rejects requests without the cron bearer secret", async () => {
    const response = await GET(new Request("https://lawyers.bh/api/cron/sos-offer-expiry"));
    expect(response.status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });

  it("processes due offers in bounded batches", async () => {
    const response = await GET(new Request("https://lawyers.bh/api/cron/sos-offer-expiry", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true, expired: 1, advanced: 1, escalated: 0,
      adminPush: { claimed: 0, delivered: 0, retried: 0 },
      paidAdminNotifications: { claimed: 0, emailDelivered: 0, pushDelivered: 0, retried: 0 },
      appointmentSchedule: { completed: 0, reminders: { claimed: 0, sent: 0, failed: 0 } },
    });
    expect(mocks.run).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, now: expect.any(Date) }), mocks.dependencies);
    expect(mocks.drain).toHaveBeenCalledWith(expect.objectContaining({ now: expect.any(Date), limit: 50 }));
    expect(mocks.paidDrain).toHaveBeenCalledWith(expect.objectContaining({ now: expect.any(Date), limit: 50 }));
    expect(mocks.appointmentSchedule).toHaveBeenCalledWith(expect.any(Date), 50);
  });

  it("keeps offer processing successful if Firebase delivery is unavailable", async () => {
    mocks.drain.mockRejectedValueOnce(new Error("firebase unavailable"));
    const response = await GET(new Request("https://lawyers.bh/api/cron/sos-offer-expiry", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, expired: 1, adminPush: { error: "unavailable" } });
  });

  it("still retries queued admin notifications when offer processing fails", async () => {
    mocks.run.mockRejectedValueOnce(new Error("offer lookup unavailable"));
    const response = await GET(new Request("https://lawyers.bh/api/cron/sos-offer-expiry", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(500);
    expect(mocks.drain).toHaveBeenCalledTimes(1);
    expect(mocks.paidDrain).toHaveBeenCalledTimes(1);
  });

  it("runs the appointment schedule even when offer processing fails", async () => {
    mocks.run.mockRejectedValueOnce(new Error("offer lookup unavailable"));
    const response = await GET(new Request("https://lawyers.bh/api/cron/sos-offer-expiry", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(500);
    expect(mocks.appointmentSchedule).toHaveBeenCalledTimes(1);
  });

  it("reports the appointment schedule as unavailable without failing the cron", async () => {
    mocks.appointmentSchedule.mockRejectedValueOnce(new Error("db unavailable"));
    const response = await GET(new Request("https://lawyers.bh/api/cron/sos-offer-expiry", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, appointmentSchedule: { error: "unavailable" } });
  });

  it("keeps offer processing successful if paid request delivery is unavailable", async () => {
    mocks.paidDrain.mockRejectedValueOnce(new Error("postmark unavailable"));
    const response = await GET(new Request("https://lawyers.bh/api/cron/sos-offer-expiry", { headers: { authorization: "Bearer test-cron-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, paidAdminNotifications: { error: "unavailable" } });
  });
});
