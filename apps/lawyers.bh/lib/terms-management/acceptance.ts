type Pending = { lawyerId: string; versionId: string };
export type AcceptanceRepository = {
  getPending(lawyerId: string): Promise<Pending | null>;
  listCampaignTargets(versionId: string): Promise<string[]>;
  createPending(lawyerId: string, versionId: string, adminId: string): Promise<void>;
  accept(lawyerId: string, versionId: string, metadata: Record<string, unknown>): Promise<void>;
  transaction<T>(work: (repository: AcceptanceRepository) => Promise<T>): Promise<T>;
};

export class TermsAcceptanceRequiredError extends Error {
  readonly code = "terms_acceptance_required";
  constructor(public readonly versionId: string) { super("terms_acceptance_required"); }
}

export function createLawyerTermsAcceptanceService(repository: AcceptanceRepository) {
  return {
    async getLawyerTermsRequirement(lawyerId: string) { return repository.getPending(lawyerId); },
    async assertLawyerRequestAccess(lawyerId: string) {
      const pending = await repository.getPending(lawyerId);
      if (pending) throw new TermsAcceptanceRequiredError(pending.versionId);
    },
    async requestExistingLawyerAcceptance(versionId: string, actor: { adminId: string }) {
      return repository.transaction(async tx => {
        const targets = await tx.listCampaignTargets(versionId);
        for (const lawyerId of targets) await tx.createPending(lawyerId, versionId, actor.adminId);
        return { targeted: targets.length };
      });
    },
    async acceptRequiredLawyerTerms(lawyerId: string, versionId: string, metadata: Record<string, unknown>) {
      return repository.transaction(async tx => {
        const pending = await tx.getPending(lawyerId);
        if (!pending) return;
        if (pending.versionId !== versionId) throw new Error("terms_version_stale");
        await tx.accept(lawyerId, versionId, metadata);
      });
    },
  };
}

type SqlExecutor = {
  <T extends readonly Record<string, unknown>[] = Record<string, unknown>[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  begin<T>(work: (sql: SqlExecutor) => Promise<T>): Promise<T>;
};

function sqlAcceptanceRepository(sql: SqlExecutor): AcceptanceRepository {
  return {
    async getPending(lawyerId) {
      const rows = await sql<Array<{ lawyer_id: string; terms_version_id: string }>>`
        SELECT lawyer_id, terms_version_id FROM lawyer_terms_acceptance_requests
        WHERE lawyer_id=${lawyerId}::uuid AND status='pending'
        ORDER BY requested_at DESC LIMIT 1`;
      return rows[0] ? { lawyerId: rows[0].lawyer_id, versionId: rows[0].terms_version_id } : null;
    },
    async listCampaignTargets(versionId) {
      const rows = await sql<Array<{ id: string }>>`
        SELECT l.id FROM bahrain_lawyers l
        WHERE l.status='approved' AND l.is_active=true
          AND NOT EXISTS (SELECT 1 FROM lawyer_terms_acceptances a WHERE a.lawyer_id=l.id AND a.terms_version_id=${versionId}::uuid)
        ORDER BY l.created_at`;
      return rows.map(row => row.id);
    },
    async createPending(lawyerId, versionId, adminId) {
      await sql`INSERT INTO lawyer_terms_acceptance_requests
        (campaign_id,lawyer_id,terms_version_id,requested_by_admin_id)
        VALUES(gen_random_uuid(),${lawyerId}::uuid,${versionId}::uuid,${adminId}::uuid)
        ON CONFLICT (lawyer_id,terms_version_id) DO UPDATE SET
          status=CASE WHEN lawyer_terms_acceptance_requests.status='accepted' THEN 'accepted' ELSE 'pending' END,
          updated_at=now()`;
    },
    async accept(lawyerId, versionId, metadata) {
      const ip = typeof metadata.ip === "string" ? metadata.ip : null;
      const userAgent = typeof metadata.userAgent === "string" ? metadata.userAgent : null;
      await sql`INSERT INTO lawyer_terms_acceptances
        (lawyer_id,terms_version_id,accepted_ip,accepted_user_agent)
        VALUES(${lawyerId}::uuid,${versionId}::uuid,${ip},${userAgent})
        ON CONFLICT (lawyer_id,terms_version_id) DO NOTHING`;
      await sql`UPDATE lawyer_terms_acceptance_requests SET status='accepted',accepted_at=now(),updated_at=now()
        WHERE lawyer_id=${lawyerId}::uuid AND terms_version_id=${versionId}::uuid AND status='pending'`;
    },
    transaction(work) { return sql.begin(tx => work(sqlAcceptanceRepository(tx))); },
  };
}

async function defaultService() {
  const { sqlClient } = await import("@/lib/db/client");
  return createLawyerTermsAcceptanceService(sqlAcceptanceRepository(sqlClient as unknown as SqlExecutor));
}

export async function getLawyerTermsRequirement(lawyerId: string) {
  return (await defaultService()).getLawyerTermsRequirement(lawyerId);
}
export async function assertLawyerRequestAccess(lawyerId: string) {
  return (await defaultService()).assertLawyerRequestAccess(lawyerId);
}
export async function requestExistingLawyerAcceptance(versionId: string, actor: { adminId: string }) {
  return (await defaultService()).requestExistingLawyerAcceptance(versionId, actor);
}
export async function acceptRequiredLawyerTerms(lawyerId: string, versionId: string, metadata: Record<string, unknown>) {
  return (await defaultService()).acceptRequiredLawyerTerms(lawyerId, versionId, metadata);
}
