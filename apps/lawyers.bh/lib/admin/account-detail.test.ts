import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));

import { getAdminClientDetail, getAdminLawyerDetail } from "./account-detail";

function boundValues() {
  return mocks.sql.mock.calls.flatMap((call) => call.slice(1));
}

function queryText() {
  return mocks.sql.mock.calls
    .map(([strings]) => Array.from(strings as TemplateStringsArray).join("?"))
    .join("\n");
}

describe("admin account detail queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sql.mockResolvedValue([]);
  });

  it("scopes every client request and conversation query by client account id", async () => {
    mocks.sql.mockResolvedValueOnce([
      { id: "client-1", email: "client@example.com", full_name: "Client", phone: "+97330000000", is_active: true, created_at: new Date() },
    ]);

    await getAdminClientDetail("client-1");

    expect(queryText()).toMatch(/r\.client_account_id = \?/);
    expect(queryText()).toMatch(/b\.client_account_id = \?/);
    expect(queryText()).not.toMatch(/customer_(email|phone|name)\s*=/);
    expect(boundValues().filter((value) => value === "client-1")).toHaveLength(4);
  });

  it("scopes lawyer requests and conversations by the lawyer id", async () => {
    mocks.sql.mockResolvedValueOnce([
      { id: "lawyer-1", full_name_ar: "محامي", full_name_en: "Lawyer", email: "lawyer@example.com", status: "active", country_code: "BH" },
    ]);

    await getAdminLawyerDetail("lawyer-1");

    expect(queryText()).toMatch(/r\.assigned_lawyer_id = \?/);
    expect(queryText()).toMatch(/b\.selected_lawyer_id = \?/);
    expect(boundValues().filter((value) => value === "lawyer-1")).toHaveLength(4);
  });
});
