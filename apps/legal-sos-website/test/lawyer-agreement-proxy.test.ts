import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/lawyer/agreement/route";

describe("LegalSOS lawyer agreement proxy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards the selected Saudi country", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ content: "Saudi agreement", version: 1, id: "sa-1" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("https://legalsos.org/api/lawyer/agreement?locale=en&countryCode=SA"),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.lawyers.bh/api/mobile/legal-documents/lawyer-agreement?locale=en&countryCode=SA",
      expect.any(Object),
    );
    expect(response.status).toBe(200);
  });

  it("rejects invalid country codes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(
      new Request("https://legalsos.org/api/lawyer/agreement?countryCode=BHR"),
    );
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
