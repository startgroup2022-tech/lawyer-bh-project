import "server-only";

import type { NormalizedWhatsAppMessage } from "./contracts";
import { sqlClient } from "@/lib/db/client";
import {
  listLiveAvailability,
  listLiveConsultationMethods,
  listLiveLawyers,
  listLiveLegalCases,
  listLiveServiceStages,
} from "./catalogue";
import { createMetaClient } from "./meta-client";
import { createIntentEngine } from "./openai";
import { createWhatsAppOrchestrator } from "./orchestrator";
import {
  createPostgresWhatsAppRepository,
  type WhatsAppSql,
} from "./repository";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required WhatsApp setting: ${name}`);
  return value;
}

function buildOrchestrator() {
  const meta = createMetaClient({
    accessToken: required("META_WHATSAPP_ACCESS_TOKEN"),
    phoneNumberId: required("META_WHATSAPP_PHONE_NUMBER_ID"),
    graphVersion: required("META_WHATSAPP_GRAPH_VERSION"),
  });
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_WHATSAPP_MODEL?.trim();
  const intent = apiKey && model
    ? createIntentEngine({ apiKey, model })
    : { decide: async () => ({ action: "structured_fallback" as const }) };

  return createWhatsAppOrchestrator({
    meta,
    intent,
    repository: createPostgresWhatsAppRepository(sqlClient as unknown as WhatsAppSql),
    catalogue: {
      listLegalCases: listLiveLegalCases,
      listServices: async (language) => listLiveServiceStages(language),
      listConsultationMethods: listLiveConsultationMethods,
      listLawyers: listLiveLawyers,
      listAvailability: async (language) => listLiveAvailability(language),
    },
  });
}

let orchestrator: ReturnType<typeof buildOrchestrator> | undefined;

export async function processInboundMessage(
  message: NormalizedWhatsAppMessage,
): Promise<void> {
  orchestrator ??= buildOrchestrator();
  await orchestrator.process(message);
}
