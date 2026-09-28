import { describe, expect, it, vi } from "vitest";
import { createActivationService } from "./activation";
const input = { token: "token", password: "long password", displayNameAr: "اسم", displayNameEn: "Name" };
describe("invitation activation ordering", () => {
  it("does not hash an invalid token", async () => { const hash = vi.fn(async () => "hash"); const service = createActivationService({ findValid: async () => null, hash, commit: async () => null }); await expect(service.activate(input)).rejects.toMatchObject({ code: "INVITATION_INVALID_OR_EXPIRED" }); expect(hash).not.toHaveBeenCalled(); });
  it("allows only one concurrent atomic winner", async () => { let available = true; const service = createActivationService({ findValid: async () => ({ id: "i1" }), hash: async () => "hash", commit: async () => { if (!available) return null; available = false; return "u1"; } }); const results = await Promise.allSettled([service.activate(input), service.activate(input)]); expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); expect(results.filter((r) => r.status === "rejected")).toHaveLength(1); });
});
