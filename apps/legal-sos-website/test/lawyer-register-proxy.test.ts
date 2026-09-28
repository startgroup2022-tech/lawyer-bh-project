import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/lawyer/register/route";

describe("LegalSOS lawyer registration proxy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards multipart registration to the dedicated endpoint without browser authorization", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = init.body as FormData;
      expect(body.get("countryCode")).toBe("SA");
      expect(new Headers(init.headers).has("authorization")).toBe(false);
      expect(new Headers(init.headers).has("content-type")).toBe(false);
      return Response.json(
        { ok: true, countryCode: "SA", reference: "TEST-SA" },
        { status: 201 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const body = new FormData();
    body.set("countryCode", "SA");

    const response = await POST(
      new Request("https://legalsos.org/api/lawyer/register", {
        method: "POST",
        headers: { authorization: "Bearer browser-supplied" },
        body,
      }),
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://www.lawyers.bh/api/legalsos/lawyers/register");
    expect(init).toEqual(expect.objectContaining({ method: "POST" }));
    expect((init?.body as FormData).get("countryCode")).toBe("SA");
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      countryCode: "SA",
      reference: "TEST-SA",
    });
  });

  it("rejects non-multipart requests before contacting the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://legalsos.org/api/lawyer/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ countryCode: "SA" }),
      }),
    );

    expect(response.status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
