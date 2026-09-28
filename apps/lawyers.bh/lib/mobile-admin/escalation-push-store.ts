import type postgres from "postgres";
import { hasAdminPermission, type AdminRole } from "@/lib/auth/admin-permissions";
import type { AdminPushEvent, AdminPushRecipient } from "./escalation-push";

export function createEscalationPushStore(sql: postgres.Sql) {
  return {
    async claim(limit: number, now: Date): Promise<AdminPushEvent[]> {
      const rows = await sql<Array<{ id: string; request_id: string; report_id: string | null; event_type: "admin_request_escalated" | "moderation_report"; attempt_count: number; created_at: Date }>>`
        WITH due AS (
          SELECT id FROM public.mobile_admin_escalation_outbox
          WHERE (status = 'pending' AND next_attempt_at <= ${now.toISOString()}::timestamptz)
             OR (status = 'leased' AND lease_expires_at <= ${now.toISOString()}::timestamptz)
          ORDER BY next_attempt_at, id
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        )
        UPDATE public.mobile_admin_escalation_outbox outbox
        SET status = 'leased', attempt_count = attempt_count + 1,
            lease_expires_at = ${new Date(now.getTime() + 2 * 60_000).toISOString()}::timestamptz
        FROM due WHERE outbox.id = due.id
        RETURNING outbox.id, outbox.request_id, outbox.report_id, outbox.event_type, outbox.attempt_count, outbox.created_at
      `;
      return rows.map((row) => ({ id: row.id, requestId: row.request_id, reportId: row.report_id, eventType: row.event_type, attemptCount: row.attempt_count, createdAt: row.created_at }));
    },
    async recipients(event: AdminPushEvent): Promise<AdminPushRecipient[]> {
      const rows = await sql<Array<{ fcm_token: string; locale: string; role: string; is_active: boolean; permissions: unknown }>>`
        SELECT installation.fcm_token, installation.locale, admin.role,
          admin.is_active, admin.permissions
        FROM public.mobile_admin_push_installations installation
        JOIN public.mobile_admin_sessions session ON session.token_digest = installation.session_digest
        JOIN public.admin_users admin ON admin.id = installation.admin_id
        WHERE admin.is_active = true AND session.expires_at > now()
      `;
      return rows.filter((row) => hasAdminPermission({
        role: row.role as AdminRole, isActive: row.is_active, permissions: row.permissions,
      }, event.eventType === "moderation_report" ? "manage_moderation" : "manage_requests")).map((row) => ({
        token: row.fcm_token,
        locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
      }));
    },
    async markDelivered(id: string): Promise<void> {
      await sql`UPDATE public.mobile_admin_escalation_outbox
        SET status = 'delivered', delivered_at = now(), lease_expires_at = NULL, last_error_code = NULL
        WHERE id = ${id}::uuid AND status = 'leased'`;
    },
    async markRetry(input: { id: string; terminal: boolean; nextAttemptAt: Date; errorCode: string }): Promise<void> {
      await sql`UPDATE public.mobile_admin_escalation_outbox
        SET status = ${input.terminal ? "failed" : "pending"},
          next_attempt_at = ${input.nextAttemptAt.toISOString()}::timestamptz,
          lease_expires_at = NULL, last_error_code = ${input.errorCode}
        WHERE id = ${input.id}::uuid AND status = 'leased'`;
    },
    async prune(tokens: string[]): Promise<void> {
      for (const token of new Set(tokens)) {
        await sql`DELETE FROM public.mobile_admin_push_installations WHERE fcm_token = ${token}`;
      }
    },
  };
}
