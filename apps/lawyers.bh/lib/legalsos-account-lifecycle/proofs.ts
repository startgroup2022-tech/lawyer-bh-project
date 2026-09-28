import { createHash, randomBytes } from 'node:crypto';
import type postgres from 'postgres';
import type { Subject } from './types';

function validate(subject: Subject) {
  if (!['client', 'lawyer'].includes(subject.role) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subject.id)) {
    throw new Error('invalid_subject');
  }
}
const digest = (proof: string) => createHash('sha256').update(proof, 'utf8').digest('hex');

/** Internal primitive. Never issue directly from an unverified HTTP role/id body.
 * Consume inside the SAME transaction that closes access and schedules settlement.
 */
export function createDeletionProofStore(sql: postgres.Sql | postgres.TransactionSql) {
  return {
    async issue(subject: Subject): Promise<{ proof: string; expiresAt: string }> {
      validate(subject);
      const proof = randomBytes(32).toString('base64url');
      const [row] = await sql`INSERT INTO legalsos_deletion_proofs (token_digest,subject_role,subject_id)
        VALUES (${digest(proof)},${subject.role},${subject.id}) RETURNING expires_at`;
      return { proof, expiresAt: new Date(row.expires_at).toISOString() };
    },
    async consume(subject: Subject, proof: string): Promise<boolean> {
      validate(subject);
      if (!/^[A-Za-z0-9_-]{43}$/.test(proof)) return false;
      const rows = await sql`UPDATE legalsos_deletion_proofs SET consumed_at=clock_timestamp()
        WHERE token_digest=${digest(proof)} AND subject_role=${subject.role} AND subject_id=${subject.id}
          AND consumed_at IS NULL AND expires_at>clock_timestamp()
        RETURNING token_digest`;
      return rows.length === 1;
    },
  };
}
