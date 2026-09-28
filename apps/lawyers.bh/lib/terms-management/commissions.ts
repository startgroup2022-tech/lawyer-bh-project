type CommissionOverrideInput = {
  lawyerId: string;
  countryCode: string;
  platformPercentage: string;
  effectiveFrom: string;
  reason: string | null;
};
type Actor = { adminId: string };
type StoredOverride = CommissionOverrideInput & {
  id: string;
  providerPercentage: string;
  createdByAdminId: string;
};

export type CommissionManagementRepository = {
  closeActiveOverride(lawyerId: string, effectiveFrom: string): Promise<void>;
  insertOverride(input: Omit<StoredOverride, "id">): Promise<StoredOverride>;
  transaction<T>(
    work: (repository: CommissionManagementRepository) => Promise<T>,
  ): Promise<T>;
  listLawyers(filters?: Record<string, unknown>): Promise<unknown[]>;
};

function normalizedPercentage(value: string) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) throw new Error("invalid_percentage");
  const hundredths =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (hundredths < 0 || hundredths > 10_000)
    throw new Error("invalid_percentage");
  return {
    platform: (hundredths / 100).toFixed(2),
    provider: ((10_000 - hundredths) / 100).toFixed(2),
  };
}

export function resolveDefaultCommissionSchedule(
  approvedAt: string,
  yearOne: string,
  yearTwo: string,
) {
  const start = new Date(approvedAt);
  if (Number.isNaN(start.getTime())) throw new Error("invalid_effective_date");
  const anniversary = new Date(start);
  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
  const first = normalizedPercentage(yearOne);
  const second = normalizedPercentage(yearTwo);
  return [
    {
      platformPercentage: first.platform,
      providerPercentage: first.provider,
      effectiveFrom: start.toISOString(),
      effectiveTo: anniversary.toISOString(),
    },
    {
      platformPercentage: second.platform,
      providerPercentage: second.provider,
      effectiveFrom: anniversary.toISOString(),
      effectiveTo: null,
    },
  ];
}

export function createCommissionManagementService(
  repository: CommissionManagementRepository,
) {
  return {
    listLawyerCommissionRows(filters?: Record<string, unknown>) {
      return repository.listLawyers(filters);
    },
    async setLawyerCommissionOverride(
      input: CommissionOverrideInput,
      actor: Actor,
    ) {
      if (!input.lawyerId.trim()) throw new Error("invalid_lawyer");
      const effective = new Date(input.effectiveFrom);
      if (Number.isNaN(effective.getTime()))
        throw new Error("invalid_effective_date");
      const percentage = normalizedPercentage(input.platformPercentage);
      const normalized = {
        ...input,
        countryCode: input.countryCode.trim().toUpperCase(),
        effectiveFrom: effective.toISOString(),
        platformPercentage: percentage.platform,
        providerPercentage: percentage.provider,
        createdByAdminId: actor.adminId,
      };
      return repository.transaction(async (tx) => {
        await tx.closeActiveOverride(
          normalized.lawyerId,
          normalized.effectiveFrom,
        );
        return tx.insertOverride(normalized);
      });
    },
  };
}

type SqlExecutor = {
  <T extends readonly Record<string, unknown>[] = Record<string, unknown>[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  begin<T>(work: (sql: SqlExecutor) => Promise<T>): Promise<T>;
};

function sqlRepository(sql: SqlExecutor): CommissionManagementRepository {
  return {
    async closeActiveOverride(lawyerId, effectiveFrom) {
      const lawyers = await sql`SELECT id FROM bahrain_lawyers WHERE id=${lawyerId}::uuid FOR UPDATE`;
      if (!lawyers.length) throw new Error("invalid_lawyer");
      await sql`UPDATE bahrain_provider_commission_rates SET is_active=false,
        effective_to=CASE WHEN effective_from < ${effectiveFrom}::timestamptz THEN ${effectiveFrom}::timestamptz ELSE effective_to END,updated_at=now()
        WHERE provider_id=${lawyerId}::uuid AND is_active=true
          AND (effective_to IS NULL OR effective_to > ${effectiveFrom}::timestamptz)`;
    },
    async insertOverride(input) {
      const rows = await sql<
        Array<{
          id: string;
          provider_id: string;
          country_code: string;
          platform_percentage: string;
          provider_percentage: string;
          effective_from: Date | string;
          notes: string | null;
        }>
      >`
        INSERT INTO bahrain_provider_commission_rates
          (provider_id,country_code,platform_percentage,provider_percentage,effective_from,is_active,notes)
        VALUES(${input.lawyerId}::uuid,${input.countryCode},${input.platformPercentage},${input.providerPercentage},${input.effectiveFrom}::timestamptz,true,${input.reason})
        RETURNING id,provider_id,country_code,platform_percentage,provider_percentage,effective_from,notes`;
      const row = rows[0];
      return {
        id: row.id,
        lawyerId: row.provider_id,
        countryCode: row.country_code,
        platformPercentage: row.platform_percentage,
        providerPercentage: row.provider_percentage,
        effectiveFrom:
          row.effective_from instanceof Date
            ? row.effective_from.toISOString()
            : row.effective_from,
        reason: row.notes,
        createdByAdminId: input.createdByAdminId,
      };
    },
    async listLawyers(filters) {
      const query = String(filters?.query ?? "").trim();
      const countryCode = String(filters?.countryCode ?? "")
        .trim()
        .toUpperCase();
      return sql<Array<Record<string, unknown>>>`
        SELECT l.id::text AS "lawyerId",l.country_code AS "countryCode",
          l.full_name_ar AS "fullNameAr",l.full_name_en AS "fullNameEn",l.email,
          COALESCE(r.platform_percentage,
            CASE WHEN now() < COALESCE(l.reviewed_at,l.created_at) + interval '1 year'
              THEN COALESCE(t.platform_percentage_year_one,20) ELSE COALESCE(t.platform_percentage_year_two,45) END) AS "platformPercentage",
          COALESCE(r.provider_percentage,
            100-CASE WHEN now() < COALESCE(l.reviewed_at,l.created_at) + interval '1 year'
              THEN COALESCE(t.platform_percentage_year_one,20) ELSE COALESCE(t.platform_percentage_year_two,45) END) AS "providerPercentage",
          (r.id IS NOT NULL) AS "hasOverride",r.effective_from AS "effectiveFrom"
        FROM bahrain_lawyers l
        LEFT JOIN LATERAL (SELECT * FROM bahrain_provider_commission_rates x
          WHERE x.provider_id=l.id AND x.is_active=true AND x.effective_from<=now()
            AND (x.effective_to IS NULL OR x.effective_to>now())
          ORDER BY x.effective_from DESC LIMIT 1) r ON true
        LEFT JOIN LATERAL (SELECT v.platform_percentage_year_one,v.platform_percentage_year_two
          FROM lawyer_terms_acceptances a JOIN terms_versions v ON v.id=a.terms_version_id
          WHERE a.lawyer_id=l.id AND v.document_type='lawyer_registration'
          ORDER BY a.accepted_at DESC LIMIT 1) t ON true
        WHERE (${countryCode}='' OR l.country_code=${countryCode})
          AND (${query}='' OR l.full_name_ar ILIKE ${`%${query}%`} OR l.full_name_en ILIKE ${`%${query}%`} OR l.email ILIKE ${`%${query}%`})
        ORDER BY l.created_at DESC`;
    },
    transaction(work) {
      return sql.begin((tx) => work(sqlRepository(tx)));
    },
  };
}

async function defaultService() {
  const { sqlClient } = await import("@/lib/db/client");
  return createCommissionManagementService(
    sqlRepository(sqlClient as unknown as SqlExecutor),
  );
}

// Publishing a new version must not rewrite the agreement an existing lawyer accepted.
export async function getAcceptedCommissionPercentages(lawyerId: string) {
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<{ platform_percentage_year_one: string; platform_percentage_year_two: string }[]>`
    SELECT v.platform_percentage_year_one, v.platform_percentage_year_two
    FROM lawyer_terms_acceptances a JOIN terms_versions v ON v.id=a.terms_version_id
    WHERE a.lawyer_id=${lawyerId}::uuid AND v.document_type='lawyer_registration'
    ORDER BY a.accepted_at DESC LIMIT 1`;
  return {
    platformPercentageYearOne: Number(rows[0]?.platform_percentage_year_one ?? 20),
    platformPercentageYearTwo: Number(rows[0]?.platform_percentage_year_two ?? 45),
  };
}
export async function listLawyerCommissionRows(
  filters?: Record<string, unknown>,
) {
  return (await defaultService()).listLawyerCommissionRows(filters);
}
export async function setLawyerCommissionOverride(
  input: CommissionOverrideInput,
  actor: Actor,
) {
  return (await defaultService()).setLawyerCommissionOverride(input, actor);
}
