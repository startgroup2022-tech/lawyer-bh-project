import type postgres from "postgres";

import { hasAdminPermission, type AdminRole } from "@/lib/auth/admin-permissions";

import type {
  PaidRequestNotificationChannel,
  PaidRequestNotificationEvent,
  PaidRequestRecipient,
} from "./paid-request-notifications";

export function createPaidRequestNotificationStore(sql: postgres.Sql) {
  return {
    async claim(limit: number, now: Date): Promise<PaidRequestNotificationEvent[]> {
      const leaseExpiresAt = new Date(now.getTime() + 2 * 60_000).toISOString();
      const rows = await sql<Array<{
        id: string; request_id: string; case_ref: string; amount_bhd: string; created_at: Date;
        email_pending: boolean; push_pending: boolean; email_attempt_count: number; push_attempt_count: number;
      }>>`
        WITH due AS (
          SELECT id FROM public.mobile_admin_paid_request_outbox
          WHERE (email_status='pending' AND email_next_attempt_at<=${now.toISOString()}::timestamptz)
             OR (email_status='leased' AND email_lease_expires_at<=${now.toISOString()}::timestamptz)
             OR (push_status='pending' AND push_next_attempt_at<=${now.toISOString()}::timestamptz)
             OR (push_status='leased' AND push_lease_expires_at<=${now.toISOString()}::timestamptz)
          ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT ${limit}
        ), claimed AS (
          UPDATE public.mobile_admin_paid_request_outbox outbox
          SET email_attempt_count = email_attempt_count + CASE WHEN email_status IN ('pending','leased') AND email_next_attempt_at<=${now.toISOString()}::timestamptz THEN 1 ELSE 0 END,
              email_status = CASE WHEN email_status IN ('pending','leased') AND email_next_attempt_at<=${now.toISOString()}::timestamptz THEN 'leased' ELSE email_status END,
              email_lease_expires_at = CASE WHEN email_status IN ('pending','leased') AND email_next_attempt_at<=${now.toISOString()}::timestamptz THEN ${leaseExpiresAt}::timestamptz ELSE email_lease_expires_at END,
              push_attempt_count = push_attempt_count + CASE WHEN push_status IN ('pending','leased') AND push_next_attempt_at<=${now.toISOString()}::timestamptz THEN 1 ELSE 0 END,
              push_status = CASE WHEN push_status IN ('pending','leased') AND push_next_attempt_at<=${now.toISOString()}::timestamptz THEN 'leased' ELSE push_status END,
              push_lease_expires_at = CASE WHEN push_status IN ('pending','leased') AND push_next_attempt_at<=${now.toISOString()}::timestamptz THEN ${leaseExpiresAt}::timestamptz ELSE push_lease_expires_at END
          FROM due WHERE outbox.id=due.id
          RETURNING outbox.*
        )
        SELECT claimed.id, claimed.request_id, request.case_ref,
          request.base_fee_bhd AS amount_bhd, claimed.created_at,
          claimed.email_status='leased' AND claimed.email_lease_expires_at=${leaseExpiresAt}::timestamptz AS email_pending,
          claimed.push_status='leased' AND claimed.push_lease_expires_at=${leaseExpiresAt}::timestamptz AS push_pending,
          claimed.email_attempt_count, claimed.push_attempt_count
        FROM claimed JOIN public.bahrain_emergency_requests request ON request.id=claimed.request_id
      `;
      return rows.map((row) => ({
        id: row.id, requestId: row.request_id, caseRef: row.case_ref, amountBhd: row.amount_bhd,
        createdAt: row.created_at, emailPending: row.email_pending, pushPending: row.push_pending,
        emailAttemptCount: row.email_attempt_count, pushAttemptCount: row.push_attempt_count,
      }));
    },

    async recipients(): Promise<PaidRequestRecipient[]> {
      const rows = await sql<Array<{ fcm_token: string; locale: string; role: string; is_active: boolean; permissions: unknown }>>`
        SELECT installation.fcm_token, installation.locale, admin.role, admin.is_active, admin.permissions
        FROM public.mobile_admin_push_installations installation
        JOIN public.mobile_admin_sessions session ON session.token_digest=installation.session_digest
        JOIN public.admin_users admin ON admin.id=installation.admin_id
        WHERE admin.is_active = true AND session.expires_at > now()
      `;
      return rows.filter((row) => hasAdminPermission({
        role: row.role as AdminRole, isActive: row.is_active, permissions: row.permissions,
      }, "manage_requests")).map((row) => ({
        token: row.fcm_token,
        locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
      }));
    },

    async markDelivered(id: string, channel: PaidRequestNotificationChannel): Promise<void> {
      if (channel === "email") {
        await sql`UPDATE public.mobile_admin_paid_request_outbox SET email_status='delivered', email_delivered_at=now(), email_lease_expires_at=NULL, email_last_error_code=NULL WHERE id=${id}::uuid AND email_status='leased'`;
      } else {
        await sql`UPDATE public.mobile_admin_paid_request_outbox SET push_status='delivered', push_delivered_at=now(), push_lease_expires_at=NULL, push_last_error_code=NULL WHERE id=${id}::uuid AND push_status='leased'`;
      }
    },

    async markRetry(input: { id: string; channel: PaidRequestNotificationChannel; terminal: boolean; nextAttemptAt: Date; errorCode: string }): Promise<void> {
      const status = input.terminal ? "failed" : "pending";
      if (input.channel === "email") {
        await sql`UPDATE public.mobile_admin_paid_request_outbox SET email_status=${status}, email_next_attempt_at=${input.nextAttemptAt.toISOString()}::timestamptz, email_lease_expires_at=NULL, email_last_error_code=${input.errorCode} WHERE id=${input.id}::uuid AND email_status='leased'`;
      } else {
        await sql`UPDATE public.mobile_admin_paid_request_outbox SET push_status=${status}, push_next_attempt_at=${input.nextAttemptAt.toISOString()}::timestamptz, push_lease_expires_at=NULL, push_last_error_code=${input.errorCode} WHERE id=${input.id}::uuid AND push_status='leased'`;
      }
    },

    async prune(tokens: string[]): Promise<void> {
      for (const token of new Set(tokens)) {
        await sql`DELETE FROM public.mobile_admin_push_installations WHERE fcm_token=${token}`;
      }
    },
  };
}
