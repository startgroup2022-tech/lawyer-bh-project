import "server-only";

import type {
  AudienceInstallation,
  MobileNotificationInput,
  MobileNotificationSend,
  MobileNotificationTotals,
  NotificationAudience,
} from "./types";

export interface MobileNotificationPersistence {
  installationsFor(audience: NotificationAudience): Promise<AudienceInstallation[]>;
  findSendByIdempotencyKey(key: string): Promise<MobileNotificationSend | null>;
  startSend(input: MobileNotificationInput): Promise<{ created: boolean; record: MobileNotificationSend }>;
  finishSend(id: string, totals: MobileNotificationTotals): Promise<MobileNotificationSend>;
  failSend(id: string): Promise<void>;
  recentSends(limit: number): Promise<MobileNotificationSend[]>;
  pruneTokens(tokens: string[]): Promise<void>;
}

export interface MobileNotificationStore {
  tokensForAudience(audience: NotificationAudience): Promise<AudienceInstallation[]>;
  countAudience(audience: NotificationAudience): Promise<number>;
  findSendByIdempotencyKey(key: string): Promise<MobileNotificationSend | null>;
  startSend(input: MobileNotificationInput): Promise<{ created: boolean; record: MobileNotificationSend }>;
  finishSend(id: string, totals: MobileNotificationTotals): Promise<MobileNotificationSend>;
  failSend(id: string): Promise<void>;
  recentSends(limit: number): Promise<MobileNotificationSend[]>;
  pruneTokens(tokens: string[]): Promise<void>;
}

function deduplicate(items: AudienceInstallation[]) {
  return [...new Map(items.map((item) => [item.token, item])).values()];
}

export function createMobileNotificationStore(persistence: MobileNotificationPersistence): MobileNotificationStore {
  return {
    async tokensForAudience(audience) { return deduplicate(await persistence.installationsFor(audience)); },
    async countAudience(audience) { return (await this.tokensForAudience(audience)).length; },
    findSendByIdempotencyKey: (key) => persistence.findSendByIdempotencyKey(key),
    startSend: (input) => persistence.startSend(input),
    finishSend: (id, totals) => persistence.finishSend(id, totals),
    failSend: (id) => persistence.failSend(id),
    recentSends: (limit) => persistence.recentSends(limit),
    async pruneTokens(tokens) { await persistence.pruneTokens([...new Set(tokens)]); },
  };
}

type SendRow = {
  id: string; admin_id: string; audience: NotificationAudience; title_ar: string; body_ar: string;
  title_en: string; body_en: string; idempotency_key: string; state: "sending" | "completed" | "failed";
  targeted_count: number; success_count: number; failure_count: number; pruned_count: number; created_at: Date | string;
};

function mapSend(row: SendRow): MobileNotificationSend {
  return {
    id: row.id, adminId: row.admin_id, audience: row.audience, titleAr: row.title_ar, bodyAr: row.body_ar,
    titleEn: row.title_en, bodyEn: row.body_en, idempotencyKey: row.idempotency_key, state: row.state,
    targeted: row.targeted_count, successful: row.success_count, failed: row.failure_count,
    pruned: row.pruned_count, createdAt: new Date(row.created_at).toISOString(),
  };
}

const postgresPersistence: MobileNotificationPersistence = {
  async installationsFor(audience) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<Array<{ fcm_token: string; locale: string }>>`
      SELECT DISTINCT installation.fcm_token, installation.locale
      FROM public.bahrain_mobile_push_installations installation
      LEFT JOIN public.bahrain_lawyers lawyer ON lawyer.id = installation.lawyer_id
      WHERE installation.platform = 'ios'
        AND (installation.audience_role <> 'lawyer' OR COALESCE(lawyer.is_review_account, false) = false)
        AND CASE
          WHEN ${audience} = 'clients' THEN installation.audience_role = 'client'
          WHEN ${audience} = 'active_lawyers' THEN installation.audience_role = 'lawyer' AND lawyer.status = 'approved' AND lawyer.is_active = true
          WHEN ${audience} = 'pending_lawyers' THEN installation.audience_role = 'lawyer' AND lawyer.status = 'pending'
          WHEN ${audience} = 'all_lawyers' THEN installation.audience_role = 'lawyer'
          ELSE true
        END
      ORDER BY installation.fcm_token
    `;
    return rows.map((row) => ({
      token: row.fcm_token,
      locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
    }));
  },
  async findSendByIdempotencyKey(key) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<SendRow[]>`
      SELECT * FROM public.bahrain_admin_mobile_notification_sends WHERE idempotency_key = ${key}::uuid LIMIT 1
    `;
    return rows[0] ? mapSend(rows[0]) : null;
  },
  async startSend(input) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<SendRow[]>`
      INSERT INTO public.bahrain_admin_mobile_notification_sends
        (admin_id, audience, title_ar, body_ar, title_en, body_en, idempotency_key, state)
      VALUES (${input.adminId}::uuid, ${input.audience}, ${input.titleAr}, ${input.bodyAr}, ${input.titleEn}, ${input.bodyEn}, ${input.idempotencyKey}::uuid, 'sending')
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *
    `;
    if (rows[0]) return { created: true, record: mapSend(rows[0]) };
    const existing = await this.findSendByIdempotencyKey(input.idempotencyKey);
    if (!existing) throw new Error("notification_send_conflict");
    return { created: false, record: existing };
  },
  async finishSend(id, totals) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<SendRow[]>`
      UPDATE public.bahrain_admin_mobile_notification_sends SET
        state = 'completed', targeted_count = ${totals.targeted}, success_count = ${totals.successful},
        failure_count = ${totals.failed}, pruned_count = ${totals.pruned}, completed_at = now()
      WHERE id = ${id}::uuid RETURNING *
    `;
    if (!rows[0]) throw new Error("notification_send_not_found");
    return mapSend(rows[0]);
  },
  async failSend(id) {
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient`UPDATE public.bahrain_admin_mobile_notification_sends SET state = 'failed', completed_at = now() WHERE id = ${id}::uuid`;
  },
  async recentSends(limit) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<SendRow[]>`
      SELECT * FROM public.bahrain_admin_mobile_notification_sends ORDER BY created_at DESC LIMIT ${Math.min(Math.max(limit, 1), 100)}
    `;
    return rows.map(mapSend);
  },
  async pruneTokens(tokens) {
    if (tokens.length === 0) return;
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient`DELETE FROM public.bahrain_mobile_push_installations WHERE fcm_token = ANY(${tokens})`;
  },
};

export const mobileNotificationStore = createMobileNotificationStore(postgresPersistence);
