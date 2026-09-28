import type postgres from 'postgres';
import type { DeletionReceipt, Subject } from './types';

function validateSubject(subject: Subject) {
  if (!['client', 'lawyer'].includes(subject.role) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subject.id)) {
    throw new Error('invalid_subject');
  }
}

/** Internal persistence only. Callers must authenticate and revoke access atomically. */
export function createLifecycleStore(sql: postgres.Sql | postgres.TransactionSql) {
  return {
    async closedLawyerIds(ids: string[]): Promise<string[]> {
      for (const id of ids) validateSubject({ role: 'lawyer', id });
      if (!ids.length) return [];
      const rows = await sql`SELECT subject_id FROM legalsos_account_lifecycle
        WHERE subject_role='lawyer' AND subject_id=ANY(${ids}::uuid[])`;
      return rows.map(row => String(row.subject_id));
    },
    async scheduleDeletion(subject: Subject): Promise<DeletionReceipt> {
      validateSubject(subject);
      const [row] = await sql`
        INSERT INTO legalsos_account_lifecycle (subject_role, subject_id)
        VALUES (${subject.role}, ${subject.id})
        ON CONFLICT (subject_role, subject_id) DO UPDATE
          SET subject_id=EXCLUDED.subject_id
        RETURNING id, requested_at, purge_after`;
      return {
        id: row.id,
        requestedAt: new Date(row.requested_at).toISOString(),
        purgeAfter: new Date(row.purge_after).toISOString(),
      };
    },
    async isAccountClosed(subject: Subject): Promise<boolean> {
      validateSubject(subject);
      const [row] = await sql`SELECT id FROM legalsos_account_lifecycle
        WHERE subject_role=${subject.role} AND subject_id=${subject.id}`;
      return Boolean(row);
    },
  };
}
