import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import type postgres from 'postgres';
import {ClientAuthError,digestCode,matchesCode,secretDigest,tokenDigest,type AccountRequest} from './validation';
import {hashPassword,verifyPassword} from './password';
import {createLifecycleStore} from '../legalsos-account-lifecycle/store';

export type ClientProfile={id:string;email:string;fullName:string;phone:string};
export type CodeMail={email:string;code:string;locale:'ar'|'en'|'tr';purpose:'register'|'reset'|'email_change'};
type AuthenticatedAccount={id:string;email:string;fullName:string;phone:string;password_hash:string|null;tokenDigest:string};

async function takeLimit(tx:postgres.TransactionSql,key:string,max:number,seconds:number,cooldown=0) {
  const rows=await tx`
    INSERT INTO mobile_client_auth_limits (key,count,reset_at,last_at)
    VALUES (${key},1,now()+${seconds}*interval '1 second',now())
    ON CONFLICT (key) DO UPDATE SET
      count=CASE WHEN mobile_client_auth_limits.reset_at<=now() THEN 1 ELSE mobile_client_auth_limits.count+1 END,
      reset_at=CASE WHEN mobile_client_auth_limits.reset_at<=now() THEN now()+${seconds}*interval '1 second' ELSE mobile_client_auth_limits.reset_at END,
      last_at=now()
    WHERE (mobile_client_auth_limits.reset_at<=now() OR mobile_client_auth_limits.count<${max})
      AND mobile_client_auth_limits.last_at<=now()-${cooldown}*interval '1 second'
    RETURNING key`;
  return rows.length===1;
}

export function createClientAuthService(sql:postgres.Sql,secret:string,deliver:(message:CodeMail)=>Promise<void>) {
  async function authenticatedAccount(tx:postgres.TransactionSql,token:string):Promise<AuthenticatedAccount> {
    if (!/^[0-9a-f]{64}$/.test(token)) throw new ClientAuthError('unauthorized',401);
    const digest=tokenDigest(token);
    const [account]=await tx`SELECT a.id,a.email,a.full_name AS "fullName",a.phone,a.password_hash,s.token_digest
      FROM mobile_client_sessions s JOIN mobile_client_accounts a ON a.id=s.client_id
      WHERE s.token_digest=${digest} AND s.expires_at>now() AND a.is_active=true
      FOR UPDATE OF a,s`;
    if(!account || await createLifecycleStore(tx).isAccountClosed({role:'client',id:account.id})) throw new ClientAuthError('unauthorized',401);
    return {id:account.id,email:account.email,fullName:account.fullName,phone:account.phone,password_hash:account.password_hash,tokenDigest:digest};
  }
  async function revokeOtherSessions(tx:postgres.TransactionSql,clientId:string,currentDigest:string) {
    await tx`DELETE FROM mobile_client_sessions WHERE client_id=${clientId} AND token_digest<>${currentDigest}`;
  }
  return {
    async request(input:AccountRequest,ip:string) {
      const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
      const digest=digestCode(id,code,secret);
      const allowed=await sql.begin(async tx=>{
        if (!(await takeLimit(tx,secretDigest(`send-ip:${ip}`,secret),20,3600))) return false;
        if (!(await takeLimit(tx,secretDigest(`send-email:${input.email}`,secret),5,3600,60))) return false;
        if (!(await takeLimit(tx,secretDigest('send-global',secret),500,3600))) return false;
        await tx`DELETE FROM mobile_client_challenges WHERE expires_at<now()-interval '1 day'`;
        await tx`DELETE FROM mobile_client_auth_limits WHERE reset_at<now()-interval '1 day'`;
        await tx`DELETE FROM mobile_client_sessions WHERE expires_at<now()-interval '1 day'`;
        return true;
      });
      if (!allowed) throw new ClientAuthError('rate_limited',429);
      const passwordHash=await hashPassword(input.password);
      await sql`INSERT INTO mobile_client_challenges (id,email,full_name,phone,code_digest,expires_at,password_hash,purpose)
        VALUES (${id},${input.email},${input.fullName},${input.phone},${digest},now()+interval '10 minutes',${passwordHash},${input.mode})
        ON CONFLICT (email) WHERE purpose IN ('register','reset') DO UPDATE SET id=EXCLUDED.id,full_name=EXCLUDED.full_name,phone=EXCLUDED.phone,
        code_digest=EXCLUDED.code_digest,expires_at=EXCLUDED.expires_at,password_hash=EXCLUDED.password_hash,purpose=EXCLUDED.purpose,attempts=0,delivered=false,consumed=false`;
      try {await deliver({email:input.email,code,locale:input.locale,purpose:input.mode});}
      catch {throw new ClientAuthError('delivery_failed',503);}
      await sql`UPDATE mobile_client_challenges SET delivered=true WHERE id=${id}`;
      return {challengeId:id,retryAfterSeconds:60,expiresInSeconds:600};
    },
    async verify(id:string,code:string,ip:string) {
      // All errors are returned out of the transaction so failed attempts persist.
      const result=await sql.begin(async tx=>{
        if (!(await takeLimit(tx,secretDigest(`verify-ip:${ip}`,secret),60,600))) return {error:'rate_limited'} as const;
        const [challenge]=await tx`SELECT *,expires_at>now() AS valid FROM mobile_client_challenges WHERE id=${id} FOR UPDATE`;
        if (!challenge || !challenge.valid || !challenge.delivered || challenge.consumed || challenge.attempts>=5 || !challenge.password_hash || !['register','reset'].includes(challenge.purpose)) return {error:'invalid_code'} as const;
        await tx`UPDATE mobile_client_challenges SET attempts=attempts+1 WHERE id=${id}`;
        if (!matchesCode(id,code,challenge.code_digest,secret)) return {error:'invalid_code'} as const;
        await tx`UPDATE mobile_client_challenges SET consumed=true,full_name=NULL,phone=NULL,password_hash=NULL WHERE id=${id}`;
        let [account]=await tx`SELECT id,email,full_name AS "fullName",phone,is_active FROM mobile_client_accounts WHERE email=${challenge.email} FOR UPDATE`;
        if (account && challenge.purpose==='register') return {error:'account_exists'} as const;
        if (!account) {
          if (challenge.purpose!=='register' || !challenge.full_name || !challenge.phone) return {error:'account_required'} as const;
          [account]=await tx`INSERT INTO mobile_client_accounts(email,full_name,phone,password_hash) VALUES (${challenge.email},${challenge.full_name},${challenge.phone},${challenge.password_hash})
            ON CONFLICT (email) DO NOTHING RETURNING id,email,full_name AS "fullName",phone,is_active`;
          if(!account) return {error:'account_exists'} as const;
        }
        if (!account.is_active || await createLifecycleStore(tx).isAccountClosed({role:'client',id:account.id})) return {error:'account_unavailable'} as const;
        if(challenge.purpose==='reset') {
          await tx`UPDATE mobile_client_accounts SET password_hash=${challenge.password_hash} WHERE id=${account.id}`;
          await tx`DELETE FROM mobile_client_sessions WHERE client_id=${account.id}`;
        }
        const token=randomBytes(32).toString('hex');
        const [session]=await tx`INSERT INTO mobile_client_sessions(token_digest,client_id,expires_at)
          VALUES (${tokenDigest(token)},${account.id},now()+interval '30 days') RETURNING expires_at`;
        const client:ClientProfile={id:account.id,email:account.email,fullName:account.fullName,phone:account.phone};
        return {token,client,expiresAt:new Date(session.expires_at).toISOString()};
      });
      if ('error' in result && result.error) throw new ClientAuthError(result.error,result.error==='rate_limited'?429:400);
      if (!result.token || !result.client || !result.expiresAt) throw new ClientAuthError('auth_unavailable',503);
      return {token:result.token,client:result.client,expiresAt:result.expiresAt};
    },
    async login(email:string,password:string,ip:string) {
      const allowed=await sql.begin(async tx=>{
        if(!await takeLimit(tx,secretDigest(`login-ip:${ip}`,secret),30,600)) return false;
        if(!await takeLimit(tx,secretDigest(`login-email:${email}`,secret),10,600)) return false;
        return takeLimit(tx,secretDigest('login-global',secret),1000,600);
      });
      if(!allowed) throw new ClientAuthError('rate_limited',429);
      const result=await sql.begin(async tx=>{
        const [account]=await tx`SELECT id,email,full_name AS "fullName",phone,is_active,password_hash FROM mobile_client_accounts WHERE email=${email} FOR UPDATE`;
        const valid=await verifyPassword(password,account?.password_hash??null);
        if(!valid || !account?.is_active || await createLifecycleStore(tx).isAccountClosed({role:'client',id:account.id})) return null;
        const token=randomBytes(32).toString('hex');
        const [session]=await tx`INSERT INTO mobile_client_sessions(token_digest,client_id,expires_at)
          VALUES (${tokenDigest(token)},${account.id},now()+interval '30 days') RETURNING expires_at`;
        return {token,client:{id:account.id,email:account.email,fullName:account.fullName,phone:account.phone} as ClientProfile,expiresAt:new Date(session.expires_at).toISOString()};
      });
      if(!result) throw new ClientAuthError('invalid_credentials',401);
      return result;
    },
    async session(token:string):Promise<ClientProfile|null> {
      if (!/^[0-9a-f]{64}$/.test(token)) return null;
      const [account]=await sql`SELECT a.id,a.email,a.full_name AS "fullName",a.phone
        FROM mobile_client_sessions s JOIN mobile_client_accounts a ON a.id=s.client_id
        WHERE s.token_digest=${tokenDigest(token)} AND s.expires_at>now() AND a.is_active=true`;
      if (!account || await createLifecycleStore(sql).isAccountClosed({role:'client',id:account.id})) return null;
      return {id:account.id,email:account.email,fullName:account.fullName,phone:account.phone};
    },
    async logout(token:string) {
      if (/^[0-9a-f]{64}$/.test(token)) await sql`DELETE FROM mobile_client_sessions WHERE token_digest=${tokenDigest(token)}`;
    },
    async deleteAccount(token:string) {
      return sql.begin(async tx=>{
        const account=await authenticatedAccount(tx,token);
        await tx`DELETE FROM mobile_client_sessions WHERE client_id=${account.id}`;
        await tx`DELETE FROM mobile_client_challenges WHERE client_id=${account.id}`;
        await tx`DELETE FROM mobile_client_challenges WHERE email=${account.email}`;
        await tx`DELETE FROM mobile_client_accounts WHERE id=${account.id}`;
      });
    },
    async updatePersonalInfo(token:string,input:{fullName:string;phone:string}):Promise<ClientProfile> {
      return sql.begin(async tx=>{
        const account=await authenticatedAccount(tx,token);
        const [updated]=await tx`UPDATE mobile_client_accounts SET full_name=${input.fullName},phone=${input.phone}
          WHERE id=${account.id} RETURNING id,email,full_name AS "fullName",phone`;
        return {id:updated.id,email:updated.email,fullName:updated.fullName,phone:updated.phone};
      });
    },
    async requestEmailChange(token:string,input:{email:string;currentPassword:string;locale:'ar'|'en'|'tr'},ip:string) {
      const id=randomUUID(),code=String(randomInt(0,1000000)).padStart(6,'0');
      const digest=digestCode(id,code,secret);
      const result=await sql.begin(async tx=>{
        const account=await authenticatedAccount(tx,token);
        if (!(await takeLimit(tx,secretDigest(`email-change-ip:${ip}`,secret),20,3600))) return {error:'rate_limited'} as const;
        if (!(await takeLimit(tx,secretDigest(`email-change-password:${account.id}`,secret),10,600))) return {error:'rate_limited'} as const;
        if(!await verifyPassword(input.currentPassword,account.password_hash)) return {error:'invalid_credentials'} as const;
        if (!(await takeLimit(tx,secretDigest(`email-change-send:${account.id}`,secret),5,3600,60))) return {error:'rate_limited'} as const;
        if(input.email===account.email) return {error:'email_unchanged'} as const;
        const [existing]=await tx`SELECT id FROM mobile_client_accounts WHERE email=${input.email}`;
        if(existing) return {error:'account_exists'} as const;
        await tx`DELETE FROM mobile_client_challenges WHERE client_id=${account.id} AND purpose='email_change' AND consumed=false`;
        await tx`INSERT INTO mobile_client_challenges (id,email,client_id,code_digest,expires_at,purpose)
          VALUES (${id},${input.email},${account.id},${digest},now()+interval '10 minutes','email_change')`;
        return {clientId:account.id} as const;
      });
      if('error' in result && result.error) throw new ClientAuthError(result.error,result.error==='rate_limited'?429:result.error==='invalid_credentials'?401:400);
      try {await deliver({email:input.email,code,locale:input.locale,purpose:'email_change'});}
      catch {throw new ClientAuthError('delivery_failed',503);}
      await sql`UPDATE mobile_client_challenges SET delivered=true WHERE id=${id} AND client_id=${result.clientId}`;
      return {challengeId:id,retryAfterSeconds:60,expiresInSeconds:600};
    },
    async verifyEmailChange(token:string,id:string,code:string,ip:string):Promise<ClientProfile> {
      const result=await sql.begin(async tx=>{
        const account=await authenticatedAccount(tx,token);
        if (!(await takeLimit(tx,secretDigest(`email-change-verify-ip:${ip}`,secret),60,600))) return {error:'rate_limited'} as const;
        const [challenge]=await tx`SELECT *,expires_at>now() AS valid FROM mobile_client_challenges WHERE id=${id} FOR UPDATE`;
        if(!challenge || challenge.client_id!==account.id || challenge.purpose!=='email_change' || !challenge.valid || !challenge.delivered || challenge.consumed || challenge.attempts>=5) return {error:'invalid_code'} as const;
        await tx`UPDATE mobile_client_challenges SET attempts=attempts+1 WHERE id=${id}`;
        if(!matchesCode(id,code,challenge.code_digest,secret)) return {error:'invalid_code'} as const;
        const [existing]=await tx`SELECT id FROM mobile_client_accounts WHERE email=${challenge.email} AND id<>${account.id}`;
        if(existing) return {error:'account_exists'} as const;
        const [updated]=await tx`UPDATE mobile_client_accounts SET email=${challenge.email},email_verified_at=now()
          WHERE id=${account.id} RETURNING id,email,full_name AS "fullName",phone`;
        await tx`UPDATE mobile_client_challenges SET consumed=true WHERE id=${id}`;
        await revokeOtherSessions(tx,account.id,account.tokenDigest);
        return {client:{id:updated.id,email:updated.email,fullName:updated.fullName,phone:updated.phone} as ClientProfile};
      });
      if('error' in result && result.error) throw new ClientAuthError(result.error,result.error==='rate_limited'?429:400);
      return result.client;
    },
    async changePassword(token:string,input:{currentPassword:string;newPassword:string},ip:string) {
      const result=await sql.begin(async tx=>{
        const account=await authenticatedAccount(tx,token);
        if (!(await takeLimit(tx,secretDigest(`password-change-ip:${ip}`,secret),30,600))) return {error:'rate_limited'} as const;
        if (!(await takeLimit(tx,secretDigest(`password-change-client:${account.id}`,secret),10,600))) return {error:'rate_limited'} as const;
        if(!await verifyPassword(input.currentPassword,account.password_hash)) return {error:'invalid_credentials'} as const;
        const passwordHash=await hashPassword(input.newPassword);
        await tx`UPDATE mobile_client_accounts SET password_hash=${passwordHash} WHERE id=${account.id}`;
        await revokeOtherSessions(tx,account.id,account.tokenDigest);
        return {ok:true} as const;
      });
      if('error' in result && result.error) throw new ClientAuthError(result.error,result.error==='rate_limited'?429:401);
    },
  };
}
