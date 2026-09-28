import "server-only";

import { mobileNotificationStore, type MobileNotificationStore } from "./store";
import type { MobileNotificationInput, MobileNotificationSend } from "./types";
import {filterNotificationTokens} from '../../notification-preferences/runtime';
import type {NotificationCategory} from '../../notification-preferences/validation';
import { mobileNotificationSound } from "@/lib/mobile-notification-sound";

interface SendResponse { success: boolean; error?: { code: string } }
interface Messaging {
  sendEachForMulticast(message: {
    tokens: string[];
    notification: { title: string; body: string };
    data: { type: "admin_broadcast"; notificationId: string };
    apns: { headers: { "apns-priority": "10" }; payload: { aps: { sound: "legalsos_alarm_classic.caf" } } };
    android: {
      priority: "high";
      notification: { channelId: "legalsos_alarm_classic_v1"; sound: "legalsos_alarm_classic" };
    };
  }): Promise<{ successCount: number; failureCount: number; responses: SendResponse[] }>;
}

const permanentlyInvalidCodes = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export async function sendAdminMobileNotification(
  input: MobileNotificationInput,
  dependencies?: { store: MobileNotificationStore; messaging: Messaging; filterTokens?:(tokens:string[],category:NotificationCategory)=>Promise<string[]> },
): Promise<MobileNotificationSend> {
  const store = dependencies?.store ?? mobileNotificationStore;
  const existing = await store.findSendByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing;

  const started = await store.startSend(input);
  if (!started.created) return started.record;
  const record = started.record;
  try {
    const candidates = await store.tokensForAudience(input.audience);
    const allowed = new Set(await (dependencies?.filterTokens??filterNotificationTokens)(candidates.map(item=>item.token),'advertising'));
    const installations = candidates.filter(item=>allowed.has(item.token));
    let successful = 0;
    let failed = 0;
    const stale: string[] = [];
    for (const language of ["ar", "en"] as const) {
      const localized = installations.filter((item) => language === "ar" ? item.locale === "ar" : item.locale !== "ar");
      for (let offset = 0; offset < localized.length; offset += 500) {
        const chunk = localized.slice(offset, offset + 500);
        const messaging = dependencies?.messaging ?? (await import("@/lib/sos/firebase-admin")).firebaseMessaging();
        const result = await messaging.sendEachForMulticast({
          tokens: chunk.map((item) => item.token),
          notification: language === "ar"
            ? { title: input.titleAr, body: input.bodyAr }
            : { title: input.titleEn, body: input.bodyEn },
          data: { type: "admin_broadcast", notificationId: record.id },
          ...mobileNotificationSound,
        });
        successful += result.successCount;
        failed += result.failureCount;
        result.responses.forEach((response, index) => {
          if (!response.success && response.error && permanentlyInvalidCodes.has(response.error.code)) {
            stale.push(chunk[index].token);
          }
        });
      }
    }
    if (stale.length > 0) await store.pruneTokens(stale);
    return await store.finishSend(record.id, {
      targeted: installations.length,
      successful,
      failed,
      pruned: new Set(stale).size,
    });
  } catch (error) {
    await store.failSend(record.id);
    throw error;
  }
}
