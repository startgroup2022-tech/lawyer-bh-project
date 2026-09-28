import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

let configured = false;

function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:info@lawyers.bh";
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys missing — set NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in .env.local",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface SosPushPayload {
  /** Browser notification title (the bold first line). */
  title: string;
  /** Body text (one line, brief). */
  body: string;
  /** URL to open when the notification is clicked. Should be a full
   *  path on lawyers.bh, e.g. `/en/sos/lawyer/dashboard`. */
  url: string;
  /** Optional case reference for grouping multiple notifications. */
  tag?: string;
}

/** Sends a push notification to every subscription belonging to the
 *  given advocate. Subscriptions that come back as 410/404 are
 *  considered stale and are removed from the table so we don't keep
 *  pinging dead browser endpoints. Best-effort — caller doesn't need
 *  to await this. */
export async function pushToAdvocate(
  advocateId: string,
  payload: SosPushPayload,
): Promise<{ sent: number; pruned: number; retried?: number }> {
  configure();

  const subs = await db
    .select({
      id: schema.lawyerPushSubscriptions.id,
      endpoint: schema.lawyerPushSubscriptions.endpoint,
      p256dhKey: schema.lawyerPushSubscriptions.p256dhKey,
      authKey: schema.lawyerPushSubscriptions.authKey,
    })
    .from(schema.lawyerPushSubscriptions)
    .where(eq(schema.lawyerPushSubscriptions.advocateId, advocateId));

  if (subs.length === 0) return { sent: 0, pruned: 0, retried: 0 };

  const json = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;

  let retried = 0;

  await Promise.all(
    subs.map(async (sub) => {
      // Up to 3 attempts with exponential back-off on transient
      // errors (429 rate-limit, 502/503/504 service hiccup). 404/410
      // mean the subscription is actually gone — prune immediately.
      let attempt = 0;
      while (attempt < 3) {
        attempt++;
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dhKey, auth: sub.authKey },
            },
            json,
            { TTL: 300, urgency: "high" },
          );
          sent++;
          if (attempt > 1) retried++;
          return;
        } catch (err: unknown) {
          const status =
            err && typeof err === "object" && "statusCode" in err
              ? (err as { statusCode?: number }).statusCode
              : undefined;
          if (status === 404 || status === 410) {
            await db
              .delete(schema.lawyerPushSubscriptions)
              .where(eq(schema.lawyerPushSubscriptions.id, sub.id));
            pruned++;
            return;
          }
          const transient =
            status === 429 ||
            status === 502 ||
            status === 503 ||
            status === 504 ||
            status === undefined;
          if (!transient || attempt >= 3) {
            console.warn(
              "[sos/webpush] sendNotification failed",
              status,
              err,
            );
            return;
          }
          // 250ms, 750ms, 2.25s — bounded so the request finishes in
          // ~3s worst case even when every push retries.
          const backoffMs = 250 * Math.pow(3, attempt - 1);
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
    }),
  );

  return { sent, pruned, retried };
}
