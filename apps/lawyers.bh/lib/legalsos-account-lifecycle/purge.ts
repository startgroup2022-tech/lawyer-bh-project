import type postgres from 'postgres';
import type { Subject } from './types';

/** Internal execution primitive, not a deployable purger on its own.
 * The cleanup must implement the reviewed ownership inventory, using this transaction.
 * External file work must be durably completed before cleanup resolves; a failure
 * must throw. Never wire a partial/no-op cleanup to a production route.
 */
export function createPurgeWorker(
  sql: postgres.Sql,
  cleanup: (tx: postgres.TransactionSql, subject: Subject) => Promise<void>,
) {
  return async (limit: number): Promise<{ processed: number; failed: number }> => {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('invalid_purge_limit');
    }
    const attempted: string[] = [];
    let processed = 0, failed = 0;
    for (let i = 0; i < limit; i++) {
      let claimed: string | undefined;
      try {
        const handled = await sql.begin(async tx => {
          const [row] = await tx`SELECT id,subject_role,subject_id FROM legalsos_account_lifecycle
            WHERE state IN ('pending_deletion','purging') AND purge_after<=now()
              AND NOT(id=ANY(${attempted}::uuid[]))
            ORDER BY purge_after,id LIMIT 1 FOR UPDATE SKIP LOCKED`;
          if (!row) return false;
          claimed = String(row.id);
          attempted.push(claimed);
          await tx`UPDATE legalsos_account_lifecycle SET state='purging' WHERE id=${row.id}`;
          await cleanup(tx, { role: row.subject_role, id: row.subject_id });
          await tx`UPDATE legalsos_account_lifecycle SET state='purged' WHERE id=${row.id}`;
          return true;
        });
        if (!handled) break;
        processed++;
      } catch (error) {
        // Do not hide connection/schema failures or return a successful empty run.
        if (!claimed) throw error;
        // No raw exception logging: SQL errors can include private payloads.
        failed++;
      }
    }
    return { processed, failed };
  };
}
