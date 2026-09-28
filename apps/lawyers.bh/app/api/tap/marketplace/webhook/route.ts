import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/lib/db/client";
import { createTapClient, TapApiError } from "@/lib/tap/client";
import { getTapConfig } from "@/lib/tap/config";
import {
  parseTapProviderNotification,
  syncTapProviderActivation,
  type ConfirmedProviderStatus,
} from "@/lib/tap/provider-activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function applyConfirmedStatus(input: ConfirmedProviderStatus) {
  return db.transaction(async (tx) => {
    const [onboarding] = await tx
      .select({
        id: schema.tapRetailerOnboarding.id,
        lawyerId: schema.tapRetailerOnboarding.lawyerId,
      })
      .from(schema.tapRetailerOnboarding)
      .where(
        and(
          eq(schema.tapRetailerOnboarding.environment, input.environment),
          or(
            eq(schema.tapRetailerOnboarding.retailerId, input.retailerId),
            eq(schema.tapRetailerOnboarding.destinationId, input.destinationId),
          ),
        ),
      )
      .limit(1);

    if (!onboarding) return null;

    const now = new Date();
    await tx
      .update(schema.tapRetailerOnboarding)
      .set(
        input.payoutEnabled
          ? {
              kycStatus: "approved",
              payoutEnabled: true,
              stage: "active",
              activatedAt: now,
              lastCompletedStage: "active",
              lastErrorCode: null,
              lastErrorMessage: null,
              updatedAt: now,
            }
          : {
              kycStatus: "pending",
              payoutEnabled: false,
              stage: "tap_kyc_pending",
              activatedAt: null,
              lastCompletedStage: "tap_creating_retailer",
              updatedAt: now,
            },
      )
      .where(eq(schema.tapRetailerOnboarding.id, onboarding.id));

    if (input.payoutEnabled) {
      await tx
        .update(schema.bahrainLawyers)
        .set({ isActive: true, updatedAt: now })
        .where(
          and(
            eq(schema.bahrainLawyers.id, onboarding.lawyerId),
            eq(schema.bahrainLawyers.status, "approved"),
          ),
        );
    }

    return { lawyerId: onboarding.lawyerId, payoutEnabled: input.payoutEnabled };
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const config = getTapConfig();
    const result = await syncTapProviderActivation(
      {
        environment: config.mode,
        tapClient: createTapClient(config),
        repository: { applyConfirmedStatus },
      },
      parseTapProviderNotification(body),
    );

    if (!result) {
      return NextResponse.json({ ok: false, error: "Unknown Tap retailer" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof TapApiError) {
      return NextResponse.json(
        { ok: false, error: "Tap destination verification failed" },
        { status: 502 },
      );
    }

    if (error instanceof Error && (
      error.message === "Tap retailer identifier is missing" ||
      error.message === "Tap destination identity mismatch"
    )) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    console.error("[tap marketplace webhook] failed", error);
    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 });
  }
}
