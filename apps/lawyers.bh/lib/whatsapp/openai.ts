import "server-only";

import { DR_NABIH_INSTRUCTIONS } from "./persona";

const ACTIONS = [
  "show_legal_cases",
  "show_services",
  "show_consultation_methods",
  "show_lawyers",
  "show_availability",
  "clarify",
  "human_handoff",
] as const;

type Action = (typeof ACTIONS)[number];
export type AssistantDecision = { action: Action | "structured_fallback" };

type IntentEngineConfig = {
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
};

export function createIntentEngine(config: IntentEngineConfig) {
  const fetcher = config.fetcher ?? fetch;

  return {
    async decide(input: {
      language: "ar" | "en";
      text: string;
      state: string;
    }): Promise<AssistantDecision> {
      try {
        const response = await fetcher("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            instructions: DR_NABIH_INSTRUCTIONS,
            input: `language=${input.language}\nstate=${input.state}\ncustomer=${input.text}`,
            tool_choice: "required",
            tools: ACTIONS.map((name) => ({
              type: "function",
              name,
              description: `Choose the ${name} workflow action`,
              strict: true,
              parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
            })),
            store: false,
          }),
        });

        if (!response.ok) return { action: "structured_fallback" };

        const body = await response.json() as { output?: Array<{ type?: string; name?: string }> };
        const call = body.output?.find((item) => item.type === "function_call");
        return call?.name && ACTIONS.includes(call.name as Action)
          ? { action: call.name as Action }
          : { action: "structured_fallback" };
      } catch {
        return { action: "structured_fallback" };
      }
    },
  };
}
