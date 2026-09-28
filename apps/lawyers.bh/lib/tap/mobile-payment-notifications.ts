import { mobilePushSender } from "@/lib/sos/mobile-push";
import type { MobilePushEventType, MobilePushLocale } from "@/lib/sos/mobile-push";

type ClientPushSender = {
  sendClientPush(event: {
    eventType: MobilePushEventType;
    requestId: string;
    locale: MobilePushLocale;
  }): Promise<unknown>;
};

type NotifyClientPaymentEventInput = {
  eventType: "payment_confirmed" | "request_cancelled";
  requestId: string;
  locale: string | null | undefined;
  source: "payment-confirm" | "payment-cancel";
};

function normalizeLocale(locale: string | null | undefined): MobilePushLocale {
  return locale === "en" || locale === "tr" ? locale : "ar";
}

export async function notifyClientPaymentEvent(
  input: NotifyClientPaymentEventInput,
  senderFactory: () => Promise<ClientPushSender> = mobilePushSender,
): Promise<void> {
  try {
    const sender = await senderFactory();
    await sender.sendClientPush({
      eventType: input.eventType,
      requestId: input.requestId,
      locale: normalizeLocale(input.locale),
    });
  } catch (error) {
    console.warn(`[mobile/tap/${input.source}] push delivery failed`, {
      requestId: input.requestId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
