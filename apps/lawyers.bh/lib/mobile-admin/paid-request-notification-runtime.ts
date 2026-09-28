import "server-only";

import { sqlClient } from "@/lib/db/client";
import { sendEmail } from "@/lib/postmark";
import { firebaseMessaging } from "@/lib/sos/firebase-admin";
import { mobileNotificationSound } from "@/lib/mobile-notification-sound";

import { createPaidRequestNotificationStore } from "./paid-request-notification-store";
import { drainPaidRequestAdminNotifications } from "./paid-request-notifications";

export async function runPaidRequestAdminNotifications(input: { now: Date; limit: number }) {
  const store = createPaidRequestNotificationStore(sqlClient);
  return drainPaidRequestAdminNotifications({
    ...store,
    sendEmail,
    sendPush: (tokens, message) => firebaseMessaging().sendEachForMulticast({
      tokens,
      ...message,
      ...mobileNotificationSound,
    }),
  }, input.now, input.limit);
}
