import { ApiError } from "../auth/contracts";

interface PostgresErrorLike {
  code?: unknown;
  constraint?: unknown;
}

export function translateAccountPersistenceError(error: unknown): never {
  const value = error as PostgresErrorLike;
  if (
    value?.code === "23505" &&
    (value.constraint === "saraya_users_normalized_email_uidx" ||
      value.constraint === "saraya_users_normalized_phone_uidx")
  ) {
    throw new ApiError(
      409,
      "IDENTITY_ALREADY_USED",
      "البريد الإلكتروني أو رقم الهاتف مستخدم مسبقًا",
      "Email or phone is already in use",
    );
  }
  throw error;
}
