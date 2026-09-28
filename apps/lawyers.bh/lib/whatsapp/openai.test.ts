import { describe, expect, it, vi } from "vitest";
import { createIntentEngine } from "./openai";

describe("WhatsApp OpenAI intent engine", () => {
  it("accepts only allowlisted workflow actions", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      output: [{ type: "function_call", name: "show_consultation_methods", arguments: "{}" }],
    }), { status: 200 }));
    const engine = createIntentEngine({ apiKey: "test-key", model: "test-model", fetcher });

    await expect(engine.decide({ language: "ar", text: "كم سعر الاستشارة؟", state: "discovery" }))
      .resolves.toEqual({ action: "show_consultation_methods" });
  });

  it("falls back safely for an unknown action or API failure", async () => {
    const unknown = createIntentEngine({ apiKey: "test", model: "test", fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify({ output: [{ type: "function_call", name: "set_price", arguments: "{\"price\":1}" }] }), { status: 200 })) });
    const failed = createIntentEngine({ apiKey: "test", model: "test", fetcher: vi.fn().mockResolvedValue(new Response("no", { status: 503 })) });

    await expect(unknown.decide({ language: "ar", text: "test", state: "discovery" })).resolves.toEqual({ action: "structured_fallback" });
    await expect(failed.decide({ language: "ar", text: "test", state: "discovery" })).resolves.toEqual({ action: "structured_fallback" });
  });
});
