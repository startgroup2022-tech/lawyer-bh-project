import { describe, expect, it } from "vitest";
import { createManualAssignmentService } from "./manual-assignment";
import { createPostgresManualAssignmentStore } from "./manual-assignment-store";

function fakeDatabase(overrides: Record<string, unknown> = {}) {
  const writes: string[] = [];
  const request = {
    payment_status: "success", tap_status: "CAPTURED", service_status: "pending",
    admin_escalated_at: new Date("2026-09-20T08:00:00Z"), assigned_lawyer_id: null,
    candidate_lawyer_id: null, country_code: "BH", excluded_lawyer_ids: [],
    ...overrides,
  };
  const query = async (parts: TemplateStringsArray) => {
    const sql = parts.join("?");
    if (sql.includes("FROM public.bahrain_emergency_requests request")) return [request];
    if (sql.includes("FROM public.bahrain_lawyers lawyers")) return [{
      id: "11111111-1111-4111-8111-111111111111", country_code: "BH", is_active: true,
      status: "approved", is_review_account: false, suspension_type: null,
      is_emergency_ready: true,
    }];
    if (sql.includes("FROM public.bahrain_emergency_requests busy")) return [];
    if (sql.includes("FROM legalsos_account_lifecycle")) return [];
    if (sql.includes("UPDATE public.bahrain_emergency_requests")) { writes.push(sql); return [{ id: "request-1" }]; }
    throw new Error(`Unexpected query: ${sql}`);
  };
  return { sql: { begin: async (work: (tx: typeof query) => Promise<unknown>) => work(query) }, writes };
}

describe("Postgres manual assignment store", () => {
  it("changes the captured request once inside a transaction and records the actor", async () => {
    const db = fakeDatabase();
    const assign = createManualAssignmentService(createPostgresManualAssignmentStore(db.sql as never));
    const result = await assign({
      requestId: "22222222-2222-4222-8222-222222222222",
      lawyerId: "11111111-1111-4111-8111-111111111111",
      adminId: "33333333-3333-4333-8333-333333333333",
    });
    expect(result.status).toBe("assigned");
    expect(db.writes).toHaveLength(1);
    expect(db.writes[0]).toContain("dispatch_actor_log");
  });

  it("never writes an unpaid request", async () => {
    const db = fakeDatabase({ tap_status: "INITIATED" });
    const assign = createManualAssignmentService(createPostgresManualAssignmentStore(db.sql as never));
    expect((await assign({ requestId: "22222222-2222-4222-8222-222222222222",
      lawyerId: "11111111-1111-4111-8111-111111111111",
      adminId: "33333333-3333-4333-8333-333333333333" })).status).toBe("request_unavailable");
    expect(db.writes).toHaveLength(0);
  });
});
