export type AdminInstallationInput = {
  adminId: string;
  sessionDigest: string;
  token: string;
  platform: "ios" | "android";
  locale: "ar" | "en" | "tr";
};

export type AdminInstallationStore = {
  upsert(input: AdminInstallationInput): Promise<void>;
  remove(input: Pick<AdminInstallationInput, "adminId" | "token">): Promise<void>;
};

function validToken(token: string): boolean {
  return token.length >= 10 && token.length <= 4096 && token === token.trim();
}

function validInput(input: AdminInstallationInput): boolean {
  return Boolean(input.adminId && input.sessionDigest) && validToken(input.token) &&
    (input.platform === "ios" || input.platform === "android") &&
    (input.locale === "ar" || input.locale === "en" || input.locale === "tr");
}

export async function registerAdminInstallation(
  input: AdminInstallationInput,
  store: AdminInstallationStore,
): Promise<void> {
  if (!validInput(input)) throw new Error("invalid_admin_push_installation");
  await store.upsert(input);
}

export async function removeAdminInstallation(
  input: Pick<AdminInstallationInput, "adminId" | "token">,
  store: AdminInstallationStore,
): Promise<void> {
  if (!input.adminId || !validToken(input.token)) throw new Error("invalid_admin_push_installation");
  await store.remove(input);
}
