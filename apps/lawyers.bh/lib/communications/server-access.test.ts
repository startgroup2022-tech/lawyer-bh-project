import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], lawyer: null as null | { lawyerId: string; countryCode: string }, clientValid: true, sql: vi.fn(async () => mocks.rows) }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
vi.mock("@/lib/mobile-lawyer-auth", () => ({ getMobileLawyerSession: vi.fn(() => mocks.lawyer) }));
vi.mock("@/lib/tap/mobile-request-access", () => ({ verifyMobileRequestAccessToken: vi.fn(() => mocks.clientValid) }));

import { resolveRequestCommunicationAccess } from "./server-access";

const requestId = "8d983269-123f-49a8-9b62-ccaa7a4e496e";
const row = { request_id: requestId, contact_name: "Client", mobile_request_access_digest: "digest", assigned_lawyer_id: "lawyer-1", assigned_lawyer_name: "Lawyer", service_status: "mobilizing", country_code: "BH" };

describe("server communication access", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rows = [row]; mocks.lawyer = null; mocks.clientValid = true; });

  it("authenticates the exact client request token header", async () => {
    const result = await resolveRequestCommunicationAccess(requestId, new Request("https://lawyers.bh", { headers: { "x-request-access-token": "client-token" } }));
    expect(result?.actor).toEqual({ role: "client", id: `client:${requestId}` });
  });

  it("authenticates the assigned lawyer session", async () => {
    mocks.lawyer = { lawyerId: "lawyer-1", countryCode: "BH" };
    const result = await resolveRequestCommunicationAccess(requestId, new Request("https://lawyers.bh", { headers: { authorization: "Bearer lawyer-token" } }));
    expect(result?.actor).toEqual({ role: "lawyer", id: "lawyer-1", accountId: "lawyer-1" });
  });

  it("rejects a lawyer who is not assigned to the request", async () => {
    mocks.lawyer = { lawyerId: "lawyer-2", countryCode: "BH" };

    const result = await resolveRequestCommunicationAccess(
      requestId,
      new Request("https://lawyers.bh", {
        headers: { authorization: "Bearer lawyer-token" },
      }),
    );

    expect(result).toBeNull();
  });

  it("rejects missing credentials before querying", async () => {
    const result = await resolveRequestCommunicationAccess(requestId, new Request("https://lawyers.bh"));
    expect(result).toBeNull();
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it('rejects the old request token belonging to a closed client', async () => {
    mocks.rows = [{ ...row, client_account_closed: true }];
    expect(await resolveRequestCommunicationAccess(requestId, new Request('https://lawyers.bh', {
      headers: { 'x-request-access-token': 'old-request-token' },
    }))).toBeNull();
  });

  it('keeps history read-only for the remaining participant after peer closure', async () => {
    mocks.rows = [{ ...row, lawyer_account_closed: true }];
    const access = await resolveRequestCommunicationAccess(requestId, new Request('https://lawyers.bh', {
      headers: { 'x-request-access-token': 'valid-client-token' },
    }));
    expect(access?.capabilities).toEqual({ read: true, send: false, call: false });
    expect(access?.peer.phone).toBeNull();
  });
});
