import type postgres from 'postgres';
import { createHash } from 'node:crypto';
import { ClientAuthError } from '../client-auth/validation';
import { createDeletionProofStore } from './proofs';
import { createLifecycleStore } from './store';
import type { Subject, DeletionReceipt } from './types';
import {revokeOwnedDevices} from './revoke-devices';

/** Internal only until the complete purge/access/receipt/UI workflow is verified. */
export function createAccountDeletionService(sql: postgres.Sql) {
  return async (subject: Subject, proof: string): Promise<DeletionReceipt> => sql.begin(async tx => {
    if (!await createDeletionProofStore(tx).consume(subject, proof)) {
      throw new ClientAuthError('invalid_deletion_proof', 401);
    }
    const accounts = subject.role === 'client'
      ? await tx`SELECT id,email FROM mobile_client_accounts WHERE id=${subject.id} FOR UPDATE`
      : await tx`SELECT id,email FROM bahrain_lawyers WHERE id=${subject.id} FOR UPDATE`;
    if (!accounts[0]) throw new ClientAuthError('account_unavailable', 403);
    const receipt = await createLifecycleStore(tx).scheduleDeletion(subject);
    const requests = await tx`SELECT id,service_status,payment_status,refund_status,assigned_lawyer_id
      FROM bahrain_emergency_requests
      WHERE (${subject.role}='client' AND client_account_id=${subject.id}::uuid)
        OR (${subject.role}='lawyer' AND (assigned_lawyer_id=${subject.id}::uuid OR candidate_lawyer_id=${subject.id}::uuid))
      ORDER BY id FOR UPDATE`;
    for (const request of requests) {
      const needsSettlement = !['completed','cancelled'].includes(request.service_status) ||
        request.payment_status === 'pending' || !['none','completed'].includes(request.refund_status);
      if (!needsSettlement) continue;
      await tx`INSERT INTO legalsos_deletion_settlements (lifecycle_id,request_id)
        VALUES (${receipt.id},${request.id}) ON CONFLICT DO NOTHING`;
      // Sending is an outbox worker responsibility, after commit. No PII is copied here.
      if (subject.role === 'lawyer' || request.assigned_lawyer_id) {
        await tx`INSERT INTO legalsos_deletion_notifications (lifecycle_id,request_id,recipient_role)
          VALUES (${receipt.id},${request.id},${subject.role === 'client' ? 'lawyer' : 'client'}) ON CONFLICT DO NOTHING`;
      }
    }
    if (subject.role === 'client') {
      await tx`DELETE FROM mobile_client_sessions WHERE client_id=${subject.id}`;
      await tx`DELETE FROM mobile_client_challenges WHERE client_id=${subject.id} OR email=${accounts[0].email}`;
      await tx`UPDATE bahrain_emergency_requests SET mobile_request_access_digest=NULL,
        client_access_revoked_at=COALESCE(client_access_revoked_at,${receipt.requestedAt}::timestamptz)
        WHERE client_account_id=${subject.id}`;
    } else {
      // Live emergency GPS is not the independent professional office address.
      await tx`UPDATE bahrain_lawyers SET live_location=NULL,live_location_updated_at=NULL,
        is_emergency_ready=false,location_sharing_enabled=false WHERE id=${subject.id}`;
    }
    await revokeOwnedDevices(tx,subject);
    return { ...receipt, cleanupRequestIds: subject.role === 'client' ? requests.map(request => String(request.id)) : [] };
  });
}

/** Confirmation authority expires in five minutes. After consumption, the token
 * only recovers a receipt during the 30-day retention window; it grants no access. */
export async function recoverDeletionReceipt(sql: postgres.Sql, proof: string): Promise<DeletionReceipt | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(proof)) return null;
  const digest = createHash('sha256').update(proof, 'utf8').digest('hex');
  const [row] = await sql`SELECT lifecycle.id,lifecycle.requested_at,lifecycle.purge_after,lifecycle.subject_role,lifecycle.subject_id
    FROM legalsos_deletion_proofs proof
    JOIN legalsos_account_lifecycle lifecycle
      ON lifecycle.subject_role=proof.subject_role AND lifecycle.subject_id=proof.subject_id
    WHERE proof.token_digest=${digest} AND proof.consumed_at IS NOT NULL
      AND lifecycle.purge_after>clock_timestamp() AND lifecycle.state<>'purged'
    LIMIT 1`;
  if (!row) return null;
  const requests = row.subject_role === 'client'
    ? await sql`SELECT id FROM bahrain_emergency_requests WHERE client_account_id=${row.subject_id} ORDER BY id`
    : [];
  return { id: row.id, requestedAt: new Date(row.requested_at).toISOString(), purgeAfter: new Date(row.purge_after).toISOString(), cleanupRequestIds: requests.map(request=>String(request.id)) };
}
