import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type postgres from 'postgres';
import { verifyPassword } from '../client-auth/password';
import { ClientAuthError } from '../client-auth/validation';
import { createLifecycleStore } from './store';
import { createDeletionProofStore } from './proofs';
import type { Subject } from './types';

/** Subject must come from an authenticated app session, never an HTTP body. */
export function createDeletionReauthentication(sql: postgres.Sql) {
  return async (subject: Subject, password: string) => {
    if (!['client', 'lawyer'].includes(subject.role) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subject.id)) {
      throw new ClientAuthError('unauthorized', 401);
    }
    if (typeof password !== 'string' || !password.length || password.length > 128) {
      throw new ClientAuthError('invalid_credentials', 401);
    }
    const key = createHash('sha256').update(`legalsos-deletion-reauth:${subject.role}:${subject.id}`).digest('hex');
    // Commit the reservation separately: a wrong password must not roll back its attempt.
    const reserved = await sql`INSERT INTO mobile_client_auth_limits (key,count,reset_at,last_at)
      VALUES (${key},1,clock_timestamp()+interval '15 minutes',clock_timestamp())
      ON CONFLICT (key) DO UPDATE SET
        count=CASE WHEN mobile_client_auth_limits.reset_at<=clock_timestamp() THEN 1 ELSE mobile_client_auth_limits.count+1 END,
        reset_at=CASE WHEN mobile_client_auth_limits.reset_at<=clock_timestamp() THEN clock_timestamp()+interval '15 minutes' ELSE mobile_client_auth_limits.reset_at END,
        last_at=clock_timestamp()
      WHERE mobile_client_auth_limits.reset_at<=clock_timestamp() OR mobile_client_auth_limits.count<5
      RETURNING key`;
    if (!reserved.length) throw new ClientAuthError('rate_limited', 429);

    return sql.begin(async tx => {
      const rows = subject.role === 'client'
        ? await tx`SELECT password_hash FROM mobile_client_accounts WHERE id=${subject.id} FOR UPDATE`
        : await tx`SELECT password_hash FROM bahrain_lawyers WHERE id=${subject.id} FOR UPDATE`;
      if (await createLifecycleStore(tx).isAccountClosed(subject)) throw new ClientAuthError('account_unavailable', 403);
      const hash = rows[0]?.password_hash as string | null | undefined;
      const valid = subject.role === 'client'
        ? await verifyPassword(password, hash ?? null)
        : typeof hash === 'string' && await bcrypt.compare(password, hash);
      if (!valid) throw new ClientAuthError('invalid_credentials', 401);
      return createDeletionProofStore(tx).issue(subject);
    });
  };
}
