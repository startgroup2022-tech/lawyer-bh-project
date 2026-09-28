import type { NormalizedWhatsAppMessage } from "./contracts";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseMetaMessages(payload: unknown): NormalizedWhatsAppMessage[] {
  const root = record(payload);
  if (root?.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) {
    return [];
  }

  const result: NormalizedWhatsAppMessage[] = [];

  for (const rawEntry of root.entry) {
    const entry = record(rawEntry);
    if (!Array.isArray(entry?.changes)) continue;

    for (const rawChange of entry.changes) {
      const change = record(rawChange);
      const value = record(change?.value);
      const metadata = record(value?.metadata);
      const phoneNumberId = nonEmpty(metadata?.phone_number_id);

      if (change?.field !== "messages" || !phoneNumberId || !Array.isArray(value?.messages)) {
        continue;
      }

      for (const rawMessage of value.messages) {
        const message = record(rawMessage);
        const messageId = nonEmpty(message?.id);
        const customerWaId = nonEmpty(message?.from);
        if (!messageId || !customerWaId) continue;

        if (message?.type === "text") {
          const text = nonEmpty(record(message.text)?.body);
          if (text) result.push({ messageId, phoneNumberId, customerWaId, kind: "text", text });
          continue;
        }

        if (message?.type === "interactive") {
          const interactive = record(message.interactive);
          const reply = record(interactive?.button_reply) ?? record(interactive?.list_reply);
          const selectionId = nonEmpty(reply?.id);
          const title = nonEmpty(reply?.title);
          if (selectionId && title) {
            result.push({ messageId, phoneNumberId, customerWaId, kind: "selection", text: title, selectionId });
          }
        }
      }
    }
  }

  return result;
}
