import { and, eq, gt, inArray, or, sql } from "drizzle-orm";

import { db, schema, sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
  type ActiveCountry,
} from "@/lib/db/country-tables";
import { toSqlTimestamp } from "@/lib/db/sql-timestamp";

import type {
  LawyerOnboardingLocale,
  LawyerOnboardingPublicState,
  LawyerOnboardingStatus,
} from "./lawyer-onboarding";
import { hashOpaqueToken } from "./lawyer-onboarding";

const activeStatuses: LawyerOnboardingStatus[] = [
  "email_pending",
  "profile_incomplete",
];

type BeginInput = {
  country: ActiveCountry;
  fullName: string;
  email: string;
  professionalIdentifier: string;
  locale: LawyerOnboardingLocale;
  verificationTokenHash: string;
  verificationExpiresAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function beginLawyerOnboarding(input: BeginInput) {
  const tables = buildCountryTableSet(input.country);
  const existingLawyer = await sqlClient`
    SELECT id
    FROM ${sqlClient(tables.lawyers)}
    WHERE lower(email) = ${input.email}
       OR registration_no = ${input.professionalIdentifier}
    LIMIT 1
  `;

  if (existingLawyer.length > 0) return { shouldDeliver: false };

  return db.transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.country.code}:${input.email}:${input.professionalIdentifier}`}, 0))`,
    );

    const existing = await transaction
      .select({
        id: schema.legalSosLawyerOnboarding.id,
        normalizedEmail: schema.legalSosLawyerOnboarding.normalizedEmail,
        professionalIdentifier:
          schema.legalSosLawyerOnboarding.professionalIdentifier,
      })
      .from(schema.legalSosLawyerOnboarding)
      .where(
        and(
          eq(schema.legalSosLawyerOnboarding.countryCode, input.country.code),
          inArray(schema.legalSosLawyerOnboarding.status, activeStatuses),
          or(
            eq(schema.legalSosLawyerOnboarding.normalizedEmail, input.email),
            eq(
              schema.legalSosLawyerOnboarding.professionalIdentifier,
              input.professionalIdentifier,
            ),
          ),
        ),
      );

    if (
      existing.some(
        (row) =>
          row.normalizedEmail !== input.email ||
          row.professionalIdentifier !== input.professionalIdentifier,
      )
    ) {
      return { shouldDeliver: false };
    }

    const current = existing[0];
    if (current) {
      await transaction
        .update(schema.legalSosLawyerOnboarding)
        .set({
          fullName: input.fullName,
          email: input.email,
          locale: input.locale,
          verificationTokenHash: input.verificationTokenHash,
          verificationTokenExpiresAt: input.verificationExpiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          updatedAt: new Date(),
        })
        .where(eq(schema.legalSosLawyerOnboarding.id, current.id));

      return { shouldDeliver: true };
    }

    await transaction.insert(schema.legalSosLawyerOnboarding).values({
      countryCode: input.country.code,
      fullName: input.fullName,
      email: input.email,
      normalizedEmail: input.email,
      professionalIdentifier: input.professionalIdentifier,
      locale: input.locale,
      verificationTokenHash: input.verificationTokenHash,
      verificationTokenExpiresAt: input.verificationExpiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    return { shouldDeliver: true };
  });
}

export async function incrementLawyerOnboardingRateLimit(
  bucket: string,
  now: Date,
  windowMs: number,
) {
  const cutoff = new Date(now.getTime() - windowMs);
  const nowSql = toSqlTimestamp(now);
  const cutoffSql = toSqlTimestamp(cutoff);
  const rows = await sqlClient<{ count: number }[]>`
    INSERT INTO legalsos_lawyer_onboarding_rate_limits
      (bucket, window_started_at, count, updated_at)
    VALUES (${bucket}, ${nowSql}::timestamptz, 1, ${nowSql}::timestamptz)
    ON CONFLICT (bucket) DO UPDATE SET
      window_started_at = CASE
        WHEN legalsos_lawyer_onboarding_rate_limits.window_started_at <= ${cutoffSql}::timestamptz
          THEN ${nowSql}::timestamptz
        ELSE legalsos_lawyer_onboarding_rate_limits.window_started_at
      END,
      count = CASE
        WHEN legalsos_lawyer_onboarding_rate_limits.window_started_at <= ${cutoffSql}::timestamptz
          THEN 1
        ELSE legalsos_lawyer_onboarding_rate_limits.count + 1
      END,
      updated_at = ${nowSql}::timestamptz
    RETURNING count
  `;

  return rows[0]?.count ?? 1;
}

export async function pruneLawyerOnboardingRateLimits(before: Date) {
  await sqlClient`
    DELETE FROM legalsos_lawyer_onboarding_rate_limits
    WHERE updated_at < ${toSqlTimestamp(before)}::timestamptz
  `;
}

const publicSelection = {
  id: schema.legalSosLawyerOnboarding.id,
  countryCode: schema.legalSosLawyerOnboarding.countryCode,
  fullName: schema.legalSosLawyerOnboarding.fullName,
  email: schema.legalSosLawyerOnboarding.email,
  professionalIdentifier:
    schema.legalSosLawyerOnboarding.professionalIdentifier,
  locale: schema.legalSosLawyerOnboarding.locale,
  status: schema.legalSosLawyerOnboarding.status,
  linkedLawyerId: schema.legalSosLawyerOnboarding.linkedLawyerId,
};

function publicState(
  row: typeof publicSelection extends Record<string, infer _Column>
    ? Record<keyof typeof publicSelection, unknown>
    : never,
): LawyerOnboardingPublicState {
  return row as LawyerOnboardingPublicState;
}

export async function verifyLawyerOnboarding(input: {
  verificationToken: string;
  sessionTokenHash: string;
  sessionExpiresAt: Date;
  now: Date;
}) {
  const [verified] = await db
    .update(schema.legalSosLawyerOnboarding)
    .set({
      status: "profile_incomplete",
      verifiedAt: sql`COALESCE(${schema.legalSosLawyerOnboarding.verifiedAt}, ${input.now})`,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
      sessionTokenHash: input.sessionTokenHash,
      sessionTokenExpiresAt: input.sessionExpiresAt,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(
          schema.legalSosLawyerOnboarding.verificationTokenHash,
          hashOpaqueToken(input.verificationToken),
        ),
        inArray(schema.legalSosLawyerOnboarding.status, activeStatuses),
        gt(
          schema.legalSosLawyerOnboarding.verificationTokenExpiresAt,
          input.now,
        ),
      ),
    )
    .returning(publicSelection);

  return verified ? publicState(verified) : null;
}

export async function readLawyerOnboardingSession(
  sessionToken: string,
  now = new Date(),
) {
  const [record] = await db
    .select(publicSelection)
    .from(schema.legalSosLawyerOnboarding)
    .where(
      and(
        eq(
          schema.legalSosLawyerOnboarding.sessionTokenHash,
          hashOpaqueToken(sessionToken),
        ),
        eq(
          schema.legalSosLawyerOnboarding.status,
          "profile_incomplete",
        ),
        gt(schema.legalSosLawyerOnboarding.sessionTokenExpiresAt, now),
      ),
    )
    .limit(1);

  return record ? publicState(record) : null;
}

export async function rotateLawyerOnboardingVerification(input: {
  countryCode: string;
  email: string;
  verificationTokenHash: string;
  verificationExpiresAt: Date;
  now: Date;
}) {
  const [record] = await db
    .update(schema.legalSosLawyerOnboarding)
    .set({
      verificationTokenHash: input.verificationTokenHash,
      verificationTokenExpiresAt: input.verificationExpiresAt,
      updatedAt: input.now,
    })
    .where(
      and(
        eq(schema.legalSosLawyerOnboarding.countryCode, input.countryCode),
        eq(schema.legalSosLawyerOnboarding.normalizedEmail, input.email),
        inArray(schema.legalSosLawyerOnboarding.status, activeStatuses),
      ),
    )
    .returning({
      fullName: schema.legalSosLawyerOnboarding.fullName,
      email: schema.legalSosLawyerOnboarding.email,
      locale: schema.legalSosLawyerOnboarding.locale,
    });

  return record
    ? {
        fullName: record.fullName,
        email: record.email,
        locale: record.locale as LawyerOnboardingLocale,
      }
    : null;
}

export async function markLawyerOnboardingSubmitted(input: {
  onboardingId: string;
  lawyerId: string;
}) {
  const [updated] = await db
    .update(schema.legalSosLawyerOnboarding)
    .set({
      status: "submitted",
      linkedLawyerId: input.lawyerId,
      submittedAt: new Date(),
      sessionTokenHash: null,
      sessionTokenExpiresAt: null,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.legalSosLawyerOnboarding.id, input.onboardingId),
        eq(
          schema.legalSosLawyerOnboarding.status,
          "profile_incomplete",
        ),
      ),
    )
    .returning({ id: schema.legalSosLawyerOnboarding.id });

  if (!updated) throw new Error("onboarding_state_changed");
}

export async function findPendingLawyerForOnboarding(input: {
  countryCode: string;
  email: string;
  professionalIdentifier: string;
}) {
  const country = await getActiveCountry(input.countryCode);
  if (!country) return null;
  const tables = buildCountryTableSet(country);
  const rows = await sqlClient<{ id: string; countryCode: string }[]>`
    SELECT id, country_code AS "countryCode"
    FROM ${sqlClient(tables.lawyers)}
    WHERE lower(email) = ${input.email}
      AND registration_no = ${input.professionalIdentifier}
      AND status = 'pending'
      AND profile_completed = true
      AND is_active = false
    LIMIT 1
  `;
  return rows[0] ?? null;
}
