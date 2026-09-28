import { normalizeAdminPermissions, type AdminPermissions } from "./admin-permissions";

function parsePermissions(value: unknown): AdminPermissions {
  const permissions = normalizeAdminPermissions(value);
  delete permissions.manage_admins;
  return permissions;
}

function validPassword(password: string) {
  return password.length >= 10 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function parseRole(value: unknown): "admin" | "super_admin" {
  if (value === "admin" || value === "super_admin") return value;
  throw new Error("invalid_role");
}

export function parseAdminUserCreate(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (fullName.length < 2) throw new Error("invalid_name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid_email");
  if (!validPassword(password)) throw new Error("weak_password");
  return { fullName, email, password, role: parseRole(body.role ?? "admin"), permissions: parsePermissions(body.permissions) };
}

export function parseAdminUserUpdate(input: unknown) {
  const body = (input ?? {}) as Record<string, unknown>;
  const values: {
    fullName?: string;
    email?: string;
    password?: string;
    isActive?: boolean;
    permissions?: AdminPermissions;
    role?: "admin" | "super_admin";
  } = {};

  if (body.fullName !== undefined) {
    values.fullName = String(body.fullName).trim();
    if (values.fullName.length < 2) throw new Error("invalid_name");
  }
  if (body.email !== undefined) {
    values.email = String(body.email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) throw new Error("invalid_email");
  }
  if (body.password !== undefined && String(body.password).length > 0) {
    values.password = String(body.password);
    if (!validPassword(values.password)) throw new Error("weak_password");
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") throw new Error("invalid_status");
    values.isActive = body.isActive;
  }
  if (body.permissions !== undefined) values.permissions = parsePermissions(body.permissions);
  if (body.role !== undefined) values.role = parseRole(body.role);
  if (Object.keys(values).length === 0) throw new Error("empty_update");
  return values;
}
