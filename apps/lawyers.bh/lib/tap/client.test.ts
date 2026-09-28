import { describe, expect, it, vi } from "vitest";

import { createTapClient, TapApiError } from "./client";
import type { TapConfig } from "./config";

const config: TapConfig = {
  secretKey: "sk_test_super_secret",
  publicKey: "pk_test_public",
  merchantId: "merchant_123",
  marketplaceMid: "27432553",
  mode: "test",
  siteUrl: "https://lawyers.bh",
};

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createTapClient", () => {
  it("uploads onboarding documents as multipart without setting Content-Type", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok({ id: "file_1" }));
    const client = createTapClient(config, fetchImpl);
    const file = new File(["document"], "id.pdf", { type: "application/pdf" });

    await expect(client.uploadFile({ file, title: "Civil ID" })).resolves.toEqual({ id: "file_1" });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.tap.company/v2/files/");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer sk_test_super_secret");
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.get("purpose")).toBe("identity_document");
    expect(body.get("file")).toBe(file);
    expect(body.get("title")).toBe("Civil ID");
    expect(body.get("file_link_create")).toBe("true");
    expect(Number(body.get("expires_at"))).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it.each([
    ["convertLeadToRetailer", "https://api.tap.company/v3/connect/account", { lead_id: "lead_1" }],
    ["createCharge", "https://api.tap.company/v2/charges/", { amount: 10, currency: "BHD" }],
  ] as const)("sends JSON for %s", async (method, expectedUrl, body) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok({ id: "result_1" }));
    const client = createTapClient(config, fetchImpl);

    await client[method](body as never);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(expectedUrl);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it("posts a complete Bahrain retailer lead without reshaping its document references", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok({ id: "led_1", status: "active" }));
    const client = createTapClient(config, fetchImpl);
    const lead = {
      segment: { type: "BUSINESS" as const, sub_segment: { type: "RETAILER" as const } },
      country: "BH",
      brand: { name: [{ lang: "en", text: "Law Office" }] },
      entity: { license: { number: "CR123", documents: [{ name: "commercial_registration", file: "file_cr" }] } },
      users: [{ identification: { type: "national_id", documents: [{ name: "identity_document", file: "file_id" }] } }],
      wallet: { bank: { documents: [{ name: "bank_account", file: "file_iban" }] } },
      marketplace: { id: "27432553" },
      post: { url: "https://lawyers.bh/api/tap/marketplace/webhook" },
    };

    await client.createRetailerLead(lead);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.tap.company/v3/lead/");
    expect(JSON.parse(String(init?.body))).toEqual(lead);
  });

  it("returns the nested retailer id and payout state from account conversion", async () => {
    const response = {
      lead: { id: "led_1", status: "registered" },
      retailer: { id: "68025843", status: { payout: false } },
    };
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok(response));
    const client = createTapClient(config, fetchImpl);

    const result = await client.convertLeadToRetailer({ lead_id: "led_1" });

    expect(result.retailer.id).toBe("68025843");
    expect(result.retailer.status.payout).toBe(false);
  });

  it("updates delayed-split destinations using the charge endpoint", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok({ id: "chg_1", status: "CAPTURED" }));
    const client = createTapClient(config, fetchImpl);
    const destinations = { destination: [{ id: "dest_1", amount: 8, currency: "BHD" }, { id: "27432553", amount: 2, currency: "BHD" }] };

    await client.updateChargeDestinations("chg/1", destinations);

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.tap.company/v2/charges/chg%2F1");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual({ destinations });
  });

  it("retrieves a destination from Tap using the marketplace credential", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(ok({ id: "68025843", status: "Active" }));
    const client = createTapClient(config, fetchImpl);

    await expect(client.retrieveDestination("retailer/68025843")).resolves.toEqual({
      id: "68025843",
      status: "Active",
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.tap.company/v2/destination/retailer%2F68025843");
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer sk_test_super_secret");
  });

  it("throws a sanitized TapApiError without secrets or document data", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      errors: [{ code: "invalid", description: "Rejected" }],
      authorization: "Bearer leaked",
      iban: "BH00SECRET",
      nested: { identity_document: "civil-id-data", safe: "kept" },
    }), { status: 400, headers: { "Content-Type": "application/json" } }));
    const client = createTapClient(config, fetchImpl);

    const error = await client.createCharge({ amount: 1, currency: "BHD" }).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(TapApiError);
    expect(error).toMatchObject({ status: 400, details: expect.objectContaining({ nested: { identity_document: "[REDACTED]", safe: "kept" } }) });
    expect(JSON.stringify(error)).not.toContain("sk_test_super_secret");
    expect(JSON.stringify(error)).not.toContain("BH00SECRET");
    expect(JSON.stringify(error)).not.toContain("civil-id-data");
    expect(String(error)).not.toContain("Bearer leaked");
  });
});
