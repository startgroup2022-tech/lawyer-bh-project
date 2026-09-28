import { describe, expect, it, vi } from "vitest";
import {
  isFirstLawyerApproval,
  sendLawyerApprovalEmail,
} from "./lawyer-approval-email";

type EmailPayload = {
  to?: string;
  subject: string;
  text: string;
  html: string;
};

const lawyer = {
  lawyerId: "lawyer-123",
  email: "lawyer@example.com",
  fullNameAr: "محامٍ تجريبي",
  fullNameEn: "Test Lawyer",
  locale: "ar" as const,
};

describe("lawyer approval email", () => {
  it("sends the approved Arabic acceptance message to the lawyer", async () => {
    const deliver = vi.fn<
      (message: EmailPayload) => Promise<{ MessageID: string }>
    >(async () => ({ MessageID: "message-id" }));

    await sendLawyerApprovalEmail(lawyer, deliver);

    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver.mock.calls[0]?.[0]).toMatchObject({
      to: "lawyer@example.com",
      subject: "تهانينا، تم قبول تسجيلك | محامون البحرين",
    });
    expect(deliver.mock.calls[0]?.[0].text).toContain(
      "تهانينا، تم قبول تسجيلك في منصة محامون البحرين، وأصبح حسابك معتمدًا.",
    );
  });

  it("sends the approved English acceptance message for an English registration", async () => {
    const deliver = vi.fn<
      (message: EmailPayload) => Promise<{ MessageID: string }>
    >(async () => ({ MessageID: "message-id" }));

    await sendLawyerApprovalEmail({ ...lawyer, locale: "en" }, deliver);

    expect(deliver.mock.calls[0]?.[0]).toMatchObject({
      to: "lawyer@example.com",
      subject:
        "Congratulations, your registration has been approved | Lawyers.bh",
    });
    expect(deliver.mock.calls[0]?.[0].text).toContain(
      "Congratulations, your registration on Lawyers.bh has been approved, and your account is now verified.",
    );
  });

  it("selects only the first pending-to-approved transition", () => {
    expect(isFirstLawyerApproval("pending")).toBe(true);
    expect(isFirstLawyerApproval("approved")).toBe(false);
    expect(isFirstLawyerApproval("rejected")).toBe(false);
    expect(isFirstLawyerApproval("suspended")).toBe(false);
  });

  it("escapes the lawyer name before placing it in HTML", async () => {
    const deliver = vi.fn<
      (message: EmailPayload) => Promise<{ MessageID: string }>
    >(async () => ({ MessageID: "message-id" }));

    await sendLawyerApprovalEmail(
      { ...lawyer, fullNameAr: "<script>alert(1)</script>" },
      deliver,
    );

    expect(deliver.mock.calls[0]?.[0].html).toContain("&lt;script&gt;");
    expect(deliver.mock.calls[0]?.[0].html).not.toContain("<script>");
  });

  it("does not reject a successful approval when Postmark delivery fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const deliver = vi.fn<(message: EmailPayload) => Promise<never>>(
      async () => {
        throw new Error("Postmark unavailable");
      },
    );

    await expect(
      sendLawyerApprovalEmail(lawyer, deliver),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "[lawyer-approval-email] delivery failed",
      expect.objectContaining({
        lawyerId: "lawyer-123",
        audience: "lawyer",
      }),
    );

    errorSpy.mockRestore();
  });
});
