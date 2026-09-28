export type AdminPushLocale = "ar" | "en" | "tr";
export type AdminPushEvent = { id: string; requestId: string; reportId?: string | null; eventType?: "admin_request_escalated" | "moderation_report"; attemptCount: number; createdAt: Date };
export type AdminPushRecipient = { token: string; locale: AdminPushLocale };
export type AdminPushResponse = { success: boolean; error?: { code: string } };
export type AdminPushResult = { successCount: number; failureCount: number; responses: AdminPushResponse[] };
export type AdminPushMessage = { notification: { title: string; body: string }; data: Record<string, string> };

export type EscalationPushDependencies = {
  claim(limit: number, now: Date): Promise<AdminPushEvent[]>;
  recipients(event: AdminPushEvent): Promise<AdminPushRecipient[]>;
  send(tokens: string[], message: AdminPushMessage): Promise<AdminPushResult>;
  markDelivered(id: string): Promise<void>;
  markRetry(input: { id: string; terminal: boolean; nextAttemptAt: Date; errorCode: string }): Promise<void>;
  prune(tokens: string[]): Promise<void>;
};

const copy: Record<AdminPushLocale, { title: string; body: string }> = {
  ar: { title: "طلب يحتاج تعيين محامي", body: "افتح لوحة الإدارة لمراجعة الطلب." },
  en: { title: "Request needs a lawyer", body: "Open the admin area to review it." },
  tr: { title: "Talep için avukat gerekli", body: "İncelemek için yönetim ekranını açın." },
};

const moderationCopy: Record<AdminPushLocale, { title: string; body: string }> = {
  ar: { title: "بلاغ جديد عن سلامة المحادثة", body: "افتح قسم الإشراف لمراجعة البلاغ." },
  en: { title: "New chat safety report", body: "Open moderation to review the report." },
  tr: { title: "Yeni sohbet güvenliği bildirimi", body: "Bildirimi incelemek için moderasyonu açın." },
};

export function buildAdminEscalationMessage(requestId: string, locale: AdminPushLocale): AdminPushMessage {
  return {
    notification: copy[locale],
    data: { eventType: "admin_request_escalated", requestId },
  };
}

export function buildAdminModerationMessage(requestId: string, reportId: string, locale: AdminPushLocale): AdminPushMessage {
  return {
    notification: moderationCopy[locale],
    data: { eventType: "moderation_report", requestId, reportId },
  };
}

export async function drainAdminEscalationPush(
  deps: EscalationPushDependencies, now: Date, limit: number,
): Promise<{ claimed: number; delivered: number; retried: number }> {
  const events = await deps.claim(Math.min(Math.max(limit, 1), 50), now);
  let delivered = 0;
  let retried = 0;
  for (const event of events) {
    let errorCode = "delivery_failed";
    try {
      const recipients = await deps.recipients(event);
      if (recipients.length === 0) {
        errorCode = "no_admin_devices";
      } else {
        const stale: string[] = [];
        let failed = false;
        for (const locale of ["ar", "en", "tr"] as const) {
          const tokens = [...new Set(recipients.filter((recipient) => recipient.locale === locale).map((recipient) => recipient.token))];
          for (let offset = 0; offset < tokens.length; offset += 500) {
            const chunk = tokens.slice(offset, offset + 500);
            const message = event.eventType === "moderation_report" && event.reportId
              ? buildAdminModerationMessage(event.requestId, event.reportId, locale)
              : buildAdminEscalationMessage(event.requestId, locale);
            const result = await deps.send(chunk, message);
            if (result.failureCount > 0 || result.responses.length !== chunk.length) failed = true;
            result.responses.forEach((response, index) => {
              if (!response.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(response.error?.code ?? "")) {
                stale.push(chunk[index]);
              }
            });
          }
        }
        if (stale.length > 0) await deps.prune(stale);
        if (!failed) {
          await deps.markDelivered(event.id);
          delivered += 1;
          continue;
        }
      }
    } catch {
      errorCode = "firebase_unavailable";
    }
    const terminal = event.attemptCount >= 8 || now.getTime() - event.createdAt.getTime() >= 24 * 60 * 60 * 1000;
    const delayMinutes = Math.min(2 ** Math.max(0, event.attemptCount - 1), 60);
    await deps.markRetry({ id: event.id, terminal, nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000), errorCode });
    retried += 1;
  }
  return { claimed: events.length, delivered, retried };
}
