import { beforeEach, describe, expect, it, vi } from "vitest";

const { submitJoinApplication } = vi.hoisted(() => ({
  submitJoinApplication: vi.fn(),
}));

vi.mock("@/app/api/join/route", () => ({ submitJoinApplication }));

import { POST } from "./route";

describe("LegalSOS web lawyer registration endpoint", () => {
  beforeEach(() => {
    submitJoinApplication.mockReset();
    submitJoinApplication.mockResolvedValue(
      Response.json({ ok: true, countryCode: "SA" }, { status: 201 }),
    );
  });

  it("uses the explicit LegalSOS web channel and preserves Saudi Arabia", async () => {
    const body = new FormData();
    body.set("countryCode", "SA");
    const request = new Request("https://www.lawyers.bh/api/legalsos/lawyers/register", {
      method: "POST",
      body,
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(submitJoinApplication).toHaveBeenCalledWith(request, {
      mode: "web",
      channel: "legalsos-web",
    });
    const forwarded = submitJoinApplication.mock.calls[0]?.[0] as Request;
    expect((await forwarded.clone().formData()).get("countryCode")).toBe("SA");
  });

  it("rejects non-multipart requests", async () => {
    const response = await POST(
      new Request("https://www.lawyers.bh/api/legalsos/lawyers/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ countryCode: "SA" }),
      }),
    );

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      ok: false,
      code: "MULTIPART_REQUIRED",
    });
    expect(submitJoinApplication).not.toHaveBeenCalled();
  });
});
