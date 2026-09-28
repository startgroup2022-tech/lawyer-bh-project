import { describe, expect, it } from "vitest";
import { createLiveOverviewHttp } from "./live-overview-http";

describe("mobile admin live overview HTTP", () => {
  it("requires an authorized administrator before reading locations", async () => {
    let reads = 0;
    const handler = createLiveOverviewHttp({
      authorize: async () => null,
      overview: async () => { reads += 1; return emptyOverview; },
    });
    const response = await handler(new Request("https://lawyers.bh/api/mobile/admin/live-overview?country=BH"));
    expect(response.status).toBe(401);
    expect(reads).toBe(0);
  });

  it("rejects malformed country codes and normalizes valid codes", async () => {
    const countries: string[] = [];
    const handler = createLiveOverviewHttp({
      authorize: async () => ({ id: "admin-1" }),
      overview: async (country) => { countries.push(country); return emptyOverview; },
    });
    expect((await handler(new Request("https://lawyers.bh/api/mobile/admin/live-overview?country=BHR"))).status).toBe(400);
    const response = await handler(new Request("https://lawyers.bh/api/mobile/admin/live-overview?country=bh"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(countries).toEqual(["BH"]);
  });
});

const emptyOverview = {
  countryCode: "BH",
  generatedAt: "2026-09-26T10:00:00.000Z",
  lawyers: [],
  requests: [],
  summary: { available: 0, busy: 0, offline: 0, activeRequests: 0, needsAttention: 0 },
};
