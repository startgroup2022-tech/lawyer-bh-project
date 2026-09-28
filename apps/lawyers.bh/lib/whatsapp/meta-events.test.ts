import { describe, expect, it } from "vitest";
import { parseMetaMessages } from "./meta-events";

const envelope = (message: unknown) => ({
  object: "whatsapp_business_account",
  entry: [{
    id: "waba-1",
    changes: [{
      field: "messages",
      value: {
        metadata: { phone_number_id: "phone-1" },
        messages: [message],
      },
    }],
  }],
});

describe("Meta WhatsApp event parsing", () => {
  it("normalizes a text message", () => {
    expect(parseMetaMessages(envelope({ id: "wamid.1", from: "97336000000", type: "text", text: { body: "أبي استشارة" } }))).toEqual([{
      messageId: "wamid.1",
      phoneNumberId: "phone-1",
      customerWaId: "97336000000",
      kind: "text",
      text: "أبي استشارة",
    }]);
  });

  it.each([
    ["button", { type: "button_reply", button_reply: { id: "service:legal", title: "استشارة" } }],
    ["list", { type: "list_reply", list_reply: { id: "case:labor", title: "عمالي" } }],
  ])("normalizes an interactive %s selection", (_name, interactive) => {
    expect(parseMetaMessages(envelope({ id: "wamid.2", from: "97336000000", type: "interactive", interactive }))).toEqual([expect.objectContaining({
      kind: "selection",
      selectionId: _name === "button" ? "service:legal" : "case:labor",
    })]);
  });

  it("ignores delivery statuses and malformed events", () => {
    expect(parseMetaMessages({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { statuses: [{ id: "wamid.1" }] } }] }] })).toEqual([]);
    expect(parseMetaMessages({ object: "other", entry: [] })).toEqual([]);
  });
});
