import { describe, expect, it, vi } from "vitest";
import { createPublicOnboardingDelivery } from "./delivery";

describe("Saraya public onboarding delivery", () => {
  it("sends email OTPs through Postmark without logging the code", async () => {
    const sendEmail = vi.fn(async () => ({ MessageID: "message-1" }));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const delivery = createPublicOnboardingDelivery({
      env: {
        POSTMARK_SERVER_TOKEN: "postmark-token",
        POSTMARK_FROM_EMAIL: "Saraya Square <noreply@sq.lawyers.bh>",
      },
      createPostmarkClient: () => ({ sendEmail }),
      fetch: vi.fn(),
    });

    await delivery.sendEmail({
      to: "tenant@example.com",
      code: "482193",
      locale: "en",
    });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      To: "tenant@example.com",
      TextBody: expect.stringContaining("482193"),
    }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("482193");
    log.mockRestore();
  });

  it("authenticates SMS webhook delivery with the configured secret", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 202 }));
    const delivery = createPublicOnboardingDelivery({
      env: {
        SARAYA_SMS_WEBHOOK_URL: "https://sms.example.test/send",
        SARAYA_SMS_WEBHOOK_SECRET: "sms-secret",
      },
      createPostmarkClient: vi.fn(),
      fetch,
    });

    await delivery.sendSms({
      to: "+97339000000",
      code: "739201",
      locale: "ar",
    });

    expect(fetch).toHaveBeenCalledWith("https://sms.example.test/send", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer sms-secret" }),
      body: expect.stringContaining("739201"),
    }));
  });

  it("throws provider-neutral errors when delivery is not configured", async () => {
    const delivery = createPublicOnboardingDelivery({
      env: {},
      createPostmarkClient: vi.fn(),
      fetch: vi.fn(),
    });

    await expect(delivery.sendEmail({
      to: "tenant@example.com",
      code: "482193",
      locale: "en",
    })).rejects.toThrow("delivery_not_configured");
    await expect(delivery.sendSms({
      to: "+97339000000",
      code: "482193",
      locale: "en",
    })).rejects.toThrow("delivery_not_configured");
  });
});
