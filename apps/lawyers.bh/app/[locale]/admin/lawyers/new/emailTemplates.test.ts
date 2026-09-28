import { describe, expect, it } from "vitest";
import {
  lawyerProfileCompletionEmailHtml,
  lawyerProfileCompletionEmailSubject,
  lawyerProfileCompletionEmailText,
} from "./emailTemplates";

describe("admin lawyer join invitation template", () => {
  const input = {
    lawyerName: "محامي تجريبي",
    profileCompletionUrl:
      "https://www.lawyers.bh/ar/complete-profile?token=secure-token",
  };

  it("invites the lawyer to join with the secure invitation link", () => {
    const subject = lawyerProfileCompletionEmailSubject();
    const text = lawyerProfileCompletionEmailText(input);
    const html = lawyerProfileCompletionEmailHtml(input);

    expect(subject).toBe("دعوة للانضمام إلى منصة محامون البحرين");
    expect(text).toContain("دعوتكم للانضمام إلى منصة محامون البحرين");
    expect(text).toContain("secure-token");
    expect(html).toContain("دعوة للانضمام إلى منصة محامون البحرين");
    expect(html).toContain("قبول الدعوة والانضمام");
    expect(html).toContain("secure-token");
  });

  it.each([
    "استكمال الملف",
    "البيانات الناقصة",
    "شهادة الآيبان",
    "ملف الرخصة",
    "التخصصات ومجالات الخدمة",
  ])("does not include completion checklist copy: %s", (forbiddenText) => {
    const output = [
      lawyerProfileCompletionEmailSubject(),
      lawyerProfileCompletionEmailText(input),
      lawyerProfileCompletionEmailHtml(input),
    ].join("\n");

    expect(output).not.toContain(forbiddenText);
  });
});
