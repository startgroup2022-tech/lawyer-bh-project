import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { buildCountryTableSet } from "@/lib/db/country-tables";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";
import { listAdvocateShifts } from "@/lib/sos/shifts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  dayOfWeek: number;
  startMinuteUtc: number;
  endMinuteUtc: number;
  notes?: string;
}

/** GET → all shifts for the authenticated advocate. */
export async function GET() {
  const auth = await requireAdvocate();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const shifts = await listAdvocateShifts(
    auth.advocate.id,
    auth.advocate.countryCode,
  );
  return NextResponse.json({ shifts });
}

/** POST → create a new shift. Idempotency is the caller's
 *  responsibility — duplicate windows are simply allowed since the
 *  matcher unions them. */
export async function POST(req: Request) {
  const auth = await requireAdvocate();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const dow = Number(body.dayOfWeek);
  const start = Number(body.startMinuteUtc);
  const end = Number(body.endMinuteUtc);
  if (
    !Number.isInteger(dow) ||
    dow < 0 ||
    dow > 6 ||
    !Number.isInteger(start) ||
    start < 0 ||
    start > 1439 ||
    !Number.isInteger(end) ||
    end < 0 ||
    end > 1439 ||
    start === end
  ) {
    return NextResponse.json({ error: "invalid_window" }, { status: 400 });
  }

  let country;
  try {
    country = await requireCountryProduct(auth.advocate.countryCode, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }
  const tables = buildCountryTableSet(country);
  const rows = await sqlClient`
    INSERT INTO ${sqlClient(tables.advocate_shifts)} (
      country_code, advocate_id, day_of_week, start_minute_utc,
      end_minute_utc, notes
    ) VALUES (
      ${country.code}, ${auth.advocate.id}, ${dow}, ${start}, ${end},
      ${typeof body.notes === "string" ? body.notes.slice(0, 200) : null}
    )
    RETURNING *
  `;
  return NextResponse.json({ shift: rows[0] });
}
