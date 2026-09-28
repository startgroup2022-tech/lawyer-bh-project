import { describe, expect, it, vi } from "vitest";
import { sendLawyerInvitationEmail } from "./lawyer-invitation-email";

describe("automatic lawyer invitation email", () => {
  it("sends the join invitation link to the newly created lawyer", async () => {
    const send = vi.fn(async () => ({ messageId: "message-1" }));

    await sendLawyerInvitationEmail(
      {
        to: "lawyer@example.com",
        lawyerName: "محامي تجريبي",
        completionLink: "https://www.lawyers.bh/ar/complete-profile?token=secure-token",
      },
      send,
    );

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: "lawyer@example.com",
      subject: "دعوة للانضمام إلى منصة محامون البحرين",
      html: expect.stringContaining("secure-token"),
      text: expect.stringContaining("secure-token"),
    }));
  });
});
