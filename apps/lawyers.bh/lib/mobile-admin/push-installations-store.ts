import type { AdminInstallationStore } from "./push-installations-core";

type Sql = <T = unknown>(parts: TemplateStringsArray, ...values: unknown[]) => Promise<T>;

export function createAdminInstallationStore(sql: Sql): AdminInstallationStore {
  return {
    async upsert(input) {
      await sql`
        INSERT INTO public.mobile_admin_push_installations
          (fcm_token, admin_id, session_digest, platform, locale, last_seen_at)
        VALUES (${input.token}, ${input.adminId}::uuid, ${input.sessionDigest}, ${input.platform}, ${input.locale}, now())
        ON CONFLICT (fcm_token) DO UPDATE SET
          admin_id = EXCLUDED.admin_id,
          session_digest = EXCLUDED.session_digest,
          platform = EXCLUDED.platform,
          locale = EXCLUDED.locale,
          last_seen_at = now()
      `;
    },
    async remove(input) {
      await sql`
        DELETE FROM public.mobile_admin_push_installations
        WHERE fcm_token = ${input.token} AND admin_id = ${input.adminId}::uuid
      `;
    },
  };
}
