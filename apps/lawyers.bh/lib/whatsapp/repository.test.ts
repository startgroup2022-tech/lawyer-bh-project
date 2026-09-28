import { describe, expect, it } from "vitest";
import { createMemoryWhatsAppRepository } from "./repository";

const message = { messageId: "wamid.1", phoneNumberId: "phone-1", customerWaId: "97336000000", kind: "text" as const, text: "مرحبا" };

describe("WhatsApp repository contract", () => {
  it("claims each Meta message once", async () => {
    const repository = createMemoryWhatsAppRepository();
    await expect(repository.claimMessage("wamid.1")).resolves.toBe(true);
    await expect(repository.claimMessage("wamid.1")).resolves.toBe(false);
  });

  it("persists conversation state and human handoff", async () => {
    const repository = createMemoryWhatsAppRepository();
    const conversation = await repository.getOrCreateConversation(message);
    conversation.selections.case = "labor";
    await repository.saveConversation(conversation);
    await repository.requestHumanHandoff(conversation.id, "customer_request");
    const reloaded = await repository.getOrCreateConversation(message);
    expect(reloaded.selections.case).toBe("labor");
    expect(reloaded.humanHandoff).toBe(true);
  });
});
