import "server-only";

import { sendEmail } from "@/lib/postmark";
import { mobilePushSender } from "./mobile-push";
import {
  claimDueLawyerOffers,
  findPaidMobileBooking,
  getOrSelectCandidate,
  markAdminEscalated,
} from "./live-dispatch-store";
import type { OfferExpiryDependencies } from "./offer-expiry";

export const offerExpiryDependencies: OfferExpiryDependencies = {
  claimDueOffers: claimDueLawyerOffers,
  findPaidBooking: findPaidMobileBooking,
  selectNextCandidate: getOrSelectCandidate,
  markAdminEscalated,
  async sendLawyerExpired(offer) {
    const sender = await mobilePushSender();
    await sender.sendLawyerPush({
      lawyerId: offer.lawyerId,
      eventType: "lawyer_offer_expired",
      requestId: offer.requestId,
      locale: offer.locale,
    });
  },
  async sendClientCandidate(input) {
    const sender = await mobilePushSender();
    await sender.sendClientPush({
      eventType: "lawyer_found",
      requestId: input.requestId,
      locale: input.locale,
    });
  },
  async sendAdminEscalation(input) {
    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.lawyers.bh"}/ar/admin/requests/emergency/${input.requestId}`;
    await sendEmail({
      subject: "طلب SOS يحتاج محاميًا مناوبًا",
      text: `لم يتوفر محامي تلقائيًا للطلب ${input.requestId}. يرجى تعيين المحامي المناوب: ${adminUrl}`,
      html: `<div dir="rtl"><h2>طلب SOS يحتاج محاميًا مناوبًا</h2><p>لم يتوفر محامي تلقائيًا للطلب.</p><p><a href="${adminUrl}">فتح الطلب وتعيين المحامي</a></p></div>`,
    });
  },
};
