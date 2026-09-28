import { randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env.LEGALSOS_LIFECYCLE_TEST_DATABASE_URL;
if (url && url !== 'postgres://127.0.0.1:57583/legalsos_lifecycle_test') throw new Error('Only isolated lifecycle test database is allowed');
describe.skipIf(!url)('single-use account deletion proof in isolated PostgreSQL', () => {
  const namespace = `proof_${randomUUID().replaceAll('-', '')}`;
  const sql = postgres(url ?? 'postgres://127.0.0.1:57583/legalsos_lifecycle_test', { connection: { search_path: namespace } });
  beforeAll(async () => {
    await sql.unsafe(`CREATE SCHEMA ${namespace}`);
    // The real migration, not a test-only representation of its constraints.
    await sql.unsafe(await readFile('drizzle/0092_legalsos_deletion_proofs.sql', 'utf8'));
  });
  afterAll(async () => {
    try { await sql.unsafe(`DROP SCHEMA IF EXISTS ${namespace} CASCADE`); }
    finally { await sql.end(); }
  });
  const subject = () => ({ role: 'client' as const, id: randomUUID() });
  const store = async () => (await import('./proofs')).createDeletionProofStore(sql);
  it('stores a digest, gives five minutes, and consumes a proof only once', async () => {
    const owner = subject(), persistence = await store();
    const receipt = await persistence.issue(owner);
    const [row] = await sql`SELECT * FROM legalsos_deletion_proofs WHERE subject_id=${owner.id}`;
    expect(row.token_digest).toBe(createHash('sha256').update(receipt.proof).digest('hex'));
    expect(JSON.stringify(row)).not.toContain(receipt.proof);
    expect(new Date(row.expires_at).getTime() - new Date(row.issued_at).getTime()).toBe(300000);
    expect(await persistence.consume(owner, receipt.proof)).toBe(true);
    expect(await persistence.consume(owner, receipt.proof)).toBe(false);
  });
  it('rejects wrong roles and identities without consuming the valid proof', async () => {
    const owner = subject(), persistence = await store(), receipt = await persistence.issue(owner);
    expect(await persistence.consume({ ...owner, role: 'lawyer' }, receipt.proof)).toBe(false);
    expect(await persistence.consume(subject(), receipt.proof)).toBe(false);
    expect(await persistence.consume(owner, 'garbage')).toBe(false);
    expect(await persistence.consume(owner, receipt.proof)).toBe(true);
  });
  it('rejects at the expiry boundary, including when the proof is otherwise valid', async () => {
    const owner = subject(), persistence = await store(), receipt = await persistence.issue(owner);
    await sql`UPDATE legalsos_deletion_proofs SET issued_at=now()-interval '5 minutes', expires_at=now() WHERE subject_id=${owner.id}`;
    expect(await persistence.consume(owner, receipt.proof)).toBe(false);
  });
  it('allows exactly one concurrent consumer', async () => {
    const owner = subject(), persistence = await store(), receipt = await persistence.issue(owner);
    const results = await Promise.all(Array.from({ length: 6 }, () => persistence.consume(owner, receipt.proof)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it('rolls consumption back if the enclosing deletion transaction fails', async () => {
    const owner = subject(), persistence = await store(), receipt = await persistence.issue(owner);
    const { createDeletionProofStore } = await import('./proofs');
    await expect(sql.begin(async tx => {
      expect(await createDeletionProofStore(tx).consume(owner, receipt.proof)).toBe(true);
      throw new Error('simulated-settlement-failure');
    })).rejects.toThrow('simulated-settlement-failure');
    expect(await persistence.consume(owner, receipt.proof)).toBe(true);
  });
  it('rejects invalid trusted subjects before storing a proof', async () => {
    const persistence = await store();
    await expect(persistence.issue({ role: 'client', id: '' })).rejects.toThrow('invalid_subject');
  });
});
