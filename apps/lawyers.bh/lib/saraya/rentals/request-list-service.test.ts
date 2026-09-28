import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createRentalRequestListService, type RentalRequestListRepository } from "./request-list-service";

const PROPERTY = "11111111-1111-4111-8111-111111111111";
const USER = "33333333-3333-4333-8333-333333333333";
const OWNER = "44444444-4444-4444-8444-444444444444";
const repository = (calls: unknown[]): RentalRequestListRepository => ({ list: async (scope) => { calls.push(scope); return []; }, findDocument: async () => null });

describe("rental request list scope", () => {
  it("limits owners to units assigned to their owner record", async () => {
    const calls: unknown[] = [];
    const principal: SarayaPrincipal = { userId: USER, sessionId: "s", propertyIds: [PROPERTY], memberships: [{ propertyId: PROPERTY, role: "owner", ownerId: OWNER }] };
    await createRentalRequestListService(repository(calls)).list(principal, PROPERTY);
    expect(calls).toEqual([{ propertyId: PROPERTY, ownerId: OWNER, limit: 26 }]);
  });

  it("allows super admin to list every request in the property", async () => {
    const calls: unknown[] = [];
    const principal: SarayaPrincipal = { userId: USER, sessionId: "s", propertyIds: [PROPERTY], memberships: [{ propertyId: PROPERTY, role: "super_admin" }] };
    await createRentalRequestListService(repository(calls)).list(principal, PROPERTY);
    expect(calls).toEqual([{ propertyId: PROPERTY, limit: 26 }]);
  });
});
