import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AccountActivitySections from "./AccountActivitySections";

describe("admin account activity sections", () => {
  it("renders only the supplied conversations and requests in separate sections", () => {
    const html = renderToStaticMarkup(
      <AccountActivitySections
        locale="en"
        conversations={[{ requestId: "request-1", reference: "SOS-1", lastMessage: "Scoped message", lastMessageAt: null }]}
        requests={[{ id: "request-1", source: "emergency", reference: "SOS-1", status: "mobilizing", createdAt: "2026-08-30T10:00:00Z" }]}
      />,
    );

    expect(html).toContain("Conversations");
    expect(html).toContain("Requests");
    expect(html).toContain("Scoped message");
    expect(html).toContain("SOS-1");
  });

  it("renders localized empty states", () => {
    const html = renderToStaticMarkup(
      <AccountActivitySections locale="ar" conversations={[]} requests={[]} />,
    );

    expect(html).toContain("لا توجد محادثات لهذا الحساب");
    expect(html).toContain("لا توجد طلبات لهذا الحساب");
  });
});
