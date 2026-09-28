import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema, sqlClient } from "@/lib/db/client";
import { buildCountryTableSet } from "@/lib/db/country-tables";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
}

/** Stores a Web Push subscription under the authenticated advocate.
 *  Idempotent on `endpoint` — re-subscribing from the same browser
 *  just refreshes the row instead of creating a duplicate. */
export async function POST(req: Request) {
  const auth = await requireAdvocate();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  let country;
  try {
    country = await requireCountryProduct(auth.advocate.countryCode, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  // Upsert by endpoint. If another advocate had this endpoint (rare —
  // e.g. shared device), reassign it to the current session.
  const existing = await db
    .select({ id: schema.lawyerPushSubscriptions.id })
    .from(schema.lawyerPushSubscriptions)
    .where(
      and(
        eq(schema.lawyerPushSubscriptions.endpoint, body.endpoint),
        eq(
          schema.lawyerPushSubscriptions.countryCode,
          auth.advocate.countryCode,
        ),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.lawyerPushSubscriptions)
      .set({
        advocateId: auth.advocate.id,
        p256dhKey: body.keys.p256dh,
        authKey: body.keys.auth,
        userAgent: body.userAgent ?? null,
      })
      .where(eq(schema.lawyerPushSubscriptions.id, existing[0].id));
  } else {
    const tables = buildCountryTableSet(country);
    await sqlClient`
      INSERT INTO ${sqlClient(tables.lawyer_push_subscriptions)} (
        country_code, advocate_id, endpoint, p256dh_key, auth_key, user_agent
      ) VALUES (
        ${country.code}, ${auth.advocate.id}, ${body.endpoint},
        ${body.keys.p256dh}, ${body.keys.auth}, ${body.userAgent ?? null}
      )
    `;
  }

  return NextResponse.json({ ok: true });
}
