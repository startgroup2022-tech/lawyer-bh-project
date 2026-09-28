import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn(), country: vi.fn(), cases: vi.fn(), account: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sql }));
vi.mock("@/lib/db/country-tables", () => ({ getActiveCountry: mocks.country }));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: mocks.country,
  mapCountryProductAccessError: vi.fn((error: { code?: string }) => error.code === "COUNTRY_PRODUCT_DISABLED"
    ? { status: 403, body: { error: "COUNTRY_PRODUCT_DISABLED" } }
    : null),
}));
vi.mock("@/lib/sos/emergencyCaseCatalog", () => ({ listEmergencyCaseTypes: mocks.cases }));
vi.mock("@/lib/sos/caseTypes", () => ({ generateCaseRef: () => "SOS-TEST" }));
vi.mock("@/lib/client-auth/request-account", () => ({ resolveOptionalClientAccount: mocks.account }));
vi.mock("@/lib/tap/mobile-request-access", () => ({
  createMobileRequestAccessToken: () => ({ token: "test-access", digest: "test-digest" }),
  verifyMobileRequestAccessToken: mocks.verify,
}));

import { POST } from "./route";

const idempotencyKey = "018f47de-8f4e-4dd1-9f41-f0f56365e901";
function request(customer: Record<string, string>) {
  return new Request("https://example.test/api/mobile/tap/payment-session", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ countryCode: "BH", caseId: "search", locale: "ar", idempotencyKey, customer }),
  });
}
const contact = { name: "حبيب أحمد علي", phoneCountryCode: "973", phone: "36000000" };

describe("mobile payment contact", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("TAP_MOBILE_TEST_SECRET_KEY", "sk_test_fixture");
    vi.stubEnv("TAP_MOBILE_TEST_PUBLIC_KEY", "pk_test_fixture");
    vi.stubEnv("TAP_MOBILE_TEST_MERCHANT_ID", "123456");
    vi.stubEnv("TAP_MOBILE_POST_URL", "https://example.test/api/mobile/tap/webhook");
    vi.spyOn(console, "info").mockImplementation(() => {});
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{
      id: "d481e868-84b2-4412-be24-30df5ccee173", case_ref: "SOS-TEST",
      mobile_payment_idempotency_key: idempotencyKey, mobile_payment_case_id: "case-1",
      mobile_request_access_digest: "test-digest", amount_bd: "120.00",
      payment_status: "pending", tap_status: "SDK_PENDING",
    }]);
    mocks.country.mockResolvedValue({ code: "BH" });
    mocks.account.mockResolvedValue({ id: "client-1" });
    mocks.cases.mockResolvedValue([{
      id: "case-1", slug: "search", baseFeeBhd: 120, currencyCode: "BHD",
      label: { ar: "تفتيش", en: "Search" },
    }]);
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, "", "person@example.test"])("creates session with email %s", async (email) => {
    const response = await POST(request({ ...contact, ...(email === undefined ? {} : { email }) }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, amount: 120, currency: "BHD", requestAccessToken: "test-access" });
    // Assert the actual bound database values, not a live insert.
    expect(mocks.sql.mock.calls[1].slice(1)).toEqual(expect.arrayContaining(["حبيب أحمد علي", "+97336000000"]));
    expect(mocks.sql.mock.calls[1].slice(1)).toContain("client-1");
  });

  it("rejects an invalid supplied email", async () => {
    const response = await POST(request({ ...contact, email: "invalid" }));
    expect(response.status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("rejects malformed discount codes instead of silently charging full price", async () => {
    const response = await POST(new Request("https://example.test/api/mobile/tap/payment-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryCode: "BH", caseId: "search", idempotencyKey, customer: contact, discountCode: "bad code!" }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ errorCode: "invalid" });
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("blocks session creation before database work when LegalSOS is disabled", async () => {
    mocks.country.mockRejectedValueOnce(Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), { code: "COUNTRY_PRODUCT_DISABLED" }));
    const response = await POST(request(contact));
    expect(response.status).toBe(403);
    expect(mocks.sql).not.toHaveBeenCalled();
  });

  it("commits the discounted amount and one reservation before signing the session",async()=>{
    mocks.sql.mockReset();
    Object.assign(mocks.sql,{begin:async(fn:(tx:typeof mocks.sql)=>Promise<unknown>)=>fn(mocks.sql)});
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{id:'code'}]).mockResolvedValueOnce([{
      id:'11111111-1111-4111-8111-111111111111',code:'SAVE20',scope:'app',discount_type:'percentage',discount_value:'20',is_active:true,
      starts_at:null,ends_at:null,total_usage_limit:null,per_user_usage_limit:null,total_used:0,user_used:0,
    }]).mockResolvedValueOnce([{id:'d481e868-84b2-4412-be24-30df5ccee173',case_ref:'SOS-TEST',
      mobile_payment_idempotency_key:idempotencyKey,mobile_request_access_digest:'test-digest',amount_bd:'96.000',payment_status:'pending',tap_status:'SDK_PENDING'}]).mockResolvedValueOnce([]);
    const response=await POST(new Request('https://example.test/api/mobile/tap/payment-session',{method:'POST',body:JSON.stringify({countryCode:'BH',caseId:'search',idempotencyKey,customer:contact,discountCode:'SAVE20',expectedFinalAmountBd:'96.000'})}));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({amount:96,formattedAmount:'96.000',discount:{originalAmountBd:'120.000',discountAmountBd:'24.000',finalAmountBd:'96.000'}});
    expect(mocks.sql.mock.calls[3].slice(1)).toContain('96.000');
    expect(mocks.sql.mock.calls[4].slice(1)).toContain('d481e868-84b2-4412-be24-30df5ccee173');
  });

  it("does not charge an unseen changed discount price",async()=>{
    mocks.sql.mockReset();
    Object.assign(mocks.sql,{begin:async(fn:(tx:typeof mocks.sql)=>Promise<unknown>)=>fn(mocks.sql)});
    mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{id:'code'}]).mockResolvedValueOnce([{
      id:'11111111-1111-4111-8111-111111111111',code:'SAVE20',scope:'app',discount_type:'percentage',discount_value:'10',is_active:true,
      starts_at:null,ends_at:null,total_usage_limit:null,per_user_usage_limit:null,total_used:0,user_used:0,
    }]);
    const response=await POST(new Request('https://example.test/api/mobile/tap/payment-session',{method:'POST',body:JSON.stringify({countryCode:'BH',caseId:'search',idempotencyKey,customer:contact,discountCode:'SAVE20',expectedFinalAmountBd:'96.000'})}));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({errorCode:'price_changed'});
    expect(mocks.sql.mock.calls).toHaveLength(3);
  });

  it("reuses an authorized discounted session without a new reservation",async()=>{
    mocks.verify.mockReturnValue(true);
    mocks.sql.mockReset().mockResolvedValueOnce([{id:'d481e868-84b2-4412-be24-30df5ccee173',case_ref:'SOS-TEST',mobile_payment_idempotency_key:idempotencyKey,
      mobile_request_access_digest:'existing',amount_bd:'96.000',payment_status:'pending',tap_status:'SDK_PENDING',
      discount:{code:'SAVE20',originalAmountBd:'120.000',discountAmountBd:'24.000',finalAmountBd:'96.000'}}]);
    const response=await POST(new Request('https://example.test/api/mobile/tap/payment-session',{method:'POST',body:JSON.stringify({countryCode:'BH',caseId:'search',idempotencyKey,customer:contact,requestAccessToken:'existing'})}));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({amount:96,discount:{code:'SAVE20'}});
    expect(mocks.sql.mock.calls).toHaveLength(1);
  });

  it.each(["name", "phone", "phoneCountryCode"])("still requires %s", async (field) => {
    const response = await POST(request({ ...contact, [field]: "" }));
    expect(response.status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});
