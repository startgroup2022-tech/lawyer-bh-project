import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public appearance settings for the mobile app.
 *
 * The admin panel owns these values (Countries → background upload + opacity);
 * the app only reads them. Every field is optional on purpose: a country with no
 * saved settings, a missing row or an unreachable database must all resolve to a
 * usable default rather than an error, because a background image is decoration
 * and must never stop the app from rendering.
 */
const DEFAULT_APPEARANCE = {
  backgroundUrl: null as string | null,
  backgroundOpacity: 100,
  overlayOpacity: 0,
  backgroundColor: null as string | null,
};

function clampPercent(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function asBackgroundUrl(value: unknown) {
  return typeof value === "string" && /^https:\/\//.test(value) ? value : null;
}

export async function GET(request: Request) {
  const code = (new URL(request.url).searchParams.get("countryCode") || "BH")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    return NextResponse.json(
      { ok: true, countryCode: "BH", appearance: DEFAULT_APPEARANCE },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rows = await sqlClient`
      SELECT
        background_url AS "backgroundUrl",
        background_opacity AS "backgroundOpacity",
        background_overlay_opacity AS "overlayOpacity",
        background_color AS "backgroundColor"
      FROM public.country_channel_settings
      WHERE code = ${code}
      LIMIT 1
    `;
    const row = rows[0] as
      | {
          backgroundUrl: string | null;
          backgroundOpacity: number | null;
          overlayOpacity: number | null;
          backgroundColor: string | null;
        }
      | undefined;

    const appearance = {
      backgroundUrl: asBackgroundUrl(row?.backgroundUrl),
      backgroundOpacity: clampPercent(row?.backgroundOpacity, 100),
      overlayOpacity: clampPercent(row?.overlayOpacity, 0),
      backgroundColor:
        typeof row?.backgroundColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(row.backgroundColor)
          ? row.backgroundColor.toUpperCase()
          : null,
    };

    return NextResponse.json(
      { ok: true, countryCode: code, appearance },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Appearance is non-critical: answer with defaults instead of failing the
    // app's first paint.
    return NextResponse.json(
      { ok: true, countryCode: code, appearance: DEFAULT_APPEARANCE },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
