export type LoginRole = "provider" | "admin";

export function buildLoginRequest(role: LoginRole, identifier: string, password: string, locale: string) {
  const isAdmin = role === "admin";
  return {
    endpoint: isAdmin ? "/api/admin-login" : "/api/provider/login",
    body: isAdmin ? { email: identifier.trim(), password } : { licenseNumber: identifier.trim(), password },
    destination: `/${locale === "ar" ? "ar" : "en"}/${isAdmin ? "admin" : "provider-dashboard"}`,
  };
}
