import { describe, expect, it } from "vitest";
import { getAdminLiveOverview } from "./live-overview-store";

describe("mobile admin live overview store", () => {
  it("keeps lawyers and requests in one country and derives available, busy, and offline states", async () => {
    const queries: string[] = [];
    const sql = async (parts: TemplateStringsArray) => {
      const query = parts.join("?");
      queries.push(query);
      if (query.includes("FROM public.bahrain_lawyers lawyers")) {
        return [
          { id: "lawyer-1", name: "متاح", phone: "1", live_location: { lat: 26.2, lng: 50.5, reportedAt: "2026-09-26T09:59:50Z" }, live_location_updated_at: new Date("2026-09-26T09:59:50Z"), location_sharing_enabled: true, active_request_id: null, active_case_ref: null },
          { id: "lawyer-2", name: "مشغول", phone: "2", live_location: { lat: 26.3, lng: 50.6, reportedAt: "2026-09-26T09:59:40Z" }, live_location_updated_at: new Date("2026-09-26T09:59:40Z"), location_sharing_enabled: true, active_request_id: "request-2", active_case_ref: "SOS-2" },
          { id: "lawyer-3", name: "غير متصل", phone: "3", live_location: { lat: 26.4, lng: 50.7, reportedAt: "2026-09-26T09:40:00Z" }, live_location_updated_at: new Date("2026-09-26T09:40:00Z"), location_sharing_enabled: true, active_request_id: null, active_case_ref: null },
        ];
      }
      return [
        { id: "request-1", case_ref: "SOS-1", case_type: "emergency_arrest", country_code: "BH", payment_status: "pending", tap_status: null, service_status: "pending", assigned_lawyer_id: null, candidate_lawyer_id: null, admin_escalated_at: null, created_at: new Date("2026-09-26T09:00:00Z"), updated_at: new Date("2026-09-26T09:00:00Z"), client_lat: 26.1, client_lng: 50.4, dispatch_actor_log: [] },
        { id: "request-2", case_ref: "SOS-2", case_type: "emergency_search", country_code: "BH", payment_status: "success", tap_status: "CAPTURED", service_status: "mobilizing", assigned_lawyer_id: "lawyer-2", candidate_lawyer_id: null, admin_escalated_at: null, created_at: new Date("2026-09-26T09:10:00Z"), updated_at: new Date("2026-09-26T09:50:00Z"), client_lat: 26.5, client_lng: 50.8, dispatch_actor_log: [{ actor: "admin-1", action: "manual_assign", ts: "2026-09-26T09:40:00Z" }] },
      ];
    };

    const result = await getAdminLiveOverview(sql as never, "BH", new Date("2026-09-26T10:00:00Z"));

    expect(result.lawyers.map((lawyer) => lawyer.state)).toEqual(["available", "busy", "offline"]);
    expect(result.requests.map((request) => request.stage)).toEqual(["awaiting_payment", "en_route"]);
    expect(result.summary).toEqual({ available: 1, busy: 1, offline: 1, activeRequests: 2, needsAttention: 0 });
    expect(result.events.map((event) => event.type)).toEqual([
      "request_stage_en_route", "manual_assign", "request_created", "payment_captured", "request_created",
    ]);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain("lawyers.country_code =");
    expect(queries[1]).toContain("request.country_code =");
  });
});
