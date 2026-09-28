import { sqlClient } from '@/lib/db/client';
import { createDeletionHandlers } from '@/lib/legalsos-account-lifecycle/http';
import { resolveDeletionSubject } from '@/lib/legalsos-account-lifecycle/subject';
import { createDeletionReauthentication } from '@/lib/legalsos-account-lifecycle/reauthentication';
import { createAccountDeletionService,recoverDeletionReceipt } from '@/lib/legalsos-account-lifecycle/deletion';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Keep disabled until purge, remaining access paths and both UIs pass acceptance.
const handlers=createDeletionHandlers({
  enabled:()=>process.env.LEGALSOS_DELETION_WORKFLOW_READY==='1',
  subject:resolveDeletionSubject,
  reauthenticate:createDeletionReauthentication(sqlClient),
  close:createAccountDeletionService(sqlClient),
  recover:proof=>recoverDeletionReceipt(sqlClient,proof),
});
export const POST=handlers.POST;
export const GET=handlers.GET;
