import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ isReviewAccount: false }));
const sqlResponses = vi.hoisted(() => [] as unknown[][]);
const allocationMock = vi.hoisted(() => vi.fn());
const sendClientPush = vi.hoisted(() => vi.fn(async () => ({ sent: 1, failed: 0, pruned: 0 })));
const requestRow = vi.hoisted(() => ({
  value: {
    id: "00000000-0000-4000-8000-000000000001",
    serviceStatus: "pending",
    assignedLawyerId: null,
    candidateLawyerId: "lawyer-1",
    customerApprovedAt: new Date(),
    lawyerResponseDeadline: new Date(Date.now() + 60_000),
    paymentStatus: "pending",
    tapStatus: "PENDING",
    tapChargeId: null,
    paymentRef: null,
    baseFeeBhd: "15.000",
    locale: "ar",
  } as {
    id: string;
    serviceStatus: string;
    assignedLawyerId: string | null;
    candidateLawyerId: string | null;
    customerApprovedAt: Date | null;
    lawyerResponseDeadline: Date | null;
    paymentStatus: string;
    tapStatus: string;
    tapChargeId: string | null;
    paymentRef: string | null;
    baseFeeBhd: string;
    locale: string;
  },
}));

vi.mock("@/lib/sos/lawyerAuth", () => ({
  requireAdvocateRequest: vi.fn(async () => ({
    ok: true,
    advocate: {
      id: "lawyer-1",
      countryCode: "BH",
      isReviewAccount: authState.isReviewAccount,
    },
  })),
}));

vi.mock("@/lib/db/client", () => {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(async () => [requestRow.value]),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(async () => [{ id: requestRow.value.id }]),
  };
  updateQuery.set.mockReturnValue(updateQuery);
  updateQuery.where.mockReturnValue(updateQuery);
  return {
    db: { select: vi.fn(() => query), update: vi.fn(() => updateQuery) },
    sqlClient: Object.assign(
      vi.fn((stringsOrIdentifier: TemplateStringsArray | string) =>
        typeof stringsOrIdentifier === "string"
          ? stringsOrIdentifier
          : Promise.resolve(sqlResponses.shift() ?? []),
      ),
      { unsafe: vi.fn() },
    ),
    schema: {
      emergencyRequests: {
        id: "id", caseRef: "caseRef", countryCode: "countryCode",
        serviceStatus: "serviceStatus", assignedLawyerId: "assignedLawyerId",
        candidateLawyerId: "candidateLawyerId", customerApprovedAt: "customerApprovedAt",
        lawyerResponseDeadline: "lawyerResponseDeadline", paymentStatus: "paymentStatus",
        tapStatus: "tapStatus", tapChargeId: "tapChargeId", paymentRef: "paymentRef",
        baseFeeBhd: "baseFeeBhd",
        locale: "locale",
        responseTimestamp: "responseTimestamp", updatedAt: "updatedAt",
      },
    },
  };
});

vi.mock("@/lib/db/country-tables", () => ({
  buildCountryTableSet: vi.fn(() => ({
    lawyers: "bahrain_lawyers",
    provider_commission_rates: "bahrain_provider_commission_rates",
    payment_allocations: "bahrain_payment_allocations",
  })),
  getActiveCountry: vi.fn(async () => ({ code: "BH", currencyCode: "BHD" })),
}));
vi.mock("@/lib/payments/commission", () => ({ recordPaymentAllocation: allocationMock }));
vi.mock("@/lib/sos/mobile-push", () => ({
  mobilePushSender: vi.fn(async () => ({ sendClientPush })),
}));

import { POST } from "./route";

describe("lawyer request acceptance guards", () => {
  beforeEach(() => {
    vi.stubEnv("TAP_SECRET_KEY", "sk_test_example");
    authState.isReviewAccount = false;
    sqlResponses.length = 0;
    allocationMock.mockReset();
    sendClientPush.mockClear();
    requestRow.value = {
      ...requestRow.value,
      serviceStatus: "pending",
      assignedLawyerId: null,
      paymentStatus: "pending",
      tapStatus: "PENDING",
      tapChargeId: null,
      paymentRef: null,
    };
  });

  it("notifies the client once after a newly committed acceptance", async () => {
    requestRow.value = {
      ...requestRow.value,
      paymentStatus: "success",
      tapStatus: "CAPTURED",
      tapChargeId: "chg_accepted",
    };
    sqlResponses.push([{
      full_name_ar: "محامي تجريبي",
      full_name_en: "Test Lawyer",
      iban_number: null,
      payout_ready: false,
      reviewed_at: new Date("2026-08-01T00:00:00.000Z"),
      created_at: new Date("2026-07-01T00:00:00.000Z"),
    }]);

    const response = await POST(new Request("https://lawyers.bh"), {
      params: Promise.resolve({ caseRef: "SOS-1" }),
    });

    expect(response.status).toBe(200);
    expect(sendClientPush).toHaveBeenCalledOnce();
    expect(sendClientPush).toHaveBeenCalledWith({
      eventType: "lawyer_accepted",
      requestId: requestRow.value.id,
      locale: "ar",
    });
  });

  it("rejects direct acceptance before server-confirmed payment", async () => {
    const response = await POST(new Request("https://lawyers.bh"), {
      params: Promise.resolve({ caseRef: "SOS-1" }),
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "payment_required" });
  });

  it("isolates a review lawyer before reading a real request", async () => {
    authState.isReviewAccount = true;
    const response = await POST(new Request("https://lawyers.bh"), {
      params: Promise.resolve({ caseRef: "SOS-1" }),
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "review_account_isolated" });
  });

  it("records delayed earnings without an IBAN for an already accepted paid request", async () => {
    const approvedAt = new Date("2026-08-01T00:00:00.000Z");
    requestRow.value = {
      ...requestRow.value,
      serviceStatus: "mobilizing",
      assignedLawyerId: "lawyer-1",
      paymentStatus: "success",
      tapStatus: "CAPTURED",
      tapChargeId: "chg_1",
    };
    sqlResponses.push([{
      full_name_ar: "محامي تجريبي",
      full_name_en: "Test Lawyer",
      iban_number: null,
      payout_ready: false,
      reviewed_at: approvedAt,
      created_at: new Date("2026-07-01T00:00:00.000Z"),
    }]);

    const response = await POST(new Request("https://lawyers.bh"), {
      params: Promise.resolve({ caseRef: "SOS-1" }),
    });

    expect(response.status).toBe(200);
    expect(allocationMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: "delayed",
      providerIbanSnapshot: null,
      commissionStartsAt: approvedAt,
    }));
    expect(sendClientPush).not.toHaveBeenCalled();
  });
});
