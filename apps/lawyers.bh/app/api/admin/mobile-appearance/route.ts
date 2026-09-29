import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/admin-access";
import { countryCatalog, parseCountryPatch } from "@/lib/countries/catalog";
import { loadManagedCountries, saveCountrySettings } from "@/lib/countries/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function knownCountry(code: unknown) {
  const value = String(code ?? "");
  if (!countryCatalog.some((c) => c.code === value)) throw new Error("Unknown country");
  return value;
}

/**
 * Appearance section: the mobile background image and the opacity knobs that
 * keep it legible. Reuses the same storage and validation as the country
 * background route so there is exactly one source of truth.
 */
export async function GET() {
  if (!(await requireSuperAdmin())) return json({ ok: false, error: "FORBIDDEN" }, 403);
  try {
    const countries = (await loadManagedCountries())
      .filter((country) => country.backgroundUrl || country.tablesProvisioned)
      .map((country) => ({
        code: country.code,
        nameAr: country.nameAr,
        nameEn: country.nameEn,
        backgroundUrl: country.backgroundUrl,
        backgroundOpacity: country.backgroundOpacity,
        backgroundOverlayOpacity: country.backgroundOverlayOpacity,
        backgroundColor: country.backgroundColor,
        tablesProvisioned: country.tablesProvisioned,
      }));
    return json({ ok: true, countries });
  } catch {
    return json({ ok: false, error: "APPEARANCE_UNAVAILABLE" }, 503);
  }
}

export async function PATCH(request: Request) {
  if (!(await requireSuperAdmin())) return json({ ok: false, error: "FORBIDDEN" }, 403);
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ ok: false, error: "INVALID_ORIGIN" }, 403);
  let code: string;
  let patch: ReturnType<typeof parseCountryPatch>;
  try {
    const body = await request.json();
    code = knownCountry(body.code);
    const values = { ...body };
    delete values.code;
    patch = parseCountryPatch(values);
  } catch {
    return json({ ok: false, error: "INVALID_APPEARANCE" }, 400);
  }
  try {
    await saveCountrySettings(code, patch);
    return json({ ok: true, settings: patch });
  } catch {
    return json({ ok: false, error: "APPEARANCE_UNAVAILABLE" }, 503);
  }
}
