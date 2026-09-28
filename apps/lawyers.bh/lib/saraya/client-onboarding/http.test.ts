import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createClientOnboardingHandlers } from "./http";

const propertyId = "11111111-1111-4111-8111-111111111111";
const principal: SarayaPrincipal = {
  userId: "22222222-2222-4222-8222-222222222222",
  sessionId: "session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "property_manager" }],
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    authenticate: async () => principal,
    options: async () => ({ properties: [] }),
    createTenant: async () => ({ tenantId: "tenant-1", leaseIds: [], virtualAddressIds: [] }),
    createOwner: async () => ({ ownerIds: [] }),
    ...overrides,
  };
}

describe("client onboarding HTTP handlers", () => {
  it("forwards the optional property when loading options", async () => {
    let captured: unknown;
    const handlers = createClientOnboardingHandlers(
      dependencies({
        options: async (receivedPrincipal: SarayaPrincipal, receivedPropertyId?: string) => {
          captured = { receivedPrincipal, receivedPropertyId };
          return { properties: [] };
        },
      }),
    );

    const response = await handlers.options(
      new Request(`https://sq.example/api?propertyId=${propertyId}`),
    );

    expect(response.status).toBe(200);
    expect(captured).toEqual({ receivedPrincipal: principal, receivedPropertyId: propertyId });
  });

  it("parses tenant onboarding arrays and optional profile fields", async () => {
    let captured: unknown;
    const handlers = createClientOnboardingHandlers(
      dependencies({
        createTenant: async (receivedPrincipal: SarayaPrincipal, input: unknown) => {
          captured = { receivedPrincipal, input };
          return { tenantId: "tenant-1", leaseIds: ["lease-1"], virtualAddressIds: [] };
        },
      }),
    );
    const body = {
      propertyId,
      nameAr: "شركة ألف",
      nameEn: "Alpha",
      registrationNumber: "CR-1",
      units: [{ unitId: "33333333-3333-4333-8333-333333333333", startDate: "2026-10-01", endDate: "2027-09-30", rentAmount: "500.000", depositAmount: "0.000", frequency: "monthly", dueDay: 1, graceDays: 5 }],
      virtualAddresses: [],
    };

    const response = await handlers.createTenant(
      new Request("https://sq.example/api", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(201);
    expect(captured).toEqual({ receivedPrincipal: principal, input: body });
  });

  it("parses a multi-property owner request", async () => {
    let captured: unknown;
    const handlers = createClientOnboardingHandlers(
      dependencies({
        createOwner: async (receivedPrincipal: SarayaPrincipal, input: unknown) => {
          captured = { receivedPrincipal, input };
          return { ownerIds: ["owner-1"] };
        },
      }),
    );
    const body = { propertyIds: [propertyId], nameAr: "المالك", nameEn: "Owner" };

    const response = await handlers.createOwner(
      new Request("https://sq.example/api", { method: "POST", body: JSON.stringify(body) }),
    );

    expect(response.status).toBe(201);
    expect(captured).toEqual({ receivedPrincipal: principal, input: body });
  });

  it("returns a field error when arrays are malformed", async () => {
    const handlers = createClientOnboardingHandlers(dependencies());
    const response = await handlers.createTenant(
      new Request("https://sq.example/api", {
        method: "POST",
        body: JSON.stringify({ propertyId, nameAr: "أ", nameEn: "A", units: "bad", virtualAddresses: [] }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { fieldErrors: { units: ["INVALID"] } },
    });
  });
});
