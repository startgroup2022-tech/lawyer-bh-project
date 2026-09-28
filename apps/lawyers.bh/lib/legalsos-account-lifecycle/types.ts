export type Subject = { role: 'client' | 'lawyer'; id: string };
export type DeletionReceipt = { id: string; requestedAt: string; purgeAfter: string; cleanupRequestIds?: string[] };
export type LifecycleState = 'pending_deletion' | 'purging' | 'purged';
