import {sqlClient} from '@/lib/db/client';
import {createPurgeCron} from '@/lib/legalsos-account-lifecycle/cron';
import {createPurgeWorker} from '@/lib/legalsos-account-lifecycle/purge';
import {purgeAccountData} from '@/lib/legalsos-account-lifecycle/purge-account';
import {createMonitoredPurgeJob} from '@/lib/legalsos-account-lifecycle/job';
import {createDeletionNoticeDelivery} from '@/lib/legalsos-account-lifecycle/notices';
import {createDeletionPushDelivery} from '@/lib/legalsos-account-lifecycle/notice-push';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;

const purge=createMonitoredPurgeJob(sqlClient,createPurgeWorker(sqlClient,purgeAccountData));
const deliverNotices=createDeletionNoticeDelivery(sqlClient,async notice=>{
  const {mobilePushSender}=await import('@/lib/sos/mobile-push');
  await createDeletionPushDelivery(await mobilePushSender())(notice);
});

export const GET=createPurgeCron({
  secret:()=>process.env.CRON_SECRET,
  enabled:()=>process.env.LEGALSOS_DELETION_WORKFLOW_READY==='1',
  run:async()=>{
    // Delivery failures must not postpone the fixed deletion deadline.
    const result=await purge();
    const notices=await deliverNotices();
    if(notices.failed)throw new Error('notice_delivery_failed');
    return result;
  },
  status:async()=>{
    const [row]=await sqlClient`SELECT count(*)::int AS pending,
      count(*) FILTER(WHERE purge_after<=now())::int AS due FROM legalsos_account_lifecycle WHERE state<>'purged'`;
    return {pending:row.pending,due:row.due};
  },
});
