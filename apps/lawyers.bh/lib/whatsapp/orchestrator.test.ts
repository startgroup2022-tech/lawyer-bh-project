import { describe, expect, it, vi } from "vitest";
import { createWhatsAppOrchestrator } from "./orchestrator";

const message = { messageId: "wamid.1", phoneNumberId: "phone-1", customerWaId: "97336000000", kind: "text" as const, text: "كم السعر؟" };

function setup() {
  const meta = { send: vi.fn() };
  const repository = {
    claimMessage: vi.fn().mockResolvedValue(true),
    getOrCreateConversation: vi.fn().mockResolvedValue({ id: "c1", language: "ar", workflowState: "discovery", selections: {}, humanHandoff: false }),
    saveConversation: vi.fn(),
    requestHumanHandoff: vi.fn(),
  };
  const catalogue = {
    listLegalCases: vi.fn().mockResolvedValue([]),
    listServices: vi.fn().mockResolvedValue([]),
    listConsultationMethods: vi.fn().mockResolvedValue([{ id: "m1", key: "video", name: "مرئية", price: 91, currencyCode: "BHD", durationMinutes: 47 }]),
    listLawyers: vi.fn().mockResolvedValue([]),
    listAvailability: vi.fn().mockResolvedValue({ dates: [], periods: [] }),
  };
  const intent = { decide: vi.fn().mockResolvedValue({ action: "show_consultation_methods" }) };
  return { meta, repository, catalogue, intent, orchestrator: createWhatsAppOrchestrator({ meta, repository, catalogue, intent }) };
}

describe("Dr. Nabih WhatsApp orchestration", () => {
  it("renders consultation values from the current catalogue result", async () => {
    const { orchestrator, meta } = setup();
    await orchestrator.process(message);
    expect(meta.send).toHaveBeenCalledWith("97336000000", expect.objectContaining({
      options: [expect.objectContaining({ description: "91 د.ب · 47 دقيقة" })],
    }));
  });

  it("does not send a previous price when the current lookup fails", async () => {
    const { orchestrator, catalogue, meta } = setup();
    catalogue.listConsultationMethods.mockRejectedValue(new Error("db unavailable"));
    await orchestrator.process(message);
    const sent = JSON.stringify(meta.send.mock.calls);
    expect(sent).toContain("تعذر جلب البيانات الحالية");
    expect(sent).not.toContain("91");
  });

  it("does not process a duplicate Meta message", async () => {
    const { orchestrator, repository, meta, intent } = setup();
    repository.claimMessage.mockResolvedValue(false);
    await orchestrator.process(message);
    expect(intent.decide).not.toHaveBeenCalled();
    expect(meta.send).not.toHaveBeenCalled();
  });

  it("pauses automation after human handoff", async () => {
    const { orchestrator, repository, meta, intent } = setup();
    repository.getOrCreateConversation.mockResolvedValue({ id: "c1", language: "ar", workflowState: "discovery", selections: {}, humanHandoff: true });
    await orchestrator.process(message);
    expect(intent.decide).not.toHaveBeenCalled();
    expect(meta.send).not.toHaveBeenCalled();
  });
});
