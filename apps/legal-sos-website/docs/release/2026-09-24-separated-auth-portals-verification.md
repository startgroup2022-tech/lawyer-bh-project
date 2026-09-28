# LegalSOS Separated Authentication Portals Verification

## Scope

The shared role tabs were removed. The LegalSOS portal now routes users, lawyers, and administrators to independent pages with isolated forms and actions.

## Automated verification

- `pnpm --dir apps/legal-sos-website test`: 15 files and 49 tests passed.
- `pnpm --dir apps/legal-sos-website typecheck`: passed with no TypeScript errors.
- `pnpm --dir apps/legal-sos-website build`: production build passed and generated all Arabic, English, and Turkish variants of `/portal`, `/portal/client`, `/portal/lawyer`, and `/portal/admin`.
- `git diff --check`: passed.

The first full-suite attempt stopped only because the cross-repository terminology test expects `/private/tmp/legalsos_app`. A temporary symlink to the real read-only Flutter source was added for verification; no Flutter source was changed.

## Browser verification

Verified locally against the production build:

- `/ar/portal`: three independent links and no authentication form or role tabs.
- `/ar/portal/client`: user sign-in and user account creation only.
- `/ar/portal/lawyer`: lawyer sign-in and lawyer account creation only.
- `/ar/portal/admin`: administration sign-in only; no registration action.
- Every dedicated page has a visible back link to account selection.
- The lawyer registration component remains unmounted until explicitly requested and a valid country is available.
- Mobile viewport 390x844 renders the gateway as one card per row.
- Browser console: 0 errors and 0 warnings.

## External boundary

Lawyer and administration credential authentication continues on Lawyers.bh. This local verification confirms the destination links and LegalSOS separation; it does not submit credentials or mutate an external account.
