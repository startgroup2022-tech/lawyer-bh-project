import { after, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, schema, sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";
import { createDefaultProviderCommissionRates } from "@/lib/payments/commission";
import { getAdminSession } from "@/lib/auth/admin-session";
import { canRepairTapApproval, finalizeTapAdminApproval } from "@/lib/tap/admin-approval";
import { getTapConfig } from "@/lib/tap/config";
import { runTapOnboarding } from "@/lib/tap/onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

class ApprovalConflictError extends Error {}

async function withApprovalLock<T>(applicationId: string, operation: () => Promise<T>): Promise<T> {
  const connection = await sqlClient.reserve();
  try {
    await connection`SELECT pg_advisory_lock(hashtext(${applicationId}))`;
    return await operation();
  } finally {
    try {
      await connection`SELECT pg_advisory_unlock(hashtext(${applicationId}))`;
    } finally {
      connection.release();
    }
  }
}

export async function POST(
  _request: Request,
  { params }: Params,
) {
  const session = await getAdminSession();
  if (!session || session.role === "reviewer") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const [activeAdmin] = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).where(and(
    eq(schema.adminUsers.id, session.id),
    eq(schema.adminUsers.isActive, true),
  )).limit(1);
  if (!activeAdmin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const config = getTapConfig();

  if (!id) {
    return NextResponse.json(
      {
        ok: false,
        error: "Application id is required",
      },
      {
        status: 400,
      },
    );
  }

  try {
    return await withApprovalLock(id, async () => {
    /*
     * جلب طلب تسجيل المحامي.
     */
    const [application] = await db
      .select({
        id: schema.saudiLawyers.id,
        countryCode: schema.saudiLawyers.countryCode,
        status: schema.saudiLawyers.status,
        membershipNo: schema.saudiLawyers.membershipNo,
        reviewedAt: schema.saudiLawyers.reviewedAt,
        isActive: schema.saudiLawyers.isActive,
      })
      .from(schema.saudiLawyers)
      .where(eq(schema.saudiLawyers.id, id))
      .limit(1);

    if (!application) {
      return NextResponse.json(
        {
          ok: false,
          error: "Application not found",
        },
        {
          status: 404,
        },
      );
    }

    const [existingOnboarding] = await db.select({ stage: schema.tapRetailerOnboarding.stage }).from(schema.tapRetailerOnboarding).where(and(
      eq(schema.tapRetailerOnboarding.lawyerId, id),
      eq(schema.tapRetailerOnboarding.environment, config.mode),
    )).limit(1);

    if (!canRepairTapApproval(application.status, application.isActive, Boolean(existingOnboarding))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Application is already reviewed",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * التحقق من الدولة وإنشاء أسماء الجداول الخاصة بها.
     */
    const country = await getActiveCountry(
      application.countryCode || "SA",
    );

    if (!country) {
      return NextResponse.json(
        {
          ok: false,
          error: "Application country is not active",
        },
        {
          status: 400,
        },
      );
    }

    const tables = buildCountryTableSet(country);
    const approvedAt = new Date();
    const durableApprovedAt = application.reviewedAt ?? approvedAt;

    /*
     * إنشاء رقم العضوية إذا لم يكن موجودًا.
     */
    let membershipNo = application.membershipNo;

    if (!membershipNo) {
      const sequenceName =
        `${country.tablePrefix}_lawyers_membership_no_seq`;

      const sequenceRows = await sqlClient`
        SELECT nextval(${sequenceName}::regclass) AS value
      `;

      const sequenceValue = (
        sequenceRows[0] as {
          value: string | number;
        } | undefined
      )?.value;

      if (sequenceValue === undefined) {
        throw new Error(
          "Could not generate lawyer membership number",
        );
      }

      const value = Number(sequenceValue);

      if (!Number.isFinite(value)) {
        throw new Error(
          "Generated membership number is invalid",
        );
      }

      membershipNo =
        `L${country.code}-${String(value).padStart(6, "0")}`;
    }

    /*
     * اعتماد المحامي وتفعيل حسابه.
     *
     * reviewedAt هو تاريخ بداية احتساب سنة العمولة الأولى.
     */
    const { provider: updated, tapOnboarding } = await finalizeTapAdminApproval({
      async approveInactive() {
        const [provider] = await db
          .update(schema.saudiLawyers)
          .set({
        status: "approved",
        isActive: false,
        membershipNo,
        reviewedAt: durableApprovedAt,
        reviewedBy: session.id,

        rejectionReason: null,

        suspensionType: null,
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,

        updatedAt: approvedAt,
          })
          .where(application.status === "pending"
            ? and(eq(schema.saudiLawyers.id, id), eq(schema.saudiLawyers.status, "pending"))
            : and(eq(schema.saudiLawyers.id, id), eq(schema.saudiLawyers.status, "approved"), eq(schema.saudiLawyers.isActive, false)))
          .returning({
        id: schema.saudiLawyers.id,
        countryCode: schema.saudiLawyers.countryCode,
        status: schema.saudiLawyers.status,
        isActive: schema.saudiLawyers.isActive,
        membershipNo: schema.saudiLawyers.membershipNo,
        reviewedAt: schema.saudiLawyers.reviewedAt,
          });
        if (!provider) throw new ApprovalConflictError("Application approval state changed");
        return provider;
      },

    /*
     * إنشاء نسب العمولة الافتراضية للمحامي.
     *
     * الفترة الأولى:
     * المنصة 20%
     * المحامي 80%
     * من تاريخ الاعتماد حتى مرور سنة.
     *
     * الفترة الثانية:
     * المنصة 50%
     * المحامي 50%
     * تبدأ بعد مرور سنة من تاريخ الاعتماد.
     */
      async createCommissions(provider) {
        await createDefaultProviderCommissionRates({
      providerId: provider.id,
      countryCode: country.code,
      commissionRatesTable:
        tables.provider_commission_rates,
      startsAt: provider.reviewedAt ?? durableApprovedAt,
        });
      },
      async ensureOnboarding(provider) {
        await db.insert(schema.tapRetailerOnboarding).values({
          lawyerId: provider.id,
          environment: config.mode,
          marketplaceMid: config.marketplaceMid,
          stage: "pending_admin",
        }).onConflictDoNothing();
        const [row] = await db.select({ stage: schema.tapRetailerOnboarding.stage }).from(schema.tapRetailerOnboarding).where(and(
          eq(schema.tapRetailerOnboarding.lawyerId, provider.id),
          eq(schema.tapRetailerOnboarding.environment, config.mode),
        )).limit(1);
        if (!row) throw new Error("Tap onboarding row was not created");
        return row;
      },
      scheduleOnboarding(provider) {
        after(async () => {
          try {
            await runTapOnboarding(provider.id);
          } catch {
            console.error("[admin approve application] Tap onboarding failed", provider.id);
          }
        });
      },
    });

    return NextResponse.json({
      ok: true,

      approvedLawyerId: updated.id,
      membershipNo: updated.membershipNo,

      approval: {
        status: updated.status,
        isActive: updated.isActive,
        approvedAt:
          updated.reviewedAt?.toISOString() ??
          approvedAt.toISOString(),
      },

      tapOnboarding,

      commission: {
        startsAt:
          updated.reviewedAt?.toISOString() ??
          approvedAt.toISOString(),

        firstYear: {
          platformPercentage: 20,
          lawyerPercentage: 80,
        },

        afterFirstYear: {
          platformPercentage: 50,
          lawyerPercentage: 50,
        },
      },
    }, { status: 202 });
    });
  } catch (error) {
    if (error instanceof ApprovalConflictError) {
      return NextResponse.json({ ok: false, error: "Application state changed; reload and try again" }, { status: 409 });
    }
    console.error(
      "[admin approve application] failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Could not approve application",
      },
      {
        status: 500,
      },
    );
  }
}
