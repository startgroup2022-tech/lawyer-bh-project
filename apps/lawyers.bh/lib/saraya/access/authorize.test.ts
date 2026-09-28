import { describe, expect, it } from "vitest";
import { authorize, authorizeRoleGrant, permissionsForRole } from "./authorize";

const principal = { userId: "u1", sessionId: "s1", propertyIds: ["p1"], memberships: [{ propertyId: "p1", role: "tenant" as const, tenantId: "t1" }] };

describe("Saraya property authorization", () => {
  it("defines role permissions", () => {
    expect(permissionsForRole("property_manager")).toContain("units:write");
    expect(permissionsForRole("tenant")).not.toContain("units:write");
  });
  it("lets owners manage owned units and tenants without managing memberships", () => {
    expect(permissionsForRole("owner")).toEqual(
      expect.arrayContaining(["units:write", "tenants:write"]),
    );
    expect(permissionsForRole("owner")).not.toContain("memberships:write");
  });
  it("denies access across properties", () => {
    expect(() => authorize(principal, { propertyId: "p2", permission: "units:read" })).toThrowError(/PROPERTY_ACCESS_DENIED/);
  });
  it("denies a tenant guessing another tenant UUID", () => {
    expect(() => authorize(principal, { propertyId: "p1", permission: "tenant:self:read", tenantId: "t2" })).toThrowError(/TENANT_ACCESS_DENIED/);
  });
  it("allows a tenant to read its own record", () => {
    expect(authorize(principal, { propertyId: "p1", permission: "tenant:self:read", tenantId: "t1" })).toBeUndefined();
  });
  it("prevents a property manager from granting super admin", () => {
    expect(() => authorizeRoleGrant("property_manager", "super_admin")).toThrowError(/ROLE_GRANT_DENIED/);
    expect(authorizeRoleGrant("super_admin", "super_admin")).toBeUndefined();
  });
  it("denies an owner guessing another owner UUID", () => {
    const owner = { ...principal, memberships: [{ propertyId: "p1", role: "owner" as const, ownerId: "o1" }] };
    expect(() => authorize(owner, { propertyId: "p1", permission: "owner:self:read", ownerId: "o2" })).toThrowError(/OWNER_ACCESS_DENIED/);
  });
  it("fails closed when a self-scope identifier is omitted", () => {
    expect(() => authorize(principal, { propertyId: "p1", permission: "tenant:self:read" })).toThrowError(/TENANT_ACCESS_DENIED/);
    const owner = { ...principal, memberships: [{ propertyId: "p1", role: "owner" as const, ownerId: "o1" }] };
    expect(() => authorize(owner, { propertyId: "p1", permission: "owner:self:read" })).toThrowError(/OWNER_ACCESS_DENIED/);
  });
});
