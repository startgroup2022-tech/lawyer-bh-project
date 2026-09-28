import { describe, expect, it, vi } from "vitest";

import { notifyClientPaymentEvent } from "./mobile-payment-notifications";

describe("notifyClientPaymentEvent", () => {
  it("normalizes the locale and sends the requested lifecycle event", async () => {
    const sendClientPush = vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 }));

    await notifyClientPaymentEvent(
      {
        eventType: "payment_confirmed",
        requestId: "request-1",
        locale: "fr",
        source: "payment-confirm",
      },
      async () => ({ sendClientPush }),
    );

    expect(sendClientPush).toHaveBeenCalledWith({
      eventType: "payment_confirmed",
      requestId: "request-1",
      locale: "ar",
    });
  });

  it("does not fail the payment flow when push delivery fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      notifyClientPaymentEvent(
        {
          eventType: "request_cancelled",
          requestId: "request-2",
          locale: "en",
          source: "payment-cancel",
        },
        async () => {
          throw new Error("firebase unavailable");
        },
      ),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      "[mobile/tap/payment-cancel] push delivery failed",
      { requestId: "request-2", name: "Error" },
    );
    warn.mockRestore();
  });
});
