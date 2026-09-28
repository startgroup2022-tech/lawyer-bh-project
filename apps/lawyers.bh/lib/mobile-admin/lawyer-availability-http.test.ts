import { describe, expect, it } from "vitest";
import { createLawyerAvailabilityHttp } from "./lawyer-availability-http";

const lawyerId = "11111111-1111-4111-8111-111111111111";

describe("mobile admin lawyer availability HTTP", () => {
  it("requires explicit confirmation before disabling a lawyer", async () => {
    let writes = 0;
    const handler = createLawyerAvailabilityHttp({
      authorize: async () => ({ id: "admin-1" }),
      setAvailability: async () => { writes += 1; return true; },
    });
    const response = await handler(new Request("https://lawyers.bh", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ available: false, confirmed: false, countryCode: "BH" }),
    }), lawyerId);
    expect(response.status).toBe(400);
    expect(writes).toBe(0);
  });

  it("records the administrator and country-scoped availability change", async () => {
    const calls: unknown[] = [];
    const handler = createLawyerAvailabilityHttp({
      authorize: async () => ({ id: "admin-1" }),
      setAvailability: async (input) => { calls.push(input); return true; },
    });
    const response = await handler(new Request("https://lawyers.bh", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ available: false, confirmed: true, countryCode: "bh" }),
    }), lawyerId);
    expect(response.status).toBe(200);
    expect(calls).toEqual([{ lawyerId, adminId: "admin-1", countryCode: "BH", available: false }]);
  });
});
