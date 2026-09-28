import { describe, expect, it, vi } from "vitest";

import { sendLawyerPasswordResetEmail } from "./lawyer-password-reset-email";

describe("lawyer password reset email", () => {
  it("sends the Arabic reset link to the lawyer through the shared mailer", async () => {
    const deliver = vi.fn(async () => ({ MessageID: "message-1" }));

    await sendLawyerPasswordResetEmail(
      {
        to: "lawyer@example.com",
        name: "حبيب محمد",
        resetUrl: "https://www.lawyers.bh/ar/join?resetToken=signed-token",
        lang: "ar",
      },
      deliver,
    );

    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lawyer@example.com",
        subject: "إعادة تعيين كلمة المرور - محامون البحرين",
        text: "https://www.lawyers.bh/ar/join?resetToken=signed-token",
      }),
    );
  });
});
