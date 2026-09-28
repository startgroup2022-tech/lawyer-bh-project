import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword } from '../client-auth/password';
import { createLifecycleStore } from './store';
import { createDeletionProofStore } from './proofs';
import type { Subject } from './types';

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url && url !== 'postgres://127.0.0.1:57583/legalsos_lifecycle_test') throw new Error('Only isolated lifecycle test database is allowed');
describe.skipIf(!url)('deletion reauthentication with real credentials', () => {
  const namespace = `reauth_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', { connection: { search_path: namespace } });
  let clientHash = '', lawyerHash = '';
  const password = ' exact synthetic password ';
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${namespace}`);
    for (const file of ['0047_mobile_client_accounts', '0048_mobile_client_passwords', '0091_legalsos_account_lifecycle', '0092_legalsos_deletion_proofs']) {
      await sql.unsafe(await readFile(`drizzle/${file}.sql`, 'utf8'));
    }
    await sql`CREATE TABLE bahrain_lawyers (id uuid PRIMARY KEY, password_hash text, is_active boolean DEFAULT true, status text DEFAULT 'approved')`;
    clientHash = await hashPassword(password);
    lawyerHash = await bcrypt.hash(password, 4);
  });
  afterAll(async () => {
    try { await sql.unsafe(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`); }
    finally { await sql.end(); }
  });
  async function account(role: Subject['role']): Promise<Subject> {
    const id = randomUUID();
    if (role === 'client') await sql`INSERT INTO mobile_client_accounts (id,email,full_name,phone,password_hash)
      VALUES (${id},${`${id}@example.com`},'Synthetic Client','+97336000000',${clientHash})`;
    else await sql`INSERT INTO bahrain_lawyers (id,password_hash) VALUES (${id},${lawyerHash})`;
    return { role, id };
  }
  const service = async () => (await import('./reauthentication')).createDeletionReauthentication(sql);
  it.each(['client', 'lawyer'] as const)('issues a subject-bound proof only for the exact %s password', async role => {
    const subject = await account(role), reauth = await service();
    await expect(reauth(subject, password.trim())).rejects.toMatchObject({ code: 'invalid_credentials' });
    expect(await sql`SELECT * FROM legalsos_deletion_proofs WHERE subject_id=${subject.id}`).toHaveLength(0);
    const receipt = await reauth(subject, password);
    expect(await createDeletionProofStore(sql).consume(subject, receipt.proof)).toBe(true);
    const rows = role === 'client'
      ? await sql`SELECT password_hash FROM mobile_client_accounts WHERE id=${subject.id}`
      : await sql`SELECT password_hash FROM bahrain_lawyers WHERE id=${subject.id}`;
    expect(rows[0].password_hash).toBe(role === 'client' ? clientHash : lawyerHash);
  });
  it('keeps rejected attempts counted and blocks attempt six even with the correct password', async () => {
    const subject = await account('lawyer'), reauth = await service();
    for (let i=0; i<5; i++) await expect(reauth(subject, 'wrong')).rejects.toMatchObject({ code: 'invalid_credentials' });
    await expect(reauth(subject, password)).rejects.toMatchObject({ code: 'rate_limited', status: 429 });
    expect(await sql`SELECT * FROM legalsos_deletion_proofs WHERE subject_id=${subject.id}`).toHaveLength(0);
    await sql`UPDATE mobile_client_auth_limits SET reset_at=now()-interval '1 second'`;
    expect((await reauth(subject, password)).proof).toBeTruthy();
  });
  it('does not issue proofs to closed or missing accounts', async () => {
    const subject = await account('client'), reauth = await service();
    await createLifecycleStore(sql).scheduleDeletion(subject);
    await expect(reauth(subject, password)).rejects.toMatchObject({ code: 'account_unavailable' });
    await expect(reauth({ role: 'lawyer', id: randomUUID() }, password)).rejects.toMatchObject({ code: 'invalid_credentials' });
  });
  it('does not let concurrent attempts bypass the limit', async () => {
    const subject = await account('lawyer'), reauth = await service();
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => reauth(subject, 'wrong')));
    const codes = results.map(result => result.status === 'rejected' ? result.reason.code : 'unexpected-success');
    expect(codes.filter(code => code === 'invalid_credentials')).toHaveLength(5);
    expect(codes.filter(code => code === 'rate_limited')).toHaveLength(3);
  });
});
