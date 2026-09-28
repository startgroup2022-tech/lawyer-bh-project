import { describe, expect, it } from "vitest";
import { getEscalatedRequest, listEligibleLawyers, listEscalatedRequests } from "./escalated-requests-store";

describe("escalated request queue store", () => {
  it("returns minimal case rows with a bounded cursor", async () => {
    const sql = async (parts: TemplateStringsArray) => {
      const query = parts.join("?");
      expect(query).toContain("payment_status = 'success'");
      expect(query).toContain("tap_status = 'CAPTURED'");
      expect(query).toContain("admin_escalated_at IS NOT NULL");
      return [{ id: "11111111-1111-4111-8111-111111111111", case_ref: "SOS-1",
        case_type: "arrest", country_code: "BH", created_at: new Date("2026-09-20T07:00:00Z"),
        admin_escalated_at: new Date("2026-09-20T08:00:00Z") }];
    };
    const result = await listEscalatedRequests(sql as never, null);
    expect(result.requests).toEqual([{ id: "11111111-1111-4111-8111-111111111111", caseRef: "SOS-1",
      caseType: "arrest", countryCode: "BH", createdAt: "2026-09-20T07:00:00.000Z",
      escalatedAt: "2026-09-20T08:00:00.000Z" }]);
    expect(result.nextCursor).toBeNull();
  });
});

describe("eligible lawyer store", () => {
  it("excludes closed, busy, inactive and blocked lawyers from the same-country picker", async () => {
    const queries: string[] = [];
    const sql = async (parts: TemplateStringsArray) => {
      const query = parts.join("?");
      queries.push(query);
      if (query.includes("FROM public.bahrain_emergency_requests request")) {
        return [{ country_code: "BH", excluded_lawyer_ids: ["blocked"] }];
      }
      return [{ id: "11111111-1111-4111-8111-111111111111", full_name_ar: "محامي", full_name_en: "Lawyer" }];
    };
    const result = await listEligibleLawyers(sql as never, "22222222-2222-4222-8222-222222222222", null);
    expect(result.lawyers).toEqual([{ id: "11111111-1111-4111-8111-111111111111", name: "محامي" }]);
    expect(queries[1]).toContain("lawyers.status = 'approved'");
    expect(queries[1]).toContain("lawyers.is_active = true");
    expect(queries[1]).toContain("legalsos_account_lifecycle");
    expect(queries[1]).toContain("busy.assigned_lawyer_id");
    expect(queries[1]).toContain("excluded_lawyer_ids");
  });
});

describe("escalated request detail", () => {
  it("reveals assignment detail only for a captured, still-escalated case", async () => {
    const sql = async (parts: TemplateStringsArray) => {
      const query = parts.join("?");
      expect(query).toContain("payment_status = 'success'");
      expect(query).toContain("tap_status = 'CAPTURED'");
      return [{ id: "11111111-1111-4111-8111-111111111111", case_ref: "SOS-1",
        case_type: "arrest", description: "Urgent", contact_name: "Client",
        contact_phone: "39000000", country_code: "BH", created_at: new Date("2026-09-20T07:00:00Z"),
        admin_escalated_at: new Date("2026-09-20T08:00:00Z") }];
    };
    expect(await getEscalatedRequest(sql as never, "11111111-1111-4111-8111-111111111111"))
      .toMatchObject({ caseRef: "SOS-1", contactName: "Client", contactPhone: "39000000" });
  });
});
