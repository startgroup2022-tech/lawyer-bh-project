import "server-only";

import { mobilePushStore } from "./mobile-push-store";
import {filterNotificationTokens} from '../notification-preferences/runtime';
import type {NotificationCategory} from '../notification-preferences/validation';
import { mobileNotificationSound } from "@/lib/mobile-notification-sound";

export type MobilePushEventType =
  | "lawyer_offer"
  | "lawyer_assigned"
  | "lawyer_found"
  | "lawyer_accepted"
  | "lawyer_en_route"
  | "lawyer_arrived"
  | "request_cancelled"
  | "payment_confirmed"
  | "lawyer_offer_expired"
  | "new_message"
  | "account_closure_followup"
  | "incoming_call";

export type MobilePushLocale = "ar" | "en" | "tr";

interface MobilePushEvent {
  eventType: MobilePushEventType;
  requestId: string;
  locale: MobilePushLocale;
  callId?: string;
  mediaKind?: "audio" | "video";
  callerName?: string;
}

interface FirebaseError {
  code: string;
}

interface FirebaseSendResponse {
  success: boolean;
  error?: FirebaseError;
}

export interface MobilePushMulticastResult {
  successCount: number;
  failureCount: number;
  responses: FirebaseSendResponse[];
}

export interface MobilePushMessaging {
  sendEachForMulticast(message: {
    tokens: string[];
    notification: { title: string; body: string };
    data: Record<string, string>;
    apns: {
      headers: { "apns-priority": "10" };
      payload: { aps: { sound: "legalsos_alarm_classic.caf" } };
    };
    android: {
      priority: "high";
      notification: {
        channelId: "legalsos_alarm_classic_v1";
        sound: "legalsos_alarm_classic";
      };
    };
  }): Promise<MobilePushMulticastResult>;
}

export interface MobilePushTokenStore {
  tokensForLawyer(lawyerId: string): Promise<string[]>;
  tokensForRequest(requestId: string): Promise<string[]>;
  pruneInstallationTokens(tokens: string[]): Promise<void>;
}

export interface MobilePushDeliveryReport {
  eventType: MobilePushEventType;
  requestId: string;
  recipientRole: "client" | "lawyer";
  sent: number;
  failed: number;
  pruned: number;
}

const copy: Record<
  MobilePushEventType,
  Record<MobilePushLocale, { title: string; body: string }>
> = {
  lawyer_offer: {
    ar: { title: "طلب قانوني طارئ جديد", body: "افتح التطبيق لمراجعة الطلب." },
    en: { title: "New emergency legal request", body: "Open the app to review it." },
    tr: { title: "Yeni acil hukuki talep", body: "Talebi incelemek için uygulamayı açın." },
  },
  lawyer_assigned: {
    ar: { title: "تم تعيينك لطلب قانوني", body: "افتح التطبيق لمتابعة الطلب." },
    en: { title: "You were assigned a legal request", body: "Open the app to follow the request." },
    tr: { title: "Bir hukuki talebe atandınız", body: "Talebi takip etmek için uygulamayı açın." },
  },
  lawyer_found: {
    ar: { title: "تم العثور على محامي", body: "افتح التطبيق لمتابعة الطلب." },
    en: { title: "A lawyer was found", body: "Open the app to follow the request." },
    tr: { title: "Bir avukat bulundu", body: "Talebi takip etmek için uygulamayı açın." },
  },
  lawyer_accepted: {
    ar: { title: "قبل المحامي طلبك", body: "المحامي في طريقه إليك." },
    en: { title: "Your lawyer accepted", body: "The lawyer is on the way." },
    tr: { title: "Avukat talebinizi kabul etti", body: "Avukat yola çıktı." },
  },
  lawyer_en_route: {
    ar: { title: "المحامي في الطريق", body: "افتح التطبيق لمتابعة حالة الطلب." },
    en: { title: "Your lawyer is on the way", body: "Open the app to follow the request." },
    tr: { title: "Avukat yolda", body: "Talebi takip etmek için uygulamayı açın." },
  },
  lawyer_arrived: {
    ar: { title: "وصل المحامي", body: "افتح التطبيق لمتابعة الطلب." },
    en: { title: "Your lawyer has arrived", body: "Open the app to continue." },
    tr: { title: "Avukat ulaştı", body: "Devam etmek için uygulamayı açın." },
  },
  request_cancelled: {
    ar: { title: "تم إلغاء الطلب", body: "افتح التطبيق للاطلاع على الحالة." },
    en: { title: "Request cancelled", body: "Open the app to view the status." },
    tr: { title: "Talep iptal edildi", body: "Durumu görmek için uygulamayı açın." },
  },
  payment_confirmed: {
    ar: { title: "تم تأكيد الدفع", body: "تم تحديث حالة الطلب." },
    en: { title: "Payment confirmed", body: "The request status was updated." },
    tr: { title: "Ödeme onaylandı", body: "Talep durumu güncellendi." },
  },
  lawyer_offer_expired: {
    ar: { title: "انتهت مهلة الطلب", body: "انتهت مهلة قبول هذا الطلب." },
    en: { title: "Request offer expired", body: "The acceptance window for this request has ended." },
    tr: { title: "Talep süresi doldu", body: "Bu talebi kabul etme süresi sona erdi." },
  },
  new_message: {
    ar: { title: "رسالة جديدة", body: "لديك رسالة جديدة في طلبك." },
    en: { title: "New message", body: "You have a new message in your request." },
    tr: { title: "Yeni mesaj", body: "Talebinizde yeni bir mesaj var." },
  },
  account_closure_followup: {
    ar: { title: "الإدارة تتابع طلبك", body: "تتابع الإدارة الإجراءات المتبقية على طلبك." },
    en: { title: "Administration is following up", body: "Administration is following up on the remaining steps for your request." },
    tr: { title: "Talebiniz takip ediliyor", body: "Yönetim talebinizin kalan adımlarını takip ediyor." },
  },
  incoming_call: {
    ar: { title: "مكالمة واردة", body: "لديك مكالمة جديدة في LegalSOS." },
    en: { title: "Incoming call", body: "You have a new LegalSOS call." },
    tr: { title: "Gelen arama", body: "Yeni bir LegalSOS aramanız var." },
  },
};

export function buildMobilePushMessage(event: MobilePushEvent) {
  const data: Record<string, string> = {
    eventType: event.eventType,
    requestId: event.requestId,
  };
  if (event.callId) data.callId = event.callId;
  if (event.mediaKind) data.mediaKind = event.mediaKind;
  if (event.callerName) data.callerName = event.callerName;

  return {
    notification: copy[event.eventType][event.locale],
    data,
    ...mobileNotificationSound,
  };
}

const permanentlyInvalidCodes = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export function createMobilePushSender({
  store,
  messaging,
  filterTokens = filterNotificationTokens,
  onDelivery = () => undefined,
}: {
  store: MobilePushTokenStore;
  messaging: MobilePushMessaging;
  filterTokens?: (tokens:string[],category:NotificationCategory)=>Promise<string[]>;
  onDelivery?: (report: MobilePushDeliveryReport) => void;
}) {
  async function deliver(
    tokens: string[],
    event: MobilePushEvent,
    recipientRole: "client" | "lawyer",
  ) {
    const uniqueTokens = await filterTokens(
      [...new Set(tokens)],
      event.eventType === "incoming_call" || event.eventType === "new_message"
        ? "communications"
        : "requests",
    );
    if (uniqueTokens.length === 0) {
      const result = { sent: 0, failed: 0, pruned: 0 };
      onDelivery({ eventType: event.eventType, requestId: event.requestId, recipientRole, ...result });
      return result;
    }

    let sent = 0;
    let failed = 0;
    const stale: string[] = [];
    for (let offset = 0; offset < uniqueTokens.length; offset += 500) {
      const chunk = uniqueTokens.slice(offset, offset + 500);
      const result = await messaging.sendEachForMulticast({
        tokens: chunk,
        ...buildMobilePushMessage(event),
      });
      sent += result.successCount;
      failed += result.failureCount;
      result.responses.forEach((response, index) => {
        if (
          !response.success &&
          response.error &&
          permanentlyInvalidCodes.has(response.error.code)
        ) {
          stale.push(chunk[index]);
        }
      });
    }
    if (stale.length > 0) await store.pruneInstallationTokens(stale);
    const result = { sent, failed, pruned: stale.length };
    onDelivery({ eventType: event.eventType, requestId: event.requestId, recipientRole, ...result });
    return result;
  }

  return {
    async sendLawyerPush(
      event: MobilePushEvent & { lawyerId: string },
    ) {
      return deliver(await store.tokensForLawyer(event.lawyerId), event, "lawyer");
    },
    async sendClientPush(event: MobilePushEvent) {
      return deliver(await store.tokensForRequest(event.requestId), event, "client");
    },
  };
}

export async function mobilePushSender() {
  const { firebaseMessaging } = await import("./firebase-admin");
  return createMobilePushSender({
    store: mobilePushStore,
    messaging: firebaseMessaging(),
    onDelivery: (report) => console.info("[mobile-push] delivery", report),
  });
}
