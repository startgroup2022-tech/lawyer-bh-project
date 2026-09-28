import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import {
  createMaintenanceService,
  type MaintenanceRepository,
} from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const tenantId = "33333333-3333-4333-8333-333333333333";

function principal(role: "property_manager" | "maintenance" | "tenant") {
  return {
    userId,
    sessionId: "session-1",
    propertyIds: [propertyId],
    memberships: [
      {
        propertyId,
        role,
        ...(role === "tenant" ? { tenantId } : {}),
      },
    ],
  } satisfies SarayaPrincipal;
}

function repository(calls: unknown[]): MaintenanceRepository {
  return {
    list: async (scope) => {
      calls.push(scope);
      return [];
    },
    create: async () => { throw new Error("unused"); },
    update: async () => { throw new Error("unused"); },
  };
}

describe("maintenance ticket list scope", () => {
  it("allows property management and maintenance staff to see property tickets", async () => {
    const calls: unknown[] = [];
    const service = createMaintenanceService(repository(calls));
    await service.list(principal("property_manager"), propertyId);
    await service.list(principal("maintenance"), propertyId);
    expect(calls).toEqual([{ propertyId }, { propertyId }]);
  });

  it("limits tenants to their own organization", async () => {
    const calls: unknown[] = [];
    await createMaintenanceService(repository(calls)).list(
      principal("tenant"),
      propertyId,
    );
    expect(calls).toEqual([{ propertyId, tenantId }]);
  });

  it("creates a ticket with the authenticated reporter", async () => {
    const calls: unknown[] = [];
    const repo = repository(calls);
    repo.create = async (input) => { calls.push(input); return input; };
    await createMaintenanceService(repo).create(
      principal("property_manager"),
      propertyId,
      { title: "AC issue", description: "Not cooling", priority: "high" },
    );
    expect(calls).toContainEqual(expect.objectContaining({
      propertyId,
      reportedByUserId: userId,
      priority: "high",
    }));
  });
});
