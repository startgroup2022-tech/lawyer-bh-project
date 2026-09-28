import "server-only";

import type { WhatsAppOutboundMessage } from "./contracts";

type MetaClientConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  fetcher?: typeof fetch;
};

function metaMessage(message: WhatsAppOutboundMessage): Record<string, unknown> {
  if (message.type === "text") {
    return { type: "text", text: { body: message.text.slice(0, 4096) } };
  }

  if (message.mode === "button") {
    return {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message.body.slice(0, 1024) },
        action: {
          buttons: message.options.slice(0, 3).map((option) => ({
            type: "reply",
            reply: { id: option.id.slice(0, 256), title: option.title.slice(0, 20) },
          })),
        },
      },
    };
  }

  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: message.body.slice(0, 1024) },
      action: {
        button: (message.actionLabel ?? "Options").slice(0, 20),
        sections: [{
          title: message.body.slice(0, 24),
          rows: message.options.slice(0, 10).map((option) => ({
            id: option.id.slice(0, 200),
            title: option.title.slice(0, 24),
            ...(option.description ? { description: option.description.slice(0, 72) } : {}),
          })),
        }],
      },
    },
  };
}

export function createMetaClient(config: MetaClientConfig) {
  const fetcher = config.fetcher ?? fetch;

  return {
    async send(to: string, message: WhatsAppOutboundMessage): Promise<void> {
      const response = await fetcher(
        `https://graph.facebook.com/${encodeURIComponent(config.graphVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messaging_product: "whatsapp", to, ...metaMessage(message) }),
        },
      );

      if (!response.ok) {
        throw new Error(`Meta WhatsApp request failed (${response.status})`);
      }
    },
  };
}
