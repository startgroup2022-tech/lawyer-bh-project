import "server-only";

import { sqlClient } from "@/lib/db/client";
import { firebaseMessaging } from "@/lib/sos/firebase-admin";
import { mobileNotificationSound } from "@/lib/mobile-notification-sound";

import { drainAdminEscalationPush } from "./escalation-push";
import { createEscalationPushStore } from "./escalation-push-store";

export async function runAdminEscalationPush(input: { now: Date; limit: number }) {
  const store = createEscalationPushStore(sqlClient);
  const messaging = firebaseMessaging();
  return drainAdminEscalationPush({
    ...store,
    send: (tokens, message) => messaging.sendEachForMulticast({
      tokens,
      ...message,
      ...mobileNotificationSound,
    }),
  }, input.now, input.limit);
}
