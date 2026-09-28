import { after, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, schema, sqlClient } from "@/lib/db/client";
import {
  buildCountryTableSet,
  getActiveCountry,
} from "@/lib/db/country-tables";
import { AFTER_FIRST_YEAR_PLATFORM_PERCENTAGE, createDefaultProviderCommissionRates, FIRST_YEAR_PLATFORM_PERCENTAGE } from "@/lib/payments/commission";
import { getAcceptedCommissionPercentages } from "@/lib/terms-management/commissions";
import { getAdminSession } from "@/lib/auth/admin-session";
import { canRepairTapApproval, finalizeTapAdminApproval } from "@/lib/tap/admin-approval";
import { getTapConfig } from "@/lib/tap/config";
import { runTapOnboarding } from "@/lib/tap/onboarding";
import {
  isFirstLawyerApproval,
  sendLawyerApprovalEmail,
} from "@/lib/registration/lawyer-approval-email";
import { formatMembershipNumber } from "@/lib/provider/membership-number";

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
  request: Request,
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
  const body = await request.json().catch(() => ({})) as { countryCode?: string };
  const requestedCountryCode = String(body.countryCode ?? "").trim().toUpperCase();

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

  const country = await getActiveCountry(requestedCountryCode);
  if (!country || !["BH", "SA"].includes(country.code)) {
    return NextResponse.json({ ok: false, error: "Application country is not active" }, { status: 400 });
  }
  const tables = buildCountryTableSet(country);

  try {
    return await withApprovalLock(id, async () => {
    /*
     * جلب طلب تسجيل المحامي.
     */
    const [application] = await sqlClient<{
      id:string; countryCode:string; status:string; membershipNo:string|null;
      reviewedAt:Date|null; isActive:boolean; email:string|null;
      fullNameAr:string|null; fullNameEn:string|null; locale:string|null;
    }[]>`
      SELECT id, country_code AS "countryCode", status,
        membership_no AS "membershipNo", reviewed_at AS "reviewedAt",
        is_active AS "isActive", email, full_name_ar AS "fullNameAr",
        full_name_en AS "fullNameEn", locale
      FROM ${sqlClient(tables.lawyers)}
      WHERE id = ${id}::uuid AND country_code = ${country.code}
      LIMIT 1
    `;

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

    const shouldSendApprovalEmail = isFirstLawyerApproval(application.status);

    const [existingOnboarding] = country.code === "BH"
      ? await db.select({ stage: schema.tapRetailerOnboarding.stage }).from(schema.tapRetailerOnboarding).where(and(
          eq(schema.tapRetailerOnboarding.lawyerId, id),
          eq(schema.tapRetailerOnboarding.environment, config.mode),
        )).limit(1)
      : [{ stage: "not_applicable" }];

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

    const approvedAt = new Date();
    const durableApprovedAt = application.reviewedAt ?? approvedAt;
    const acceptedPercentages = country.code === "BH"
      ? await getAcceptedCommissionPercentages(application.id)
      : { platformPercentageYearOne: FIRST_YEAR_PLATFORM_PERCENTAGE, platformPercentageYearTwo: AFTER_FIRST_YEAR_PLATFORM_PERCENTAGE };

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

      membershipNo = formatMembershipNumber(country.code, Number(sequenceValue));
    }

    /*
     * اعتماد المحامي وتفعيل حسابه.
     *
     * reviewedAt هو تاريخ بداية احتساب سنة العمولة الأولى.
     */
    const { provider: updated, tapOnboarding } = await finalizeTapAdminApproval({
      tapRequired: country.code === "BH",
      async approveProvider() {
        const [provider] = await sqlClient<{
          id:string; countryCode:string; status:string; isActive:boolean;
          membershipNo:string|null; reviewedAt:Date|null;
        }[]>`
          UPDATE ${sqlClient(tables.lawyers)} SET
            status = 'approved', is_active = true, membership_no = ${membershipNo},
            reviewed_at = ${durableApprovedAt}, reviewed_by = ${session.id},
            rejection_reason = NULL, suspension_type = NULL,
            suspension_reason = NULL, suspended_at = NULL, suspended_by = NULL,
            updated_at = ${approvedAt}
          WHERE id = ${id}::uuid AND country_code = ${country.code}
            AND status = ${application.status === "pending" ? "pending" : "approved"}
          RETURNING id, country_code AS "countryCode", status,
            is_active AS "isActive", membership_no AS "membershipNo",
            reviewed_at AS "reviewedAt"
        `;
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
     * المنصة 45%
     * المحامي 55%
     * تبدأ بعد مرور سنة من تاريخ الاعتماد.
     */
      async createCommissions(provider) {
        await createDefaultProviderCommissionRates({
      providerId: provider.id,
      countryCode: country.code,
      commissionRatesTable:
        tables.provider_commission_rates,
      startsAt: provider.reviewedAt ?? durableApprovedAt,
      ...acceptedPercentages,
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

    if (shouldSendApprovalEmail && application.email) {
      await sendLawyerApprovalEmail({
        lawyerId: updated.id,
        email: application.email,
        fullNameAr: application.fullNameAr ?? "",
        fullNameEn: application.fullNameEn ?? "",
        locale: application.locale === "ar" ? "ar" : "en",
      });
    }

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
          platformPercentage: acceptedPercentages.platformPercentageYearOne,
          lawyerPercentage: 100 - acceptedPercentages.platformPercentageYearOne,
        },

        afterFirstYear: {
          platformPercentage: acceptedPercentages.platformPercentageYearTwo,
          lawyerPercentage: 100 - acceptedPercentages.platformPercentageYearTwo,
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
