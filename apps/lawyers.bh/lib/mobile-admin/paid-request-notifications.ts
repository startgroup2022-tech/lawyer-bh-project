export type PaidRequestNotificationLocale = "ar" | "en" | "tr";
export type PaidRequestNotificationChannel = "email" | "push";

export type PaidRequestNotificationEvent = {
  id: string;
  requestId: string;
  caseRef: string;
  amountBhd: string;
  createdAt: Date;
  emailPending: boolean;
  pushPending: boolean;
  emailAttemptCount: number;
  pushAttemptCount: number;
};

export type PaidRequestRecipient = { token: string; locale: PaidRequestNotificationLocale };
export type PaidRequestEmail = { to: string; subject: string; text: string; html: string };
export type PaidRequestPush = { notification: { title: string; body: string }; data: Record<string, string> };
export type PaidRequestPushResult = { successCount: number; failureCount: number; responses: Array<{ success: boolean; error?: { code: string } }> };

export type PaidRequestNotificationDependencies = {
  claim(limit: number, now: Date): Promise<PaidRequestNotificationEvent[]>;
  recipients(): Promise<PaidRequestRecipient[]>;
  sendEmail(message: PaidRequestEmail): Promise<unknown>;
  sendPush(tokens: string[], message: PaidRequestPush): Promise<PaidRequestPushResult>;
  markDelivered(id: string, channel: PaidRequestNotificationChannel): Promise<void>;
  markRetry(input: { id: string; channel: PaidRequestNotificationChannel; terminal: boolean; nextAttemptAt: Date; errorCode: string }): Promise<void>;
  prune(tokens: string[]): Promise<void>;
};

const pushCopy: Record<PaidRequestNotificationLocale, { title: string; body: (reference: string) => string }> = {
  ar: { title: "طلب LegalSOS مدفوع جديد", body: (reference) => `تم تأكيد الدفع للطلب ${reference}.` },
  en: { title: "New paid LegalSOS request", body: (reference) => `Payment was confirmed for request ${reference}.` },
  tr: { title: "Yeni ödenmiş LegalSOS talebi", body: (reference) => `${reference} talebinin ödemesi onaylandı.` },
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function buildPaidRequestAdminEmail(event: PaidRequestNotificationEvent): PaidRequestEmail {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lawyers.bh"}/ar/admin/requests/emergency/${encodeURIComponent(event.requestId)}`;
  const reference = event.caseRef || event.requestId;
  const subject = `طلب LegalSOS مدفوع جديد - ${reference}`;
  const text = `تم تأكيد طلب LegalSOS مدفوع جديد.\nرقم الطلب: ${reference}\nالمبلغ: ${event.amountBhd} BHD\nفتح الطلب: ${adminUrl}`;
  const html = `<div dir="rtl"><h2>طلب LegalSOS مدفوع جديد</h2><p>رقم الطلب: <strong>${escapeHtml(reference)}</strong></p><p>المبلغ: ${escapeHtml(event.amountBhd)} BHD</p><p><a href="${escapeHtml(adminUrl)}">فتح الطلب في لوحة الإدارة</a></p></div>`;
  return { to: "info@lawyers.bh", subject, text, html };
}

export function buildPaidRequestAdminPush(event: PaidRequestNotificationEvent, locale: PaidRequestNotificationLocale): PaidRequestPush {
  const copy = pushCopy[locale];
  return {
    notification: { title: copy.title, body: copy.body(event.caseRef || event.requestId) },
    data: { eventType: "admin_request_paid", requestId: event.requestId },
  };
}

function retryInput(event: PaidRequestNotificationEvent, channel: PaidRequestNotificationChannel, now: Date, errorCode: string) {
  const attempts = channel === "email" ? event.emailAttemptCount : event.pushAttemptCount;
  const terminal = attempts >= 8 || now.getTime() - event.createdAt.getTime() >= 24 * 60 * 60 * 1000;
  const delayMinutes = Math.min(2 ** Math.max(0, attempts - 1), 60);
  return { id: event.id, channel, terminal, nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000), errorCode };
}

export async function drainPaidRequestAdminNotifications(
  deps: PaidRequestNotificationDependencies,
  now: Date,
  limit: number,
): Promise<{ claimed: number; emailDelivered: number; pushDelivered: number; retried: number }> {
  const events = await deps.claim(Math.min(Math.max(limit, 1), 50), now);
  let emailDelivered = 0;
  let pushDelivered = 0;
  let retried = 0;

  for (const event of events) {
    if (event.emailPending) {
      try {
        await deps.sendEmail(buildPaidRequestAdminEmail(event));
        await deps.markDelivered(event.id, "email");
        emailDelivered += 1;
      } catch {
        await deps.markRetry(retryInput(event, "email", now, "email_unavailable"));
        retried += 1;
      }
    }

    if (event.pushPending) {
      let errorCode = "delivery_failed";
      try {
        const recipients = await deps.recipients();
        if (recipients.length === 0) {
          errorCode = "no_admin_devices";
        } else {
          const stale: string[] = [];
          let failed = false;
          for (const locale of ["ar", "en", "tr"] as const) {
            const tokens = [...new Set(recipients.filter((recipient) => recipient.locale === locale).map((recipient) => recipient.token))];
            for (let offset = 0; offset < tokens.length; offset += 500) {
              const chunk = tokens.slice(offset, offset + 500);
              if (chunk.length === 0) continue;
              const result = await deps.sendPush(chunk, buildPaidRequestAdminPush(event, locale));
              if (result.failureCount > 0 || result.responses.length !== chunk.length) failed = true;
              result.responses.forEach((response, index) => {
                if (!response.success && ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(response.error?.code ?? "")) stale.push(chunk[index]);
              });
            }
          }
          if (stale.length > 0) await deps.prune(stale);
          if (!failed) {
            await deps.markDelivered(event.id, "push");
            pushDelivered += 1;
            continue;
          }
        }
      } catch {
        errorCode = "push_unavailable";
      }
      await deps.markRetry(retryInput(event, "push", now, errorCode));
      retried += 1;
    }
  }

  return { claimed: events.length, emailDelivered, pushDelivered, retried };
}
