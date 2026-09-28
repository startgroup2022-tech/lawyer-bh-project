import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createLifecycleStore } from './store';
import { createClientAuthService } from '../client-auth/store';
import { createMobileRequestAccessToken } from '../tap/mobile-request-access';
vi.mock('server-only', () => ({}));

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (parsed.hostname !== '127.0.0.1' || parsed.port !== '57583' ||
      parsed.pathname !== '/legalsos_lifecycle_test' || parsed.search) {
    throw new Error('Use only the isolated local lifecycle test database');
  }
}

describe.skipIf(!url)('LegalSOS lifecycle storage in isolated PostgreSQL', () => {
  const namespace = `lifecycle_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', {
    connection: { search_path: namespace, timezone: 'UTC' },
  });
  const store = createLifecycleStore(sql);
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${namespace}`);
    await sql.unsafe(await readFile('drizzle/0091_legalsos_account_lifecycle.sql', 'utf8'));
    for (const file of ['0047_mobile_client_accounts', '0048_mobile_client_passwords', '0051_mobile_client_account_changes']) {
      await sql.unsafe(await readFile(`drizzle/${file}.sql`, 'utf8'));
    }
    // Minimal real SQL fixtures for the communication access query; no customer data.
    await sql`CREATE TABLE bahrain_lawyers (id uuid PRIMARY KEY, full_name_ar text, full_name_en text, phone text)`;
    await sql`CREATE TABLE bahrain_emergency_requests (
      id uuid PRIMARY KEY, contact_name text, client_account_id uuid,
      mobile_request_access_digest text, assigned_lawyer_id uuid, service_status text, country_code text)`;
    await sql.unsafe(await readFile('drizzle/0094_legalsos_request_revocation.sql','utf8'));
    vi.doMock('@/lib/db/client', () => ({ sqlClient: sql }));
  });
  afterAll(async () => {
    try { await sql.unsafe(`DROP SCHEMA ${namespace} CASCADE`); }
    finally { await sql.end(); }
  });

  it('closes only the specified role and preserves the original 30-day deadline on retry', async () => {
    const id = randomUUID();
    expect(await store.isAccountClosed({ role: 'client', id })).toBe(false);
    const receipt = await store.scheduleDeletion({ role: 'client', id });
    expect(await store.isAccountClosed({ role: 'client', id })).toBe(true);
    expect(await store.isAccountClosed({ role: 'lawyer', id })).toBe(false);
    expect(Date.parse(receipt.purgeAfter) - Date.parse(receipt.requestedAt)).toBe(2592000000);
    expect(await store.scheduleDeletion({ role: 'client', id })).toEqual(receipt);
    const rows = await sql`SELECT * FROM legalsos_account_lifecycle WHERE subject_id=${id}`;
    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe('pending_deletion');
  });

  it('serializes concurrent requests into one receipt', async () => {
    const subject = { role: 'lawyer' as const, id: randomUUID() };
    const receipts = await Promise.all(Array.from({ length: 8 }, () => store.scheduleDeletion(subject)));
    expect(new Set(receipts.map(row => row.id)).size).toBe(1);
    expect(new Set(receipts.map(row => row.purgeAfter)).size).toBe(1);
    expect(await sql`SELECT id FROM legalsos_account_lifecycle WHERE subject_id=${subject.id}`).toHaveLength(1);
  });

  it('keeps both purging and purged accounts closed', async () => {
    const subject = { role: 'lawyer' as const, id: randomUUID() };
    await store.scheduleDeletion(subject);
    for (const state of ['purging', 'purged']) {
      await sql`UPDATE legalsos_account_lifecycle SET state=${state} WHERE subject_id=${subject.id}`;
      expect(await store.isAccountClosed(subject)).toBe(true);
    }
  });

  it('rejects malformed identities before scheduling', async () => {
    await expect(store.scheduleDeletion({ role: 'client', id: '' })).rejects.toThrow('invalid_subject');
    await expect(store.scheduleDeletion({ role: 'admin', id: randomUUID() } as never)).rejects.toThrow('invalid_subject');
  });

  it('database rejects changing the original deadline and invalid lifecycle states', async () => {
    const receipt = await store.scheduleDeletion({ role: 'client', id: randomUUID() });
    await expect(sql`UPDATE legalsos_account_lifecycle SET purge_after=purge_after+interval '1 day' WHERE id=${receipt.id}`)
      .rejects.toThrow();
    await expect(sql`UPDATE legalsos_account_lifecycle SET state='active' WHERE id=${receipt.id}`).rejects.toThrow();
  });

  it('rolls back scheduling with its enclosing transaction', async () => {
    const subject = { role: 'client' as const, id: randomUUID() };
    await expect(sql.begin(async tx => {
      await createLifecycleStore(tx).scheduleDeletion(subject);
      throw new Error('simulated_revocation_failure');
    })).rejects.toThrow('simulated_revocation_failure');
    expect(await store.isAccountClosed(subject)).toBe(false);
  });

  it('uses 720 elapsed hours even across daylight-saving changes', async () => {
    const subject = { role: 'client' as const, id: randomUUID() };
    const receipt = await sql.begin(async tx => {
      await tx`SET LOCAL TIME ZONE 'America/New_York'`;
      return createLifecycleStore(tx).scheduleDeletion(subject);
    });
    expect(Date.parse(receipt.purgeAfter) - Date.parse(receipt.requestedAt)).toBe(2592000000);
    // A literal DST-spanning instant verifies the database's default interval semantics.
    const [row] = await sql`SELECT extract(epoch FROM
      ((timestamptz '2026-10-25 00:00:00 America/New_York' + interval '720 hours')
      - timestamptz '2026-10-25 00:00:00 America/New_York'))::integer AS elapsed`;
    expect(row.elapsed).toBe(2592000);
  });

  it('rejects a previously valid mobile lawyer token after app closure', async () => {
    const { createMobileLawyerToken, getMobileLawyerSession } = await import('../mobile-lawyer-auth');
    const id = randomUUID();
    const token = createMobileLawyerToken(id, 'BH');
    const request = new Request('http://localhost/test', { headers: { authorization: `Bearer ${token}` } });
    expect(await getMobileLawyerSession(request)).toEqual({ lawyerId: id, countryCode: 'BH' });
    await store.scheduleDeletion({ role: 'lawyer', id });
    expect(await getMobileLawyerSession(request)).toBeNull();
  });

  it('does not issue a new app token for a closed lawyer', async () => {
    const auth = await import('../mobile-lawyer-auth');
    const id = randomUUID();
    const token = await auth.issueMobileLawyerToken(id, 'BH');
    expect(auth.verifyMobileLawyerToken(token)).toEqual({ lawyerId: id, countryCode: 'BH' });
    await store.scheduleDeletion({ role: 'lawyer', id });
    expect(await auth.issueMobileLawyerToken(id, 'BH')).toBeNull();
  });

  it('excludes closed lawyers in a batch without excluding an equal client identity', async () => {
    const active = randomUUID(), closed = randomUUID(), clientOnly = randomUUID();
    await store.scheduleDeletion({ role: 'lawyer', id: closed });
    await store.scheduleDeletion({ role: 'client', id: clientOnly });
    expect(await store.closedLawyerIds([active, closed, clientOnly])).toEqual([closed]);
    expect(await store.closedLawyerIds([])).toEqual([]);
    await expect(store.closedLawyerIds(['not-an-id'])).rejects.toThrow('invalid_subject');
  });

  it('blocks old client sessions, password login and profile writes after app closure', async () => {
    let code = '';
    const auth = createClientAuthService(sql, 'local-test-secret-'.repeat(3), async message => { code = message.code; });
    const email = `lifecycle-${randomUUID()}@example.com`;
    const challenge = await auth.request({ mode: 'register', email, fullName: 'Synthetic Client', phone: '+97336000000', password: 'test passphrase only', locale: 'en' }, 'local-test');
    const session = await auth.verify(challenge.challengeId, code, 'local-test');
    expect(await auth.session(session.token)).not.toBeNull();
    await store.scheduleDeletion({ role: 'client', id: session.client.id });
    expect(await auth.session(session.token)).toBeNull();
    await expect(auth.login(email, 'test passphrase only', 'local-test')).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(auth.updatePersonalInfo(session.token, { fullName: 'Changed', phone: '+97336000001' })).rejects.toMatchObject({ code: 'unauthorized' });
    const [retained] = await sql`SELECT full_name FROM mobile_client_accounts WHERE id=${session.client.id}`;
    expect(retained.full_name).toBe('Synthetic Client');
    await sql`UPDATE mobile_client_auth_limits SET last_at=now()-interval '2 minutes'`;
    const reset = await auth.request({ mode: 'reset', email, fullName: null, phone: null, password: 'new test passphrase', locale: 'en' }, 'local-test');
    await expect(auth.verify(reset.challengeId, code, 'local-test')).rejects.toMatchObject({ code: 'account_unavailable' });
  });

  it('queries lifecycle flags to close chat without deleting the shared lawyer record', async () => {
    const { resolveRequestCommunicationAccess } = await import('../communications/server-access');
    const clientId = randomUUID(), lawyerId = randomUUID(), requestId = randomUUID();
    const { token, digest } = createMobileRequestAccessToken();
    await sql`INSERT INTO mobile_client_accounts (id,email,full_name,phone)
      VALUES (${clientId},${`${clientId}@example.com`},'Test Client','+97336000000')`;
    await sql`INSERT INTO bahrain_lawyers VALUES (${lawyerId},'محامي اختبار','Test Lawyer','+97336000001')`;
    await sql`INSERT INTO bahrain_emergency_requests VALUES
      (${requestId},'Test Client',${clientId},${digest},${lawyerId},'in_progress','BH')`;
    const request = new Request('http://localhost/chat', { headers: { 'x-request-access-token': token } });
    expect((await resolveRequestCommunicationAccess(requestId, request))?.capabilities.send).toBe(true);
    await store.scheduleDeletion({ role: 'lawyer', id: lawyerId });
    expect((await resolveRequestCommunicationAccess(requestId, request))?.capabilities)
      .toEqual({ read: true, send: false, call: false });
    expect(await sql`SELECT full_name_en,phone FROM bahrain_lawyers WHERE id=${lawyerId}`)
      .toEqual([{ full_name_en: 'Test Lawyer', phone: '+97336000001' }]);
    await store.scheduleDeletion({ role: 'client', id: clientId });
    expect(await resolveRequestCommunicationAccess(requestId, request)).toBeNull();
  });

  it('revokes a valid request dispatch token when its client closes the account', async () => {
    const dispatch = await import('../sos/mobile-dispatch-auth');
    vi.stubEnv('MOBILE_DISPATCH_SECRET', 'isolated-dispatch-secret-with-more-than-32-characters');
    try {
      const requestId = randomUUID(), clientId = randomUUID();
      await sql`INSERT INTO bahrain_emergency_requests (id,client_account_id) VALUES (${requestId},${clientId})`;
      const token = dispatch.createMobileDispatchToken(requestId);
      expect(await dispatch.authorizeMobileDispatchToken(requestId, token)).toBe(true);
      expect(await dispatch.authorizeMobileDispatchToken(requestId, 'invalid')).toBe(false);
      await store.scheduleDeletion({ role: 'client', id: clientId });
      expect(await dispatch.authorizeMobileDispatchToken(requestId, token)).toBe(false);
      await sql`UPDATE bahrain_emergency_requests SET client_access_revoked_at=now(),client_account_id=NULL WHERE id=${requestId}`;
      expect(await dispatch.authorizeMobileDispatchToken(requestId, token)).toBe(false);
      await expect(sql`UPDATE bahrain_emergency_requests SET client_access_revoked_at=NULL WHERE id=${requestId}`).rejects.toThrow('immutable_request_revocation');
      await sql`UPDATE bahrain_emergency_requests SET mobile_request_access_digest='new-digest' WHERE id=${requestId}`;
      expect((await sql`SELECT mobile_request_access_digest FROM bahrain_emergency_requests WHERE id=${requestId}`)[0].mobile_request_access_digest).toBeNull();
      const delayedId=randomUUID();
      await sql`INSERT INTO bahrain_emergency_requests(id,client_account_id,mobile_request_access_digest) VALUES (${delayedId},${clientId},'late-digest')`;
      expect(await dispatch.authorizeMobileDispatchToken(delayedId,dispatch.createMobileDispatchToken(delayedId))).toBe(false);
      expect((await sql`SELECT mobile_request_access_digest FROM bahrain_emergency_requests WHERE id=${delayedId}`)[0].mobile_request_access_digest).toBeNull();
      const missingId = randomUUID();
      expect(await dispatch.authorizeMobileDispatchToken(missingId, dispatch.createMobileDispatchToken(missingId))).toBe(false);
    } finally { vi.unstubAllEnvs(); }
  });

  it('denies push resubscription through the actual route after client closure', async () => {
    let registrations = 0;
    vi.doMock('@/lib/sos/mobile-push-store', () => ({ mobilePushStore: {
      subscribeClientRequest: async () => { registrations++; },
    } }));
    const { PUT } = await import('../../app/api/mobile/sos/requests/[requestId]/push/route');
    const { createMobileDispatchToken } = await import('../sos/mobile-dispatch-auth');
    vi.stubEnv('MOBILE_DISPATCH_SECRET', 'isolated-dispatch-secret-with-more-than-32-characters');
    try {
      const requestId = randomUUID(), clientId = randomUUID();
      await sql`INSERT INTO bahrain_emergency_requests (id,client_account_id) VALUES (${requestId},${clientId})`;
      const token = createMobileDispatchToken(requestId);
      const call = () => PUT(new Request('https://lawyers.bh/api/push', { method: 'PUT',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ platform: 'ios', locale: 'ar', token: 'synthetic-installation' }),
      }), { params: Promise.resolve({ requestId }) });
      expect((await call()).status).toBe(204);
      await store.scheduleDeletion({ role: 'client', id: clientId });
      expect((await call()).status).toBe(401);
      expect(registrations).toBe(1);
    } finally { vi.unstubAllEnvs(); }
  });
});
