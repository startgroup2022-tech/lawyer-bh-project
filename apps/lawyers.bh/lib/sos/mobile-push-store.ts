import "server-only";

export type MobilePushLocale = "ar" | "en" | "tr";
export type MobilePushPlatform = "ios" | "android";

export interface MobilePushInstallation {
  id: string;
  token: string;
  lawyerId: string | null;
  audienceRole: "client" | "lawyer";
  platform: MobilePushPlatform;
  locale: MobilePushLocale;
}

interface InstallationFields {
  token: string;
  platform: MobilePushPlatform;
  locale: MobilePushLocale;
}

export interface MobilePushPersistence {
  findInstallationByToken(
    token: string,
  ): Promise<MobilePushInstallation | null>;
  createInstallation(
    input: InstallationFields & {
      lawyerId: string | null;
      audienceRole: "client" | "lawyer";
    },
  ): Promise<MobilePushInstallation>;
  updateInstallation(
    id: string,
    input: {
      lawyerId?: string | null;
      audienceRole?: "client" | "lawyer";
      platform: MobilePushPlatform;
      locale: MobilePushLocale;
    },
  ): Promise<MobilePushInstallation>;
  linkRequest(installationId: string, requestId: string): Promise<void>;
  unlinkRequest(installationId: string, requestId: string): Promise<void>;
  deleteInstallationByToken(token: string): Promise<void>;
  clearLawyerBinding(token: string, lawyerId: string): Promise<void>;
  tokensForLawyer(lawyerId: string): Promise<string[]>;
  tokensForRequest(requestId: string): Promise<string[]>;
}

function normalizeToken(value: string): string {
  const token = value.trim();
  if (token.length === 0 || token.length > 4096) {
    throw new Error("invalid_fcm_token");
  }
  return token;
}

export function createMobilePushStore(persistence: MobilePushPersistence) {
  async function installationFor(
    input: InstallationFields,
    lawyerId?: string,
  ): Promise<MobilePushInstallation> {
    const token = normalizeToken(input.token);
    const existing = await persistence.findInstallationByToken(token);
    if (!existing) {
      return persistence.createInstallation({
        ...input,
        token,
        lawyerId: lawyerId ?? null,
        audienceRole: lawyerId === undefined ? "client" : "lawyer",
      });
    }
    return persistence.updateInstallation(existing.id, {
      platform: input.platform,
      locale: input.locale,
      ...(lawyerId === undefined ? {} : { lawyerId }),
      ...(lawyerId === undefined ? {} : { audienceRole: "lawyer" }),
    });
  }

  return {
    async registerClientInstallation(input: InstallationFields) {
      await installationFor(input);
    },
    async registerLawyerInstallation(
      input: InstallationFields & { lawyerId: string },
    ) {
      await installationFor(input, input.lawyerId);
    },
    async subscribeClientRequest(
      input: InstallationFields & { requestId: string },
    ) {
      const installation = await installationFor(input);
      await persistence.linkRequest(installation.id, input.requestId);
    },
    async unsubscribeClientRequest(token: string, requestId: string) {
      const installation = await persistence.findInstallationByToken(
        normalizeToken(token),
      );
      if (installation) {
        await persistence.unlinkRequest(installation.id, requestId);
      }
    },
    async removeInstallationToken(token: string) {
      await persistence.deleteInstallationByToken(normalizeToken(token));
    },
    async unregisterLawyerInstallation(token: string, lawyerId: string) {
      await persistence.clearLawyerBinding(normalizeToken(token), lawyerId);
    },
    tokensForLawyer: (lawyerId: string) =>
      persistence.tokensForLawyer(lawyerId),
    tokensForRequest: (requestId: string) =>
      persistence.tokensForRequest(requestId),
    async pruneInstallationTokens(tokens: string[]) {
      await Promise.all(
        [...new Set(tokens)].map((token) =>
          persistence.deleteInstallationByToken(normalizeToken(token)),
        ),
      );
    },
  };
}

const postgresPersistence: MobilePushPersistence = {
  async findInstallationByToken(token) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<
      Array<{
        id: string;
        fcm_token: string;
        lawyer_id: string | null;
        platform: string;
        locale: string;
        audience_role: string;
      }>
    >`
      SELECT id, fcm_token, lawyer_id, platform, locale, audience_role
      FROM public.bahrain_mobile_push_installations
      WHERE fcm_token = ${token}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      token: row.fcm_token,
      lawyerId: row.lawyer_id,
      audienceRole: row.audience_role === "lawyer" ? "lawyer" : "client",
      platform: row.platform === "android" ? "android" : "ios",
      locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
    };
  },
  async createInstallation(input) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<Array<{ id: string }>>`
      INSERT INTO public.bahrain_mobile_push_installations (
        fcm_token, lawyer_id, audience_role, platform, locale, last_seen_at
      ) VALUES (
        ${input.token}, ${input.lawyerId}, ${input.audienceRole},
        ${input.platform}, ${input.locale}, now()
      )
      ON CONFLICT (fcm_token) DO UPDATE SET
        lawyer_id = COALESCE(EXCLUDED.lawyer_id, bahrain_mobile_push_installations.lawyer_id),
        audience_role = CASE
          WHEN EXCLUDED.audience_role = 'lawyer' THEN 'lawyer'
          ELSE bahrain_mobile_push_installations.audience_role
        END,
        platform = EXCLUDED.platform,
        locale = EXCLUDED.locale,
        last_seen_at = now()
      RETURNING id
    `;
    return { id: rows[0].id, ...input };
  },
  async updateInstallation(id, input) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<
      Array<{
        fcm_token: string;
        lawyer_id: string | null;
        audience_role: string;
      }>
    >`
      UPDATE public.bahrain_mobile_push_installations
      SET lawyer_id = COALESCE(${input.lawyerId ?? null}, lawyer_id),
          audience_role = COALESCE(${input.audienceRole ?? null}, audience_role),
          platform = ${input.platform}, locale = ${input.locale}, last_seen_at = now()
      WHERE id = ${id}::uuid
      RETURNING fcm_token, lawyer_id, audience_role
    `;
    const row = rows[0];
    if (!row) throw new Error("installation_not_found");
    return {
      id,
      token: row.fcm_token,
      lawyerId: row.lawyer_id,
      audienceRole: row.audience_role === "lawyer" ? "lawyer" : "client",
      platform: input.platform,
      locale: input.locale,
    };
  },
  async linkRequest(installationId, requestId) {
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient`
      INSERT INTO public.bahrain_mobile_push_request_subscriptions (
        installation_id, request_id
      ) VALUES (${installationId}::uuid, ${requestId}::uuid)
      ON CONFLICT (installation_id, request_id) DO NOTHING
    `;
  },
  async unlinkRequest(installationId, requestId) {
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient`
      DELETE FROM public.bahrain_mobile_push_request_subscriptions
      WHERE installation_id = ${installationId}::uuid
        AND request_id = ${requestId}::uuid
    `;
  },
  async deleteInstallationByToken(token) {
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient`
      DELETE FROM public.bahrain_mobile_push_installations
      WHERE fcm_token = ${token}
    `;
  },
  async clearLawyerBinding(token, lawyerId) {
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient`
      UPDATE public.bahrain_mobile_push_installations
      SET lawyer_id = NULL, audience_role = 'client', last_seen_at = now()
      WHERE fcm_token = ${token} AND lawyer_id = ${lawyerId}::uuid
    `;
  },
  async tokensForLawyer(lawyerId) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<Array<{ fcm_token: string }>>`
      SELECT fcm_token FROM public.bahrain_mobile_push_installations
      WHERE lawyer_id = ${lawyerId}::uuid
    `;
    return rows.map((row) => row.fcm_token);
  },
  async tokensForRequest(requestId) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<Array<{ fcm_token: string }>>`
      SELECT installation.fcm_token
      FROM public.bahrain_mobile_push_request_subscriptions subscription
      JOIN public.bahrain_mobile_push_installations installation
        ON installation.id = subscription.installation_id
      WHERE subscription.request_id = ${requestId}::uuid
    `;
    return rows.map((row) => row.fcm_token);
  },
};

export const mobilePushStore = createMobilePushStore(postgresPersistence);
