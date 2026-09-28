import type { NormalizedWhatsAppMessage } from "./contracts";

export type WhatsAppConversation = {
  id: string;
  language: "ar" | "en";
  workflowState: string;
  selections: Record<string, string>;
  humanHandoff: boolean;
};

export type WhatsAppRepository = {
  claimMessage(messageId: string): Promise<boolean>;
  getOrCreateConversation(message: NormalizedWhatsAppMessage): Promise<WhatsAppConversation>;
  saveConversation(conversation: WhatsAppConversation): Promise<void>;
  requestHumanHandoff(conversationId: string, reason: string): Promise<void>;
};

export function createMemoryWhatsAppRepository(): WhatsAppRepository {
  const claimed = new Set<string>();
  const conversations = new Map<string, WhatsAppConversation>();

  return {
    async claimMessage(messageId) {
      if (claimed.has(messageId)) return false;
      claimed.add(messageId);
      return true;
    },
    async getOrCreateConversation(message) {
      const key = `${message.phoneNumberId}:${message.customerWaId}`;
      let conversation = conversations.get(key);
      if (!conversation) {
        conversation = { id: crypto.randomUUID(), language: /[A-Za-z]/.test(message.text) && !/[\u0600-\u06ff]/.test(message.text) ? "en" : "ar", workflowState: "discovery", selections: {}, humanHandoff: false };
        conversations.set(key, conversation);
      }
      return conversation;
    },
    async saveConversation(conversation) {
      for (const [key, current] of conversations) if (current.id === conversation.id) conversations.set(key, conversation);
    },
    async requestHumanHandoff(conversationId, reason) {
      for (const conversation of conversations.values()) {
        if (conversation.id === conversationId) {
          conversation.humanHandoff = true;
          conversation.workflowState = "human_handoff";
          conversation.selections.handoffReason = reason;
        }
      }
    },
  };
}

export type WhatsAppSql = <T extends Record<string, unknown>[] = Record<string, unknown>[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T>;

export function createPostgresWhatsAppRepository(sql: WhatsAppSql): WhatsAppRepository {
  return {
    async claimMessage(messageId) {
      const rows = await sql<Array<{ message_id: string }>>`
        INSERT INTO public.whatsapp_processed_events (message_id)
        VALUES (${messageId})
        ON CONFLICT (message_id) DO NOTHING
        RETURNING message_id
      `;
      return rows.length === 1;
    },
    async getOrCreateConversation(message) {
      const language = /[A-Za-z]/.test(message.text) && !/[\u0600-\u06ff]/.test(message.text) ? "en" : "ar";
      const rows = await sql<Array<{ id: string; language: "ar" | "en"; workflow_state: string; selections: Record<string, string>; human_handoff: boolean }>>`
        INSERT INTO public.whatsapp_conversations (phone_number_id, customer_wa_id, language)
        VALUES (${message.phoneNumberId}, ${message.customerWaId}, ${language})
        ON CONFLICT (phone_number_id, customer_wa_id)
        DO UPDATE SET updated_at = public.whatsapp_conversations.updated_at
        RETURNING id, language, workflow_state, selections, human_handoff
      `;
      const row = rows[0];
      if (!row) throw new Error("WhatsApp conversation could not be loaded");
      return { id: row.id, language: row.language, workflowState: row.workflow_state, selections: row.selections ?? {}, humanHandoff: row.human_handoff };
    },
    async saveConversation(conversation) {
      await sql`
        UPDATE public.whatsapp_conversations
        SET workflow_state = ${conversation.workflowState}, selections = ${JSON.stringify(conversation.selections)}::jsonb, updated_at = now()
        WHERE id = ${conversation.id}::uuid
      `;
    },
    async requestHumanHandoff(conversationId, reason) {
      await sql`
        UPDATE public.whatsapp_conversations
        SET human_handoff = true, human_handoff_reason = ${reason}, human_handoff_at = now(), workflow_state = 'human_handoff', updated_at = now()
        WHERE id = ${conversationId}::uuid
      `;
    },
  };
}
