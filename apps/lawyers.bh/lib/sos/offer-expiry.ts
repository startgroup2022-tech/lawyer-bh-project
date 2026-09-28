import type { PaidMobileBooking, SelectedCandidateResult } from "./live-dispatch-store";

export type ExpiredLawyerOffer = {
  requestId: string;
  lawyerId: string;
  locale: "ar" | "en" | "tr";
  location?: { lat: number; lng: number };
};

export type OfferExpiryDependencies = {
  claimDueOffers(input: { now: Date; limit: number }): Promise<ExpiredLawyerOffer[]>;
  findPaidBooking(requestId: string): Promise<PaidMobileBooking | null>;
  selectNextCandidate(input: {
    booking: PaidMobileBooking;
    customerLocation?: { lat: number; lng: number };
    now: Date;
  }): Promise<SelectedCandidateResult>;
  markAdminEscalated(requestId: string): Promise<boolean>;
  sendLawyerExpired(offer: ExpiredLawyerOffer): Promise<void>;
  sendClientCandidate(input: { requestId: string; locale: "ar" | "en" | "tr" }): Promise<void>;
  sendAdminEscalation(input: { requestId: string; locale: "ar" | "en" | "tr" }): Promise<void>;
};

export async function expireLawyerOffers(
  input: { now: Date; limit: number },
  dependencies: OfferExpiryDependencies,
) {
  const offers = await dependencies.claimDueOffers(input);
  let advanced = 0;
  let escalated = 0;

  for (const offer of offers) {
    await dependencies.sendLawyerExpired(offer).catch(() => undefined);
    const booking = await dependencies.findPaidBooking(offer.requestId);
    if (!booking) continue;
    const result = await dependencies.selectNextCandidate({
      booking,
      customerLocation: offer.location,
      now: input.now,
    });
    if (result.candidate) {
      advanced += 1;
      await dependencies.sendClientCandidate({ requestId: offer.requestId, locale: offer.locale }).catch(() => undefined);
      continue;
    }
    if (await dependencies.markAdminEscalated(offer.requestId)) {
      escalated += 1;
      await dependencies.sendAdminEscalation({ requestId: offer.requestId, locale: offer.locale }).catch(() => undefined);
    }
  }

  return { expired: offers.length, advanced, escalated };
}
