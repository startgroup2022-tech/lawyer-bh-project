// Small re-exports of Drizzle-inferred string-literal types used by
// other modules so we can reference them by name without re-typing the
// enum values everywhere.

export type SessionSubject = "mobile_user" | "admin_user";
export type UserRole = "client" | "lawyer";
export type OtpPurpose = "signin" | "rekyc";
export type OtpStatus =
  | "pending"
  | "verified"
  | "expired"
  | "consumed"
  | "abandoned";
