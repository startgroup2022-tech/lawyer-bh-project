import type postgres from 'postgres';

/** Called only after each request capability's signature has been verified. */
export async function authorizeInboxRequests(sql:postgres.Sql,requestIds:string[]):Promise<boolean> {
  if(requestIds.length>100||requestIds.some(id=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) return false;
  const ids=[...new Set(requestIds)];
  if(!ids.length)return true;
  const [row]=await sql`SELECT count(*)::int AS allowed FROM bahrain_emergency_requests r
    WHERE r.id=ANY(${sql.array(ids,2950)}::uuid[]) AND r.client_access_revoked_at IS NULL AND NOT EXISTS (
      SELECT 1 FROM legalsos_account_lifecycle l WHERE l.subject_role='client' AND l.subject_id=r.client_account_id)`;
  return row.allowed===ids.length;
}
