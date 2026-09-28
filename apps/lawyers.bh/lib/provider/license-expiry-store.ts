import "server-only";

import { sqlClient } from "@/lib/db/client";

import type {
  LicenseExpiryCandidate,
  LicenseExpiryStore,
} from "./license-expiry-job";
import type { LicenseReminderKind } from "./license-expiry-maintenance";

type CountRow = { id: string };
type CandidateRow = {
  lawyer_id: string;
  email: string;
  full_name_ar: string;
  full_name_en: string;
  locale: string;
  license_expiry_date: string;
};
type ClaimRow = { id: string };

export const postgresLicenseExpiryStore: LicenseExpiryStore = {
  async deactivateExpired(runDate) {
    const rows = await sqlClient<CountRow[]>`
      UPDATE bahrain_lawyers
      SET
        status = 'suspended',
        is_active = false,
        suspension_type = CASE
          WHEN suspension_type IS NULL THEN 'license_expired'
          ELSE suspension_type
        END,
        suspension_reason = CASE
          WHEN suspension_type IS NULL THEN 'Automatically deactivated: license expired'
          ELSE suspension_reason
        END,
        suspended_at = CASE
          WHEN suspension_type IS NULL THEN now()
          ELSE suspended_at
        END,
        suspended_by = CASE
          WHEN suspension_type IS NULL THEN 'system:license-expiry'
          ELSE suspended_by
        END,
        updated_at = now()
      WHERE status = 'approved'
        AND is_active = true
        AND license_expiry_date IS NOT NULL
        AND license_expiry_date <= ${runDate}::date
      RETURNING id
    `;
    return rows.length;
  },

  async listReminderCandidates(runDate) {
    const rows = await sqlClient<CandidateRow[]>`
      SELECT
        id AS lawyer_id,
        email,
        full_name_ar,
        full_name_en,
        locale,
        license_expiry_date::text
      FROM bahrain_lawyers
      WHERE status = 'approved'
        AND is_active = true
        AND suspension_type IS NULL
        AND email IS NOT NULL
        AND btrim(email) <> ''
        AND license_expiry_date IN (
          ${runDate}::date + 30,
          ${runDate}::date + 7
        )
      ORDER BY id
    `;

    return rows.map<LicenseExpiryCandidate>((row) => ({
      lawyerId: row.lawyer_id,
      email: row.email,
      fullNameAr: row.full_name_ar,
      fullNameEn: row.full_name_en,
      locale: row.locale.toLowerCase().startsWith("en") ? "en" : "ar",
      expiryDate: row.license_expiry_date,
    }));
  },

  async claimReminder(candidate, kind: LicenseReminderKind) {
    const rows = await sqlClient<ClaimRow[]>`
      INSERT INTO lawyer_license_notifications (
        lawyer_id,
        license_expiry_date,
        reminder_kind,
        attempt_count,
        claimed_at,
        last_error,
        updated_at
      ) VALUES (
        ${candidate.lawyerId}::uuid,
        ${candidate.expiryDate}::date,
        ${kind},
        1,
        now(),
        NULL,
        now()
      )
      ON CONFLICT (lawyer_id, license_expiry_date, reminder_kind)
      DO UPDATE SET
        attempt_count = lawyer_license_notifications.attempt_count + 1,
        claimed_at = now(),
        last_error = NULL,
        updated_at = now()
      WHERE lawyer_license_notifications.sent_at IS NULL
        AND (
          lawyer_license_notifications.claimed_at IS NULL
          OR lawyer_license_notifications.claimed_at < now() - interval '1 hour'
        )
      RETURNING id
    `;
    return rows[0]?.id ?? null;
  },

  async markReminderSent(claimId) {
    await sqlClient`
      UPDATE lawyer_license_notifications
      SET sent_at = now(), claimed_at = NULL, last_error = NULL, updated_at = now()
      WHERE id = ${claimId}::uuid
    `;
  },

  async markReminderFailed(claimId, message) {
    await sqlClient`
      UPDATE lawyer_license_notifications
      SET claimed_at = NULL, last_error = ${message}, updated_at = now()
      WHERE id = ${claimId}::uuid
        AND sent_at IS NULL
    `;
  },
};
