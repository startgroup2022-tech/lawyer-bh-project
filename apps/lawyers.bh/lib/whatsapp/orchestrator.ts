import type { NormalizedWhatsAppMessage, WhatsAppOutboundMessage } from "./contracts";
import type { AssistantDecision } from "./openai";
import { CURRENT_DATA_UNAVAILABLE, renderConsultationMethods, renderOptions } from "./render";

type Conversation = {
  id: string;
  language: "ar" | "en";
  workflowState: string;
  selections: Record<string, string>;
  humanHandoff: boolean;
};

type Dependencies = {
  meta: { send(to: string, message: WhatsAppOutboundMessage): Promise<void> };
  repository: {
    claimMessage(messageId: string): Promise<boolean>;
    getOrCreateConversation(message: NormalizedWhatsAppMessage): Promise<Conversation>;
    saveConversation(conversation: Conversation): Promise<void>;
    requestHumanHandoff(conversationId: string, reason: string): Promise<void>;
  };
  catalogue: {
    listLegalCases(language: "ar" | "en"): Promise<Array<{ id: string; key: string; name: string; categoryKey?: string }>>;
    listServices(language: "ar" | "en"): Promise<Array<{ key: string; name: string; description?: string }>>;
    listConsultationMethods(language: "ar" | "en"): Promise<Array<{ id: string; key: string; name: string; price: number; currencyCode: string; durationMinutes: number }>>;
    listLawyers(language: "ar" | "en", categoryKey?: string): Promise<Array<{ id: string; name: string; subtitle?: string }>>;
    listAvailability(language: "ar" | "en"): Promise<{ dates: Array<{ value: string; label: string }>; periods: Array<{ value: string; label: string }> }>;
  };
  intent: { decide(input: { language: "ar" | "en"; text: string; state: string }): Promise<AssistantDecision> };
};

function optionsText(language: "ar" | "en", subject: string) {
  return language === "ar" ? `اختر ${subject}:` : `Choose ${subject}:`;
}

export function createWhatsAppOrchestrator(deps: Dependencies) {
  async function sendAction(message: NormalizedWhatsAppMessage, conversation: Conversation, action: AssistantDecision["action"]) {
    const language = conversation.language;
    if (action === "human_handoff") {
      await deps.repository.requestHumanHandoff(conversation.id, "customer_request");
      await deps.meta.send(message.customerWaId, { type: "text", text: language === "ar" ? "تم تحويل محادثتك إلى فريق خدمة العملاء." : "Your conversation has been transferred to customer service." });
      return;
    }

    if (action === "show_consultation_methods") {
      const methods = await deps.catalogue.listConsultationMethods(language);
      await deps.meta.send(message.customerWaId, renderConsultationMethods(language, methods));
      return;
    }

    if (action === "show_legal_cases") {
      const cases = await deps.catalogue.listLegalCases(language);
      const output = cases.length
        ? renderOptions(optionsText(language, language === "ar" ? "نوع القضية" : "a legal matter"), cases.map((item) => ({ id: `case:${item.key}`, title: item.name })))
        : { type: "text" as const, text: CURRENT_DATA_UNAVAILABLE[language] };
      await deps.meta.send(message.customerWaId, output);
      return;
    }

    if (action === "show_lawyers") {
      const lawyers = await deps.catalogue.listLawyers(language, conversation.selections.categoryKey);
      const output = lawyers.length
        ? renderOptions(optionsText(language, language === "ar" ? "المحامي" : "a lawyer"), lawyers.map((item) => ({ id: `lawyer:${item.id}`, title: item.name, description: item.subtitle })))
        : { type: "text" as const, text: CURRENT_DATA_UNAVAILABLE[language] };
      await deps.meta.send(message.customerWaId, output);
      return;
    }

    if (action === "show_availability") {
      const availability = await deps.catalogue.listAvailability(language);
      const output = availability.dates.length
        ? renderOptions(optionsText(language, language === "ar" ? "اليوم" : "a date"), availability.dates.map((item) => ({ id: `date:${item.value}`, title: item.label })))
        : { type: "text" as const, text: CURRENT_DATA_UNAVAILABLE[language] };
      await deps.meta.send(message.customerWaId, output);
      return;
    }

    const services = await deps.catalogue.listServices(language);
    const output = services.length
      ? renderOptions(language === "ar" ? "كيف يمكنني مساعدتك؟" : "How can I help you?", services.map((item) => ({ id: `service:${item.key}`, title: item.name, description: item.description })))
      : { type: "text" as const, text: CURRENT_DATA_UNAVAILABLE[language] };
    await deps.meta.send(message.customerWaId, output);
  }

  return {
    async process(message: NormalizedWhatsAppMessage): Promise<void> {
      if (!(await deps.repository.claimMessage(message.messageId))) return;
      const conversation = await deps.repository.getOrCreateConversation(message);
      if (conversation.humanHandoff) return;

      try {
        if (message.kind === "selection" && message.selectionId) {
          const [kind, value] = message.selectionId.split(":", 2);
          if (kind && value) {
            conversation.selections[kind] = value;
            conversation.workflowState = kind;
            await deps.repository.saveConversation(conversation);
          }
          const nextAction = kind === "case" ? "show_services" : kind === "service" ? "show_consultation_methods" : kind === "method" ? "show_lawyers" : kind === "lawyer" ? "show_availability" : "structured_fallback";
          await sendAction(message, conversation, nextAction);
          return;
        }

        const decision = await deps.intent.decide({ language: conversation.language, text: message.text, state: conversation.workflowState });
        await sendAction(message, conversation, decision.action);
      } catch {
        await deps.meta.send(message.customerWaId, { type: "text", text: CURRENT_DATA_UNAVAILABLE[conversation.language] });
      }
    },
  };
}
