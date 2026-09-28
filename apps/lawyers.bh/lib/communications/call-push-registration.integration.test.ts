import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import postgres from 'postgres';
const url = process.env.CALL_REGISTRATION_TEST_DATABASE_URL;
import { communicationCallPushStore, findCallPushTokens } from './call-push-store';

describe.skipIf(!url)('call push registration in isolated PostgreSQL', () => {
  const db = url ? postgres(url, { max: 1 }) : null!;
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const register = (requestId: string, token: string) => communicationCallPushStore.register({ requestId, actorRole: 'lawyer', actorId: 'lawyer-1', platform: 'ios', tokenType: 'voip', token, locale: 'ar' });
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== url) throw new Error('DATABASE_URL must match isolated test URL');
    const [row] = await db`SELECT current_database() AS name`;
    if (row.name !== 'legalsos_calls_test') throw new Error('requires isolated legalsos_calls_test database');
    await db`CREATE TABLE IF NOT EXISTS bahrain_emergency_requests(id uuid PRIMARY KEY, client_account_id uuid)`;
    await db`INSERT INTO bahrain_emergency_requests VALUES(${first},NULL),(${second},NULL) ON CONFLICT DO NOTHING`;
    await db`CREATE TABLE IF NOT EXISTS bahrain_communication_call_push_registrations(request_id uuid,actor_role text,actor_id text,platform text,token_type text,token text UNIQUE,locale text,last_seen_at timestamptz, UNIQUE(request_id,actor_role,actor_id,platform,token_type))`;
    await db`TRUNCATE bahrain_communication_call_push_registrations`;
  });
  afterAll(async () => {
    const { sqlClient } = await import('@/lib/db/client');
    await sqlClient.end();
    await db.end();
  });
  it('moves a device across requests and rotates its token without unique conflicts', async () => {
    await register(first, 'a'.repeat(64));
    await register(second, 'a'.repeat(64));
    await register(second, 'b'.repeat(64));
    expect(await findCallPushTokens(db, { requestId: first, actorRole: 'lawyer', actorId: 'lawyer-1', tokenType: 'voip' })).toEqual(['b'.repeat(64)]);
  });
  it('serializes concurrent registration of the same device', async () => {
    await Promise.all(Array.from({ length: 8 }, (_, index) => register(index % 2 ? first : second, 'b'.repeat(64))));
    const rows = await db`SELECT token FROM bahrain_communication_call_push_registrations`;
    expect(rows).toHaveLength(1);
    expect(rows[0].token).toBe('b'.repeat(64));
  });
});
