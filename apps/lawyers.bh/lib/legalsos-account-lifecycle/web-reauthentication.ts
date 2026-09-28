import type postgres from 'postgres';
import { createHash } from 'node:crypto';
import { ClientAuthError } from '../client-auth/validation';
import { createDeletionReauthentication } from './reauthentication';
import type { Subject } from './types';

export function createWebDeletionReauthentication(sql: postgres.Sql) {
  return async (role: Subject['role'], identifier: string, password: string, ip: string): Promise<{proof:string;expiresAt:string}> => {
    if(!['client','lawyer'].includes(role)||typeof identifier!=='string'||!identifier.trim()||identifier.length>254||
      typeof password!=='string'||!password.length||password.length>128)throw new ClientAuthError('invalid_credentials',401);
    const normalized=role==='client'?identifier.trim().toLowerCase():identifier.trim();
    // Commit both limits before account lookup, including unknown identifiers.
    // No full app session or website login is issued for this narrowly scoped flow.
    for(const [scope,max] of [[`identifier:${role}:${normalized}`,5],[`ip:${ip}`,30]] as const){
      const key=createHash('sha256').update(`legalsos-web-deletion:${scope}`).digest('hex');
      const rows=await sql`INSERT INTO mobile_client_auth_limits(key,count,reset_at,last_at)
        VALUES(${key},1,clock_timestamp()+interval '15 minutes',clock_timestamp())
        ON CONFLICT(key) DO UPDATE SET
          count=CASE WHEN mobile_client_auth_limits.reset_at<=clock_timestamp() THEN 1 ELSE mobile_client_auth_limits.count+1 END,
          reset_at=CASE WHEN mobile_client_auth_limits.reset_at<=clock_timestamp() THEN clock_timestamp()+interval '15 minutes' ELSE mobile_client_auth_limits.reset_at END,
          last_at=clock_timestamp()
        WHERE mobile_client_auth_limits.reset_at<=clock_timestamp() OR mobile_client_auth_limits.count<${max}
        RETURNING key`;
      if(!rows.length)throw new ClientAuthError('rate_limited',429);
    }
    const [row]=role==='client'
      ?await sql`SELECT id FROM mobile_client_accounts WHERE email=${normalized} LIMIT 1`
      :await sql`SELECT id FROM bahrain_lawyers WHERE registration_no=${normalized} AND country_code='BH' LIMIT 1`;
    if(!row)throw new ClientAuthError('invalid_credentials',401);
    try{return await createDeletionReauthentication(sql)({role,id:String(row.id)},password);}
    catch(error){
      if(error instanceof ClientAuthError&&error.code==='account_unavailable')throw new ClientAuthError('invalid_credentials',401);
      throw error;
    }
  };
}
export async function resolveWebDeletionSubject(sql: postgres.Sql, proof: string): Promise<Subject|null> {
  if(!/^[A-Za-z0-9_-]{43}$/.test(proof))return null;
  const digest=createHash('sha256').update(proof).digest('hex');
  const [row]=await sql`SELECT subject_role,subject_id FROM legalsos_deletion_proofs
    WHERE token_digest=${digest} AND consumed_at IS NULL AND expires_at>clock_timestamp()`;
  return row?{role:row.subject_role,id:row.subject_id}:null;
}
