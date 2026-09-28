import type postgres from 'postgres';
import type {Subject} from './types';
import {tokenDigest} from '../notification-preferences/validation';

/** Call inside the authenticated closure/purge transaction, before ownership is detached. */
export async function revokeOwnedDevices(tx:postgres.TransactionSql,subject:Subject):Promise<void>{
  if(!['client','lawyer'].includes(subject.role))throw new Error('invalid_subject');
  const installations=subject.role==='client'
    ?await tx`SELECT i.id,i.fcm_token FROM bahrain_mobile_push_installations i
      WHERE i.lawyer_id IS NULL AND EXISTS(SELECT 1 FROM bahrain_mobile_push_request_subscriptions s
        JOIN bahrain_emergency_requests r ON r.id=s.request_id
        WHERE s.installation_id=i.id AND r.client_account_id=${subject.id}) ORDER BY i.id FOR UPDATE`
    :await tx`SELECT id,fcm_token FROM bahrain_mobile_push_installations WHERE lawyer_id=${subject.id} ORDER BY id FOR UPDATE`;
  const ids=installations.map(r=>String(r.id));
  const calls=subject.role==='client'
    ?await tx`DELETE FROM bahrain_communication_call_push_registrations p USING bahrain_emergency_requests r
      WHERE p.request_id=r.id AND r.client_account_id=${subject.id} AND p.actor_role='client'
        AND p.actor_id='client:'||r.id::text RETURNING p.token`
    :await tx`DELETE FROM bahrain_communication_call_push_registrations
      WHERE actor_role='lawyer' AND actor_id=${subject.id} RETURNING token`;
  if(subject.role==='client'){
    await tx`DELETE FROM bahrain_mobile_push_request_subscriptions s USING bahrain_emergency_requests r
      WHERE s.request_id=r.id AND r.client_account_id=${subject.id}`;
    await tx`DELETE FROM bahrain_mobile_push_installations i WHERE i.id=ANY(${ids}::uuid[]) AND i.lawyer_id IS NULL
      AND NOT EXISTS(SELECT 1 FROM bahrain_mobile_push_request_subscriptions s WHERE s.installation_id=i.id)`;
  }else{
    await tx`DELETE FROM bahrain_mobile_push_request_subscriptions WHERE installation_id=ANY(${ids}::uuid[])`;
    await tx`DELETE FROM bahrain_mobile_push_installations WHERE id=ANY(${ids}::uuid[]) AND lawyer_id=${subject.id}`;
  }
  // Preferences belong to the device, not this account. Keep shared device state;
  // remove only orphan bindings for the exact revoked tokens, never by device alone.
  for(const token of new Set([...installations.map(r=>String(r.fcm_token)),...calls.map(r=>String(r.token))])){
    await tx`DELETE FROM mobile_notification_token_bindings WHERE token_digest=${tokenDigest(token)}
      AND NOT EXISTS(SELECT 1 FROM bahrain_mobile_push_installations WHERE fcm_token=${token})
      AND NOT EXISTS(SELECT 1 FROM bahrain_communication_call_push_registrations WHERE token=${token})`;
  }
}
