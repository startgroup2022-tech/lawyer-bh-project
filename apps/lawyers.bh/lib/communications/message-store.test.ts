import { describe, expect, it, vi } from "vitest";
import { createMessageStore, MessageValidationError } from "./message-store";

const base = {
  requestId: "8d983269-123f-49a8-9b62-ccaa7a4e496e",
  senderRole: "client" as const,
  senderId: "client:request-1",
  clientMessageId: "11111111-1111-4111-8111-111111111111",
};

describe("communication message store", () => {
  it.each(["", "   ", "x".repeat(4001)])("rejects invalid body", async (body) => {
    const insert = vi.fn();
    const store = createMessageStore({ insert, list: vi.fn() });
    await expect(store.insertMessage({ ...base, body })).rejects.toBeInstanceOf(MessageValidationError);
    expect(insert).not.toHaveBeenCalled();
  });

  it("normalizes the body and returns the committed canonical row", async () => {
    const canonical = { id: "message-1", ...base, body: "hello", createdAt: new Date("2026-08-25T10:00:00Z"), readAt: null };
    const insert = vi.fn(async () => canonical);
    const store = createMessageStore({ insert, list: vi.fn() });
    await expect(store.insertMessage({ ...base, body: "  hello  " })).resolves.toBe(canonical);
    expect(insert).toHaveBeenCalledWith({ ...base, body: "hello" });
  });

  it("passes a stable cursor to the repository", async () => {
    const list = vi.fn(async () => []);
    const store = createMessageStore({ insert: vi.fn(), list });
    await store.listMessages({ requestId: base.requestId, limit: 25, cursor: { createdAt: "2026-08-25T10:00:00.000Z", id: "message-1" } });
    expect(list).toHaveBeenCalledWith({ requestId: base.requestId, limit: 25, cursor: { createdAt: new Date("2026-08-25T10:00:00.000Z"), id: "message-1" } });
  });
});
