# Government Partner Logos

This directory holds the official artwork for every authority surfaced in
the **Clearance Services** section (web) and the **Government Partners**
panel (iOS in-app).

Each row in `lib/practiceAreas.ts → governmentPartners` references a
filename under this directory via its `logo` field. If a file is missing
the UI silently falls back to a generic icon — so the site never breaks
while you're sourcing artwork.

## Sourcing checklist

Pull the **vector** version (SVG preferred, otherwise transparent PNG at
≥256 px) from each authority's official site. Save the file as the exact
filename listed below — no resizing or recoloring needed; the UI clips it
into a 36×36 square and centers it.

| Key | Authority | Filename | Where to find it |
|---|---|---|---|
| `moj` | Ministry of Justice, Islamic Affairs and Endowments | `moj.svg` | https://www.moj.gov.bh/ — footer / about page |
| `moict` | Ministry of Industry, Commerce and Tourism | `moict.svg` | https://www.moic.gov.bh/ — header logo |
| `mofa` | Ministry of Foreign Affairs | `mofa.svg` | https://www.mofa.gov.bh/ — header logo |
| `lmra` | Labour Market Regulatory Authority | `lmra.svg` | https://lmra.bh/ — press/media kit |
| `sio` | Social Insurance Organization | `sio.svg` | https://www.sio.gov.bh/ — header logo |
| `iga` | Information & eGovernment Authority | `iga.svg` | https://www.iga.gov.bh/ — media center / press kit |
| `slrb` | Survey & Land Registration Bureau | `slrb.svg` | https://www.slrb.gov.bh/ — header logo |
| `municipal` | Municipal Affairs Services | `municipal.svg` | https://www.mun.gov.bh/ — header logo |
| `traffic` | General Directorate of Traffic | `traffic.svg` | https://www.moi.gov.bh/ (under MOI) — header logo |

## Tips

- **SVG > PNG** — SVG stays crisp at every device pixel ratio and the
  file size is usually smaller.
- **Transparent background** — the tile draws its own white card, so the
  logo should sit on transparency.
- **No padding inside the file** — the tile already adds 4 px of inner
  padding via `p-1`; padding baked into the SVG makes the logo look
  shrunken.
- **Need to swap one?** Drop a new file with the same name. Vercel's
  immutable cache key is filename-based, so the new artwork goes live on
  the next deploy.

## Adding a new authority

1. Add a new entry to `governmentPartners` in `lib/practiceAreas.ts`,
   including a `logo: "/images/government/<key>.svg"` path.
2. Drop the artwork in this directory with the matching filename.
3. The UI picks it up automatically — no component changes needed.
