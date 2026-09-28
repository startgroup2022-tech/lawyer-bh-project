import type postgres from 'postgres';
import {ClientAuthError} from '../client-auth/validation';
import {defaultPreferences,tokenDigest,type NotificationCategory,type NotificationPreferences,type PreferenceUpdate} from './validation';
export function createNotificationPreferencesStore(sql:postgres.Sql){
  return {
    async get(key:string):Promise<NotificationPreferences>{
      const [row]=await sql<NotificationPreferences[]>`SELECT enabled,requests,communications,advertising FROM mobile_notification_device_preferences WHERE device_key=${key}`;
      return row??{...defaultPreferences};
    },
    async save(key:string,input:PreferenceUpdate):Promise<NotificationPreferences>{
      return await sql.begin(async tx=>{
        await tx`INSERT INTO mobile_notification_device_preferences(device_key) VALUES (${key}) ON CONFLICT DO NOTHING`;
        if(input.token){
          const bound=await tx`INSERT INTO mobile_notification_token_bindings(token_digest,device_key) VALUES (${tokenDigest(input.token)},${key})
            ON CONFLICT(token_digest) DO UPDATE SET last_seen_at=now() WHERE mobile_notification_token_bindings.device_key=EXCLUDED.device_key RETURNING device_key`;
          if(!bound.length)throw new ClientAuthError('device_conflict',409);
        }
        if(input.preferences){const p=input.preferences;await tx`UPDATE mobile_notification_device_preferences SET enabled=${p.enabled},requests=${p.requests},communications=${p.communications},advertising=${p.advertising},updated_at=now() WHERE device_key=${key}`;}
        const [row]=await tx<NotificationPreferences[]>`SELECT enabled,requests,communications,advertising FROM mobile_notification_device_preferences WHERE device_key=${key}`;
        return row;
      });
    },
    async filterTokens(tokens:string[],category:NotificationCategory):Promise<string[]>{
      if(!tokens.length)return [];
      const hashes=tokens.map(tokenDigest);
      const rows=await sql<{token_digest:string}[]>`SELECT b.token_digest FROM mobile_notification_token_bindings b JOIN mobile_notification_device_preferences p ON p.device_key=b.device_key
        WHERE b.token_digest=ANY(${sql.array(hashes)}::text[]) AND (NOT p.enabled OR NOT CASE ${category} WHEN 'requests' THEN p.requests WHEN 'communications' THEN p.communications ELSE p.advertising END)`;
      const blocked=new Set(rows.map(row=>row.token_digest));
      return [...new Set(tokens)].filter(token=>!blocked.has(tokenDigest(token)));
    },
  };
}
