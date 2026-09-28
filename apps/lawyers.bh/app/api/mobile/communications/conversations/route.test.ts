import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  lawyer: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
vi.mock("@/lib/mobile-lawyer-auth", () => ({ getMobileLawyerSession: mocks.lawyer }));

import { GET } from "./route";

describe("lawyer conversation list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.lawyer.mockReturnValue({ lawyerId: "lawyer-1", countryCode: "BH" });
    mocks.sql.mockResolvedValue([
      {
        request_id: "request-1",
        request_reference: "SOS-3K5X",
        peer_display_name: "Client One",
        service_status: "mobilizing",
        case_type: "emergency_arrest",
        case_name_ar: "القبض والتوقيف والتحقيقات",
        case_name_en: "Arrest, Detention & Investigations",
        last_message: "Hello",
        last_message_at: new Date("2026-08-30T10:00:00.000Z"),
        unread_count: 2,
      },
    ]);
  });

  it("returns only rows queried with the authenticated lawyer and country", async () => {
    const response = await GET(
      new Request("https://lawyers.bh/api/mobile/communications/conversations?lawyerId=other", {
        headers: { authorization: "Bearer lawyer-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      conversations: [
        {
          requestId: "request-1",
          requestReference: "SOS-3K5X",
          peerDisplayName: "Client One",
          serviceStatus: "mobilizing",
          caseType: "emergency_arrest",
          caseNameAr: "القبض والتوقيف والتحقيقات",
          caseNameEn: "Arrest, Detention & Investigations",
          lastMessage: "Hello",
          lastMessageAt: "2026-08-30T10:00:00.000Z",
          unreadCount: 2,
        },
      ],
    });
    expect(mocks.sql).toHaveBeenCalledTimes(1);
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual(
      expect.arrayContaining(["lawyer-1", "BH"]),
    );
    expect(mocks.sql.mock.calls[0].slice(1)).not.toContain("other");
  });

  it("rejects a missing lawyer session before querying", async () => {
    mocks.lawyer.mockReturnValue(null);

    const response = await GET(new Request("https://lawyers.bh/api/mobile/communications/conversations"));

    expect(response.status).toBe(401);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
