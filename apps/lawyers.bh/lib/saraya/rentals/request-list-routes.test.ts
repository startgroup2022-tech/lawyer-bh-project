import { beforeEach, describe, expect, it, vi } from "vitest";

const propertyId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const state = vi.hoisted(() => ({
  list: vi.fn(),
  findDocument: vi.fn(),
  read: vi.fn(),
}));

vi.mock("../auth/request", () => ({ requireSarayaPrincipal: async () => ({ userId: "user", sessionId: "s", propertyIds: [propertyId], memberships: [{ propertyId, role: "owner", ownerId }] }) }));
vi.mock("../auth/runtime", () => ({ sessions: () => ({}) }));
vi.mock("./request-list-repository", () => ({ rentalRequestListRepository: { list: state.list, findDocument: state.findDocument } }));
vi.mock("../documents/storage", () => ({ readDocumentBytes: state.read }));
vi.mock("./repository", () => ({ rentalRepository: {} }));
vi.mock("./invoice-repository", () => ({ invoiceRepository: {} }));

describe("Task 9 route wiring", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wires the scoped queue GET route", async () => {
    state.list.mockResolvedValue([]);
    const route = await import("@/app/api/saraya/v1/rental-requests/route");
    const cursor = Buffer.from(JSON.stringify({ priority: 0, sortAt: "2029-01-01T00:00:00.000Z", id: "33333333-3333-4333-8333-333333333333" })).toString("base64url");
    const response = await route.GET(new Request(`https://sq.test/api/saraya/v1/rental-requests?propertyId=${propertyId}&limit=10&cursor=${cursor}`));
    expect(response.status).toBe(200);
    expect(state.list).toHaveBeenCalledWith({ propertyId, ownerId, limit: 11, cursor: { priority: 0, sortAt: "2029-01-01T00:00:00.000Z", id: "33333333-3333-4333-8333-333333333333" } });
    await expect(response.json()).resolves.toEqual({ items: [], nextCursor: null });
  });

  it("wires the dedicated authenticated document route", async () => {
    state.findDocument.mockResolvedValue({ propertyId, ownerId, storageKey: "private/key", originalName: "identity.pdf", contentType: "application/pdf" });
    state.read.mockResolvedValue(Uint8Array.from([37, 80, 68, 70]));
    const route = await import("@/app/api/saraya/v1/rental-requests/[requestId]/documents/[kind]/route");
    expect(route.runtime).toBe("nodejs");
    expect(route.dynamic).toBe("force-dynamic");
    const response = await route.GET(new Request(`https://sq.test/api?propertyId=${propertyId}`), { params: Promise.resolve({ requestId: "request-1", kind: "identity" }) });
    expect(response.status).toBe(200);
    expect(state.read).toHaveBeenCalledWith("private/key");
    expect(state.findDocument).toHaveBeenCalledWith({ propertyId, requestId: "request-1", ownerId, kind: "identity" });
  });
});
