import type postgres from 'postgres';
import type {Subject} from './types';
import {revokeOwnedDevices} from './revoke-devices';
import {purgeOwnedChatContent} from './purge-chat';
import {purgeCallHistoryIdentity} from './purge-call-history';
import {purgeOwnedNotifications} from './purge-notifications';
import {purgeOwnedRequestData} from './purge-request-data';
import {purgeDiscountIdentity} from './purge-discounts';
import {purgeAppIdentity} from './purge-identity';

/** Internal transactional composition. Deployment remains gated on the ownership audit. */
export async function purgeAccountData(tx:postgres.TransactionSql,subject:Subject):Promise<void>{
  const [due]=await tx`SELECT id FROM legalsos_account_lifecycle
    WHERE subject_role=${subject.role} AND subject_id=${subject.id}
      AND purge_after<=now() AND state IN ('pending_deletion','purging') FOR UPDATE`;
  if(!due)throw new Error('purge_not_due');
  await revokeOwnedDevices(tx,subject);
  await purgeOwnedChatContent(tx,subject);
  await purgeCallHistoryIdentity(tx,subject);
  await purgeOwnedNotifications(tx,subject);
  await purgeOwnedRequestData(tx,subject);
  await purgeDiscountIdentity(tx,subject);
  // All earlier stages resolve request ownership through this identity.
  // This must remain last, in the same transaction, so failure restores everything.
  await purgeAppIdentity(tx,subject);
}
