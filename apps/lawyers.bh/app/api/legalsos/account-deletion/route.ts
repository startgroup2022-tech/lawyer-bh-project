import { sqlClient } from '@/lib/db/client';
import { createWebDeletionHandlers } from '@/lib/legalsos-account-lifecycle/web-http';
import { createWebDeletionReauthentication,resolveWebDeletionSubject } from '@/lib/legalsos-account-lifecycle/web-reauthentication';
import { createAccountDeletionService,recoverDeletionReceipt } from '@/lib/legalsos-account-lifecycle/deletion';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const handlers=createWebDeletionHandlers({
  enabled:()=>process.env.LEGALSOS_DELETION_WORKFLOW_READY==='1',
  verify:createWebDeletionReauthentication(sqlClient),
  resolve:proof=>resolveWebDeletionSubject(sqlClient,proof),
  close:createAccountDeletionService(sqlClient),
  recover:proof=>recoverDeletionReceipt(sqlClient,proof),
});
export const POST=handlers.POST;
export const GET=handlers.GET;
