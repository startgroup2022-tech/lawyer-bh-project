import { describe, expect, it, vi } from "vitest";
import { sendLawyerRegistrationEmails } from "./lawyer-registration-emails";

type EmailPayload = {
  to?: string;
  subject: string;
  text: string;
  html: string;
};

const application = {
  applicationId: "application-123",
  countryCode: "BH",
  email: "lawyer@example.com",
  phone: "+97330000000",
  fullNameAr: "محامٍ تجريبي",
  fullNameEn: "Test Lawyer",
  licenseNumber: "LAW-123",
  locale: "ar" as const,
};

describe("lawyer registration email notifications", () => {
  it("sends Arabic confirmation to the lawyer and bilingual review details to the platform", async () => {
    const deliver = vi.fn<
      (message: EmailPayload) => Promise<{ MessageID: string }>
    >(async () => ({ MessageID: "message-id" }));

    await sendLawyerRegistrationEmails(application, deliver);

    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliver.mock.calls[0]?.[0]).toMatchObject({
      to: "lawyer@example.com",
      subject: "تم استلام طلب تسجيلك | محامون البحرين",
    });
    expect(deliver.mock.calls[0]?.[0].text).toContain("بانتظار المراجعة");

    const platformMessage = deliver.mock.calls[1]?.[0];
    expect(platformMessage).toMatchObject({
      subject: "طلب تسجيل محامي جديد للمراجعة — BH — البحرين | New lawyer registration",
    });
    expect(platformMessage?.to).toBeUndefined();
    expect(platformMessage?.text).toContain("application-123");
    expect(platformMessage?.text).toContain("LAW-123");
    expect(platformMessage?.text).toContain("Test Lawyer");
    expect(platformMessage?.text).toContain("BH — البحرين");
    expect(platformMessage?.text).toContain("محامٍ تجريبي");

    const combined = deliver.mock.calls
      .flatMap(([message]) => [message.text, message.html])
      .join("\n");
    expect(combined).not.toMatch(/password|iban|blob|signature/i);
  });

  it("uses English confirmation copy for an English registration", async () => {
    const deliver = vi.fn<
      (message: EmailPayload) => Promise<{ MessageID: string }>
    >(async () => ({ MessageID: "message-id" }));

    await sendLawyerRegistrationEmails(
      { ...application, locale: "en" },
      deliver,
    );

    expect(deliver.mock.calls[0]?.[0]).toMatchObject({
      to: "lawyer@example.com",
      subject: "Registration application received | Lawyers.bh",
    });
    expect(deliver.mock.calls[0]?.[0].text).toContain("awaiting review");
  });

  it("attempts both messages without rejecting registration when delivery fails", async () => {
    const deliver = vi.fn<(message: EmailPayload) => Promise<never>>(async () => {
      throw new Error("Postmark unavailable");
    });

    await expect(
      sendLawyerRegistrationEmails(application, deliver),
    ).resolves.toBeUndefined();
    expect(deliver).toHaveBeenCalledTimes(2);
  });
});
