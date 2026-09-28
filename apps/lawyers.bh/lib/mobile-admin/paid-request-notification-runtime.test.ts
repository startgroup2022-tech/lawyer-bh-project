import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  firebase: vi.fn(() => { throw new Error("firebase unavailable"); }),
  drain: vi.fn(async (deps: { sendEmail(message: unknown): Promise<unknown> }) => {
    await deps.sendEmail({ to: "info@lawyers.bh", subject: "paid", text: "paid", html: "paid" });
    return { claimed: 1, emailDelivered: 1, pushDelivered: 0, retried: 0 };
  }),
  email: vi.fn(async () => undefined),
}));

vi.mock("@/lib/db/client", () => ({ sqlClient: vi.fn() }));
vi.mock("@/lib/postmark", () => ({ sendEmail: mocks.email }));
vi.mock("@/lib/sos/firebase-admin", () => ({ firebaseMessaging: mocks.firebase }));
vi.mock("./paid-request-notification-store", () => ({ createPaidRequestNotificationStore: () => ({}) }));
vi.mock("./paid-request-notifications", () => ({ drainPaidRequestAdminNotifications: mocks.drain }));

import { runPaidRequestAdminNotifications } from "./paid-request-notification-runtime";

describe("paid request notification runtime", () => {
  it("can deliver pending email without initializing unavailable Firebase", async () => {
    await expect(runPaidRequestAdminNotifications({ now: new Date(0), limit: 1 })).resolves.toMatchObject({ emailDelivered: 1 });
    expect(mocks.email).toHaveBeenCalledOnce();
    expect(mocks.firebase).not.toHaveBeenCalled();
  });
});
