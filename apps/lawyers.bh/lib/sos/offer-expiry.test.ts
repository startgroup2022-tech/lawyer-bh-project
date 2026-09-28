import { describe, expect, it, vi } from "vitest";

import { expireLawyerOffers, type OfferExpiryDependencies } from "./offer-expiry";
import type { PaidMobileBooking, SelectedCandidateResult } from "./live-dispatch-store";

const due = {
  requestId: "request-1",
  lawyerId: "lawyer-1",
  locale: "ar" as const,
  location: { lat: 26.22, lng: 50.58 },
};

function dependencies(overrides: Partial<OfferExpiryDependencies> = {}): OfferExpiryDependencies {
  return {
    claimDueOffers: vi.fn(async () => [due]),
    findPaidBooking: vi.fn(async (): Promise<PaidMobileBooking> => ({
      id: due.requestId, countryCode: "BH", locale: "ar", service: "SOS",
      amountBhd: 15, customerName: "Client", customerPhone: "+97330000000",
      caseType: "arrest", workflowType: "emergency_dispatch",
    })),
    selectNextCandidate: vi.fn(async (): Promise<SelectedCandidateResult> => ({
      requestId: due.requestId,
      candidate: { id: "lawyer-2", name: "المحامي الثاني", profileImageUrl: null, rating: 0, specialty: null, distanceKm: 1, priceBhd: 15, verified: true },
      candidateLocation: { lat: 26.23, lng: 50.59 },
    })),
    markAdminEscalated: vi.fn(async () => true),
    sendLawyerExpired: vi.fn(async () => undefined),
    sendClientCandidate: vi.fn(async () => undefined),
    sendAdminEscalation: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("expired lawyer offers", () => {
  it("expires once, excludes the old lawyer in storage, and exposes the next candidate to the client", async () => {
    const deps = dependencies();
    const result = await expireLawyerOffers({ now: new Date("2026-09-08T07:05:01Z"), limit: 25 }, deps);

    expect(result).toEqual({ expired: 1, advanced: 1, escalated: 0 });
    expect(deps.sendLawyerExpired).toHaveBeenCalledWith(due);
    expect(deps.selectNextCandidate).toHaveBeenCalledWith(expect.objectContaining({ booking: expect.objectContaining({ id: "request-1" }), customerLocation: due.location }));
    expect(deps.sendClientCandidate).toHaveBeenCalledWith({ requestId: "request-1", locale: "ar" });
    expect(deps.sendAdminEscalation).not.toHaveBeenCalled();
  });

  it("escalates exactly once when no eligible lawyer remains", async () => {
    const deps = dependencies({
      selectNextCandidate: vi.fn(async () => ({ requestId: due.requestId, candidate: null, candidateLocation: null })),
    });
    const result = await expireLawyerOffers({ now: new Date("2026-09-08T07:05:01Z"), limit: 25 }, deps);

    expect(result).toEqual({ expired: 1, advanced: 0, escalated: 1 });
    expect(deps.markAdminEscalated).toHaveBeenCalledWith("request-1");
    expect(deps.sendAdminEscalation).toHaveBeenCalledWith({ requestId: "request-1", locale: "ar" });
  });

  it("does nothing on a repeated run after storage has already claimed the deadline", async () => {
    const deps = dependencies({ claimDueOffers: vi.fn(async () => []) });
    const result = await expireLawyerOffers({ now: new Date("2026-09-08T07:06:00Z"), limit: 25 }, deps);
    expect(result).toEqual({ expired: 0, advanced: 0, escalated: 0 });
    expect(deps.sendLawyerExpired).not.toHaveBeenCalled();
    expect(deps.selectNextCandidate).not.toHaveBeenCalled();
  });
});
