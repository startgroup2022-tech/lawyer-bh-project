export type NormalizedWhatsAppMessage = {
  messageId: string;
  phoneNumberId: string;
  customerWaId: string;
  kind: "text" | "selection";
  text: string;
  selectionId?: string;
};

export type WhatsAppOption = {
  id: string;
  title: string;
  description?: string;
};

export type WhatsAppOutboundMessage =
  | { type: "text"; text: string }
  | {
      type: "interactive";
      body: string;
      mode: "button" | "list";
      options: WhatsAppOption[];
      actionLabel?: string;
    };
